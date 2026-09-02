import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const AdminChats = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }

    const fetchConversations = async () => {
      const res = await fetch('/api/chat/admin', {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      const data = await res.json();
      setConversations(Array.isArray(data) ? data : []);
    };
    fetchConversations();
  }, [user, navigate]);

  return (
    <div style={containerStyle}>
      <h2 style={{ color: '#f97316', marginBottom: '20px' }}>Chatbot Conversations</h2>
      {conversations.length === 0 && (
        <p style={{ color: '#a1a1aa' }}>No conversations yet.</p>
      )}
      {conversations.map(conv => (
        <div key={conv._id} style={convCardStyle}>
          <div
            style={convHeaderStyle}
            onClick={() => setExpandedId(expandedId === conv._id ? null : conv._id)}
          >
            <div>
              <span style={{ fontWeight: 600 }}>{conv.userId?.name || 'Guest'}</span>
              {conv.userId?.email && <span style={{ color: '#a1a1aa', marginLeft: '10px', fontSize: '0.85rem' }}>{conv.userId.email}</span>}
            </div>
            <div style={{ color: '#a1a1aa', fontSize: '0.85rem' }}>
              {conv.messages.length} messages · {new Date(conv.updatedAt).toLocaleString()}
              <span style={{ marginLeft: '10px', color: '#f97316' }}>{expandedId === conv._id ? '▲' : '▼'}</span>
            </div>
          </div>

          {expandedId === conv._id && (
            <div style={{ padding: '15px', borderTop: '1px solid rgba(255,255,255,0.1)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {conv.messages.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={m.role === 'user' ? userMsgStyle : botMsgStyle}>
                    <div style={{ fontSize: '0.7rem', color: m.role === 'user' ? 'rgba(255,255,255,0.7)' : '#a1a1aa', marginBottom: '3px' }}>
                      {m.role === 'user' ? 'Customer' : 'Bot'}
                    </div>
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const containerStyle = { maxWidth: '900px', margin: '40px auto', padding: '30px', background: '#18181b', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)', color: '#fafafa' };
const convCardStyle = { border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', marginBottom: '12px', background: '#09090b' };
const convHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', cursor: 'pointer', flexWrap: 'wrap', gap: '8px' };
const botMsgStyle = { maxWidth: '75%', padding: '8px 12px', borderRadius: '10px', background: '#27272a', fontSize: '0.9rem', whiteSpace: 'pre-wrap' };
const userMsgStyle = { maxWidth: '75%', padding: '8px 12px', borderRadius: '10px', background: '#f97316', color: '#fff', fontSize: '0.9rem', whiteSpace: 'pre-wrap' };

export default AdminChats;
