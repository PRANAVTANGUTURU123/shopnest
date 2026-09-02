const Product = require('../models/Product');
const Order = require('../models/Order');
const ChatConversation = require('../models/ChatConversation');

// Any OpenAI-compatible chat completions endpoint works (Gemini, Grok, Groq, OpenRouter...)
const CHAT_API_URL = process.env.CHAT_API_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const CHAT_API_KEY = process.env.GEMINI_API_KEY || process.env.GROK_API_KEY;
const CHAT_MODEL = process.env.CHAT_MODEL || 'gemini-3.6-flash';

const SYSTEM_PROMPT = `You are the ShopNest shopping assistant, a friendly and concise chatbot on the ShopNest e-commerce website (prices are in Indian Rupees ₹).

You can help customers with:
- Finding products (use the search_products tool — never invent products; only recommend what the tool returns)
- Checking their order status (use the get_my_orders tool — the customer must be logged in)
- Store policies, summarized below

Store policies:
- Returns: items can be returned within 30 days of delivery if unused, in original condition and packaging, with proof of purchase. Perishable items, custom software, digital media, and tampered items are not returnable. Customer pays return shipping; restocking fees may apply.
- Refunds: after the return is received and inspected, approved refunds go back to the original Razorpay payment method within 5-7 business days.
- Payments: secure online payments are handled via Razorpay.

Rules:
- Keep replies short (2-4 sentences) and friendly. Use plain text, no markdown tables.
- When you list products, mention name, price and stock, and tell the user they can find them on the Shop page.
- If asked about orders and the user is not logged in, politely ask them to log in first.
- If a question is unrelated to ShopNest or shopping, politely steer the conversation back.`;

const tools = [
  {
    type: 'function',
    function: {
      name: 'search_products',
      description: 'Search the ShopNest product catalog. Returns up to 5 matching products with name, price, category, stock and rating.',
      parameters: {
        type: 'object',
        properties: {
          keyword: { type: 'string', description: 'Words to match against product name or description' },
          category: { type: 'string', description: 'Product category to filter by, if the user mentioned one' },
          maxPrice: { type: 'number', description: 'Maximum price in rupees, if the user gave a budget' },
          minPrice: { type: 'number', description: 'Minimum price in rupees' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_my_orders',
      description: "Get the logged-in customer's 5 most recent orders with status, total and date. Only works if the customer is logged in.",
      parameters: { type: 'object', properties: {} }
    }
  }
];

const searchProducts = async ({ keyword, category, maxPrice, minPrice }) => {
  const query = {};
  if (keyword) {
    query.$or = [
      { name: { $regex: keyword, $options: 'i' } },
      { description: { $regex: keyword, $options: 'i' } }
    ];
  }
  if (category) query.category = { $regex: category, $options: 'i' };
  if (maxPrice || minPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = minPrice;
    if (maxPrice) query.price.$lte = maxPrice;
  }

  const products = await Product.find(query)
    .select('name price category stock ratings')
    .sort({ ratings: -1 })
    .limit(5);

  if (products.length === 0) return JSON.stringify({ results: [], note: 'No matching products found' });
  return JSON.stringify({ results: products });
};

const getMyOrders = async (user) => {
  if (!user) return JSON.stringify({ error: 'Customer is not logged in. Ask them to log in to check orders.' });

  const orders = await Order.find({ userId: user._id })
    .select('status totalAmount createdAt items')
    .sort({ createdAt: -1 })
    .limit(5);

  if (orders.length === 0) return JSON.stringify({ results: [], note: 'This customer has no orders yet' });
  return JSON.stringify({
    results: orders.map(o => ({
      orderId: o._id,
      status: o.status,
      total: o.totalAmount,
      itemCount: o.items.length,
      placedOn: o.createdAt
    }))
  });
};

const callLLM = async (messages) => {
  const response = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CHAT_API_KEY}`
    },
    body: JSON.stringify({
      model: CHAT_MODEL,
      messages,
      tools,
      temperature: 0.5
    })
  });

  const data = await response.json();
  if (!response.ok) {
    const errBody = Array.isArray(data) ? data[0] : data;
    throw new Error(errBody?.error?.message || errBody?.error || `Chat API error (status ${response.status})`);
  }
  return data.choices[0].message;
};

// POST /api/chat  (works for guests too; req.user is set only when logged in)
const sendMessage = async (req, res) => {
  try {
    const { message, conversationId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ message: 'Message is required' });
    }
    if (!CHAT_API_KEY) {
      return res.status(500).json({ message: 'Chatbot is not configured (missing GEMINI_API_KEY)' });
    }

    let conversation = null;
    if (conversationId) {
      conversation = await ChatConversation.findById(conversationId);
    }
    if (!conversation) {
      conversation = new ChatConversation({ userId: req.user ? req.user._id : null, messages: [] });
    }

    const apiMessages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversation.messages.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    // Tool loop: let the model call tools until it produces a plain answer
    let assistantMessage = await callLLM(apiMessages);
    let iterations = 0;
    while (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0 && iterations < 4) {
      apiMessages.push(assistantMessage);

      for (const toolCall of assistantMessage.tool_calls) {
        let args = {};
        try { args = JSON.parse(toolCall.function.arguments || '{}'); } catch (e) { /* leave empty */ }

        let result;
        if (toolCall.function.name === 'search_products') {
          result = await searchProducts(args);
        } else if (toolCall.function.name === 'get_my_orders') {
          result = await getMyOrders(req.user);
        } else {
          result = JSON.stringify({ error: 'Unknown tool' });
        }

        apiMessages.push({ role: 'tool', tool_call_id: toolCall.id, content: result });
      }

      assistantMessage = await callLLM(apiMessages);
      iterations++;
    }

    const reply = assistantMessage.content || 'Sorry, I could not come up with a reply. Please try again.';

    conversation.messages.push({ role: 'user', content: message });
    conversation.messages.push({ role: 'assistant', content: reply });
    if (!conversation.userId && req.user) conversation.userId = req.user._id;
    await conversation.save();

    res.json({ reply, conversationId: conversation._id });
  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({ message: 'Chatbot failed to respond', error: error.message });
  }
};

// GET /api/chat/admin  (admin only)
const getAllConversations = async (req, res) => {
  try {
    const conversations = await ChatConversation.find()
      .populate('userId', 'name email')
      .sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch conversations' });
  }
};

module.exports = { sendMessage, getAllConversations };
