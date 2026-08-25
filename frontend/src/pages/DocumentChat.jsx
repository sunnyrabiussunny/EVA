import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api.js';
import { Send, FileText, X, CheckSquare, Square } from 'lucide-react';

const API = 'http://192.168.10.120:4000';

export function DocumentChat({ toast }) {
  const [messages,     setMessages]     = useState([]);
  const [input,        setInput]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [kbFiles,      setKbFiles]      = useState([]);
  const [selectedIds,  setSelectedIds]  = useState([]);
  const [showSources,  setShowSources]  = useState(true);
  const bottomRef = useRef(null);

  useEffect(() => {
    fetch(`${API}/api/knowledge-files`).then(r => r.json()).then(files => {
      setKbFiles(files);
      setSelectedIds(files.map(f => f.id)); // select all by default
    }).catch(() => {});
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const toggleFile = (id) => setSelectedIds(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const selectAll  = ()    => setSelectedIds(kbFiles.map(f => f.id));
  const clearAll   = ()    => setSelectedIds([]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const msg = input.trim();
    setInput('');
    const newMessages = [...messages, { role:'user', content:msg }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/chat/ask`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify({
          message: msg,
          history: messages,
          selectedKBFileIds: selectedIds,
        }),
      });
      const data = await r.json();
      if (data.error) throw new Error(data.error);
      setMessages(p => [...p, { role:'assistant', content: data.reply }]);
    } catch(err) {
      toast('Chat error: ' + err.message, 'error');
      setMessages(p => [...p, { role:'assistant', content:`Error: ${err.message}` }]);
    }
    setLoading(false);
  };

  const clearChat = () => setMessages([]);

  const STARTERS = [
    'What are the key financial metrics in our documents?',
    'Summarize the main risks mentioned across all files',
    'What strategic goals are outlined in the business plan?',
    'What does the due diligence report say about the market?',
    'Compare revenue figures across the documents',
  ];

  return (
    <div style={{ display:'flex', height:'calc(100vh - 50px)', overflow:'hidden' }}>

      {/* ── Source selector sidebar ── */}
      {showSources && (
        <div style={{ width:260, flexShrink:0, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', background:'var(--bg2)' }}>
          <div style={{ padding:'16px', borderBottom:'1px solid var(--border)' }}>
            <div style={{ fontSize:14, fontWeight:600, marginBottom:4 }}>Sources</div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>{selectedIds.length}/{kbFiles.length} selected</div>
            <div style={{ display:'flex', gap:6, marginTop:8 }}>
              <button onClick={selectAll} className="btn btn-teal" style={{flex:1,padding:'4px',fontSize:11}}>All</button>
              <button onClick={clearAll}  className="btn btn-ghost" style={{flex:1,padding:'4px',fontSize:11}}>None</button>
            </div>
          </div>

          <div style={{ flex:1, overflow:'auto', padding:'8px' }}>
            {kbFiles.length === 0 ? (
              <div style={{ textAlign:'center', color:'var(--text3)', fontSize:12, padding:'24px 8px', lineHeight:1.6 }}>
                No files in knowledge base.<br/>Upload files in the Knowledge page.
              </div>
            ) : (
              kbFiles.map(f => {
                const selected = selectedIds.includes(f.id);
                return (
                  <button key={f.id} onClick={() => toggleFile(f.id)} style={{
                    width:'100%', display:'flex', alignItems:'center', gap:8,
                    background: selected ? 'var(--teal-bg)' : 'transparent',
                    border:`1px solid ${selected ? 'var(--teal-border)' : 'transparent'}`,
                    borderRadius:'var(--radius-sm)', padding:'7px 8px',
                    cursor:'pointer', fontFamily:'inherit', marginBottom:3,
                    transition:'all .15s',
                  }}>
                    {selected
                      ? <CheckSquare size={13} style={{color:'var(--teal)',flexShrink:0}}/>
                      : <Square      size={13} style={{color:'var(--text3)',flexShrink:0}}/>
                    }
                    <FileText size={11} style={{color:'var(--teal)',flexShrink:0}}/>
                    <div style={{ minWidth:0, textAlign:'left' }}>
                      <div style={{ fontSize:11, color:selected?'var(--teal)':'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:selected?600:400 }}>
                        {f.original_name}
                      </div>
                      <div style={{ fontSize:10, color:'var(--text3)' }}>{(f.size/1024).toFixed(0)}KB</div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ── Chat area ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'12px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={() => setShowSources(s => !s)} className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}}>
              {showSources ? '← Hide Sources' : '→ Show Sources'}
            </button>
            <div style={{ fontSize:14, fontWeight:600 }}>Chat with Documents</div>
            {selectedIds.length > 0 && (
              <span style={{ fontSize:11, color:'var(--teal)', background:'var(--teal-bg)', border:'1px solid var(--teal-border)', borderRadius:20, padding:'2px 8px' }}>
                {selectedIds.length} file{selectedIds.length!==1?'s':''} active
              </span>
            )}
          </div>
          {messages.length > 0 && (
            <button onClick={clearChat} className="btn btn-ghost" style={{padding:'5px 10px',fontSize:12}}>
              Clear chat
            </button>
          )}
        </div>

        {/* Messages */}
        <div style={{ flex:1, overflow:'auto', padding:'20px' }}>
          {messages.length === 0 && (
            <div style={{ maxWidth:600, margin:'40px auto 0' }}>
              <div style={{ textAlign:'center', marginBottom:28 }}>
                <div style={{ fontSize:32, marginBottom:8, opacity:.3 }}>📚</div>
                <div style={{ fontSize:16, fontWeight:600, color:'var(--text)', marginBottom:6 }}>Ask anything about your documents</div>
                <div style={{ fontSize:13, color:'var(--text3)' }}>
                  {kbFiles.length > 0
                    ? `${selectedIds.length} document${selectedIds.length!==1?'s':''} loaded — ask a question to get started`
                    : 'Upload files in Knowledge Base first'}
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {STARTERS.map((s,i) => (
                  <button key={i} onClick={() => { setInput(s); }} style={{
                    background:'var(--bg2)', border:'1px solid var(--border)',
                    borderRadius:'var(--radius)', padding:'10px 16px',
                    textAlign:'left', cursor:'pointer', color:'var(--text2)',
                    fontSize:13, fontFamily:'inherit', lineHeight:1.5,
                    transition:'all .15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor='var(--teal-border)'; e.currentTarget.style.color='var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={{
              display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start',
              marginBottom:18,
            }}>
              <div style={{
                maxWidth:'78%', padding:'12px 16px', borderRadius:12,
                background: m.role==='user' ? 'var(--accent-bg)' : 'var(--bg2)',
                border:`1px solid ${m.role==='user' ? 'rgba(108,99,255,.3)' : 'var(--border)'}`,
                fontSize:14, color:'var(--text)', lineHeight:1.7,
                whiteSpace:'pre-wrap', wordBreak:'break-word',
              }}>
                {m.role === 'assistant' && (
                  <div style={{ fontSize:10, color:'var(--teal)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontFamily:'var(--mono)' }}>
                    EVA · {selectedIds.length} source{selectedIds.length!==1?'s':''}
                  </div>
                )}
                {m.content}
              </div>
            </div>
          ))}

          {loading && (
            <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:16 }}>
              <div style={{ padding:'12px 18px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12 }}>
                <div className="dots"><span/><span/><span/></div>
              </div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>

        {/* Input */}
        <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10, flexShrink:0 }}>
          <input
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
            placeholder={kbFiles.length > 0 ? "Ask a question about your documents..." : "Upload files to Knowledge Base first..."}
            disabled={loading || kbFiles.length === 0}
            style={{ flex:1, fontSize:14, padding:'10px 14px' }}
          />
          <button className="btn btn-primary" onClick={send} disabled={!input.trim()||loading||kbFiles.length===0} style={{padding:'10px 18px'}}>
            <Send size={15}/>
          </button>
        </div>
      </div>
    </div>
  );
}
