import { useState, useRef, useEffect } from 'react';
import api from '../services/api';

export default function ChatWidget() {
  const [open,     setOpen]     = useState(false);
  const [messages, setMessages] = useState([
    { role: 'model', text: "Hi! I'm here to help with questions about electronics and PCB components — resistors, capacitors, soldering, reading circuit diagrams, tools, anything like that. What would you like to know?" },
  ]);
  const [input,   setInput]   = useState('');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const newMessages = [...messages, { role: 'user', text }];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError('');

    try {
      const res = await api.post('/chatbot/ask', {
        message: text,
        history: messages.map(m => ({ role: m.role, text: m.text })),
      });
      setMessages(prev => [...prev, { role: 'model', text: res.data.reply }]);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Could not reach the chatbot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <>
      {/* Floating button */}
      {!open && (
        <div onClick={() => setOpen(true)}
          style={{ position:'fixed', bottom:24, right:24, width:56, height:56,
            borderRadius:'50%', background:'#1e3a5f',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:24, cursor:'pointer', zIndex:900,
            boxShadow:'0 4px 14px rgba(15,23,42,0.25)' }}>
          🤖
        </div>
      )}

      {/* Chat panel */}
      {open && (
        <div style={{ position:'fixed', bottom:24, right:24, width:340,
          height:460, background:'#fff', borderRadius:16, overflow:'hidden',
          display:'flex', flexDirection:'column', zIndex:900,
          boxShadow:'0 8px 30px rgba(15,23,42,0.25)',
          border:'0.5px solid var(--border)' }}>

          {/* Header */}
          <div style={{ background:'#1e3a5f', padding:'12px 16px',
            display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
            <span style={{ fontSize:18 }}>🤖</span>
            <div style={{ flex:1 }}>
              <div style={{ fontSize:12.5, fontWeight:600, color:'#fff' }}>
                Electronics Assistant
              </div>
              <div style={{ fontSize:9.5, color:'#7dd3fc' }}>
                Ask me about components & PCBs
              </div>
            </div>
            <div onClick={() => setOpen(false)}
              style={{ color:'#b8cfe6', cursor:'pointer', fontSize:16,
                padding:4 }}>
              ✕
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} style={{ flex:1, overflowY:'auto',
            padding:'14px 12px', display:'flex', flexDirection:'column', gap:10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display:'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ maxWidth:'82%', padding:'8px 12px',
                  borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: m.role === 'user' ? '#1e3a5f' : '#f1f5f9',
                  color: m.role === 'user' ? '#fff' : 'var(--text-primary)',
                  fontSize:12, lineHeight:1.55, whiteSpace:'pre-line' }}>
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display:'flex', justifyContent:'flex-start' }}>
                <div style={{ padding:'8px 12px', borderRadius:'12px 12px 12px 2px',
                  background:'#f1f5f9', fontSize:12, color:'var(--text-muted)' }}>
                  ⟳ Thinking...
                </div>
              </div>
            )}
            {error && (
              <div style={{ padding:'8px 10px', borderRadius:8,
                background:'#fef2f2', color:'#b91c1c', fontSize:11 }}>
                ⚠ {error}
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding:'10px 12px', borderTop:'0.5px solid var(--border)',
            display:'flex', gap:8, flexShrink:0 }}>
            <textarea value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Ask about a component..."
              rows={1}
              style={{ flex:1, padding:'8px 10px', borderRadius:10,
                border:'0.5px solid var(--border)', fontSize:12,
                fontFamily:'inherit', resize:'none', maxHeight:60 }}/>
            <button onClick={send} disabled={loading || !input.trim()}
              style={{ padding:'0 14px', borderRadius:10, border:'none',
                background: !input.trim() ? '#f1f5f9' : '#1e3a5f',
                color: !input.trim() ? '#94a3b8' : '#7dd3fc',
                fontSize:13, cursor: !input.trim() ? 'not-allowed':'pointer',
                flexShrink:0 }}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  );
}
