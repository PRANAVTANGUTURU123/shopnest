import React, { useState, useContext, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';

const ChatWidget = () => {
  const { user } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hi! 👋 I\'m the ShopNest assistant. Ask me about products, your orders, or our return policy.' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (user?.token) headers.Authorization = `Bearer ${user.token}`;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, conversationId })
      });
      const data = await res.json();

      if (res.ok) {
        setConversationId(data.conversationId);
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again in a moment.' }]);
      }
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t reach the server. Please try again.' }]);
    }
    setLoading(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <>
      {open && (
        <div style={panelStyle}>
          <div style={headerStyle}>
            <span style={{ fontWeight: 600 }}>🛍️ ShopNest Assistant</span>
            <button onClick={() => setOpen(false)} style={closeBtnStyle}>✕</button>
          </div>

          <div style={messagesStyle}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={m.role === 'user' ? userBubbleStyle : botBubbleStyle}>{m.content}</div>
              </div>
            ))}
            {loading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ ...botBubbleStyle, color: '#a1a1aa' }}>Typing...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={inputRowStyle}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me anything..."
              style={inputStyle}
            />
            <button onClick={sendMessage} disabled={loading} style={sendBtnStyle}>➤</button>
          </div>
        </div>
      )}

      {!open && (
        <button onClick={() => setOpen(true)} style={fabStyle} title="Chat with us">💬</button>
      )}
    </>
  );
};

const fabStyle = {
  position: 'fixed', bottom: '25px', right: '25px', width: '58px', height: '58px',
  borderRadius: '50%', background: '#f97316', color: '#fff', border: 'none',
  fontSize: '1.5rem', cursor: 'pointer', boxShadow: '0 4px 20px rgba(249, 115, 22, 0.4)', zIndex: 1000
};
const panelStyle = {
  position: 'fixed', bottom: '25px', right: '25px', width: '340px', height: '480px',
  background: '#18181b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
  display: 'flex', flexDirection: 'column', overflow: 'hidden',
  boxShadow: '0 8px 40px rgba(0,0,0,0.6)', zIndex: 1000
};
const headerStyle = {
  padding: '14px 16px', background: '#f97316', color: '#fff',
  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
};
const closeBtnStyle = { background: 'none', border: 'none', color: '#fff', fontSize: '1rem', cursor: 'pointer' };
const messagesStyle = { flex: 1, padding: '14px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '10px' };
const botBubbleStyle = {
  maxWidth: '85%', padding: '10px 14px', borderRadius: '14px 14px 14px 4px',
  background: '#27272a', color: '#fafafa', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap'
};
const userBubbleStyle = {
  maxWidth: '85%', padding: '10px 14px', borderRadius: '14px 14px 4px 14px',
  background: '#f97316', color: '#fff', fontSize: '0.9rem', lineHeight: 1.5, whiteSpace: 'pre-wrap'
};
const inputRowStyle = { display: 'flex', gap: '8px', padding: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' };
const inputStyle = {
  flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid #27272a',
  background: '#09090b', color: '#fff', outline: 'none', fontSize: '0.9rem'
};
const sendBtnStyle = {
  width: '40px', height: '40px', borderRadius: '50%', border: 'none',
  background: '#f97316', color: '#fff', cursor: 'pointer', fontSize: '1rem'
};

export default ChatWidget;
