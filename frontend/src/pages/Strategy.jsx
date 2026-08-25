import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api.js';
import { Plus, X, Zap, ChevronRight, Trash2, DollarSign, Clock } from 'lucide-react';

export function Strategy({ toast }) {
  const [sessions,  setSessions]  = useState([]);
  const [active,    setActive]    = useState(null);   // current session
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [extracting,setExtracting]= useState(false);
  const [insights,  setInsights]  = useState([]);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState({ title:'', context:'' });
  const bottomRef = useRef(null);

  const loadSessions = () => api.get('/strategy').then(setSessions);
  useEffect(() => { loadSessions(); }, []);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const createSession = async () => {
    if (!form.title) return;
    try {
      const s = await api.post('/strategy', form);
      setSessions(p => [s, ...p]);
      openSession(s);
      setModal(false);
      setForm({ title:'', context:'' });
    } catch (err) { toast('Failed: ' + err.message, 'error'); }
  };

  const openSession = (s) => {
    setActive(s);
    setMessages(s.messages || []);
    setInsights(s.insights || []);
  };

  const send = async () => {
    if (!input.trim() || !active || loading) return;
    const msg = input.trim();
    setInput('');
    setMessages(p => [...p, { role:'user', content:msg }]);
    setLoading(true);
    try {
      const r = await api.post(`/strategy/${active.id}/message`, { message: msg });
      setMessages(r.messages);
    } catch (err) { toast('AI error: ' + err.message, 'error'); }
    setLoading(false);
  };

  const extractInsights = async () => {
    if (!active) return;
    setExtracting(true);
    try {
      const r = await api.post(`/strategy/${active.id}/extract-insights`, {});
      setInsights(r.insights || []);
      toast(`Extracted ${(r.insights||[]).length} insights! Total ROI: $${(r.roi_total||0).toLocaleString()}`);
    } catch (err) { toast('Extraction failed: ' + err.message, 'error'); }
    setExtracting(false);
  };

  const delSession = async (id, e) => {
    e.stopPropagation();
    await api.del(`/strategy/${id}`);
    setSessions(p => p.filter(s => s.id !== id));
    if (active?.id === id) { setActive(null); setMessages([]); setInsights([]); }
    toast('Session deleted', 'error');
  };

  const prioColor = { high:'var(--red)', medium:'var(--yellow)', low:'var(--green)' };

  return (
    <div style={{ display:'flex', height:'calc(100vh - 50px)', overflow:'hidden' }}>

      {/* ── Session list ── */}
      <div style={{ width:280, flexShrink:0, borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', background:'var(--bg2)' }}>
        <div style={{ padding:'20px 16px 12px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontSize:16, fontWeight:700, marginBottom:12 }}>Strategy Sessions</div>
          <button className="btn btn-primary" style={{ width:'100%' }} onClick={() => setModal(true)}>
            <Plus size={13}/> New Session
          </button>
        </div>
        <div style={{ flex:1, overflow:'auto', padding:'8px' }}>
          {sessions.length === 0 && (
            <div style={{ textAlign:'center', color:'var(--text3)', fontSize:13, padding:'24px 0' }}>
              No sessions yet.<br/>Create one to start.
            </div>
          )}
          {sessions.map(s => (
            <button key={s.id} onClick={() => openSession(s)} style={{
              width:'100%', background: active?.id===s.id ? 'var(--teal-bg)' : 'transparent',
              border:`1px solid ${active?.id===s.id ? 'var(--teal-border)' : 'transparent'}`,
              borderRadius:'var(--radius-sm)', padding:'10px 12px', cursor:'pointer',
              textAlign:'left', marginBottom:4, transition:'all .15s', fontFamily:'inherit',
            }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div style={{ fontSize:13, fontWeight:600, color: active?.id===s.id ? 'var(--teal)' : 'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{s.title}</div>
                <button className="btn-icon" onClick={e => delSession(s.id, e)} style={{flexShrink:0,padding:2}}><Trash2 size={11}/></button>
              </div>
              <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>
                {(s.messages||[]).length} messages · {new Date(s.created_at||Date.now()).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Chat area ── */}
      {!active ? (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16, color:'var(--text3)' }}>
          <Zap size={40} style={{ opacity:.2 }}/>
          <div style={{ fontSize:16 }}>Select or create a strategy session</div>
          <div style={{ fontSize:13 }}>EVA will run structured consulting to surface bottlenecks and quantify ROI</div>
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={13}/> New Session</button>
        </div>
      ) : (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Header */}
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
            <div>
              <div style={{ fontSize:16, fontWeight:700 }}>{active.title}</div>
              {active.context && <div style={{ fontSize:12, color:'var(--text3)', marginTop:2 }}>{active.context}</div>}
            </div>
            <button className="btn btn-teal" onClick={extractInsights} disabled={extracting || messages.length < 2}>
              <Zap size={13}/> {extracting ? 'Extracting...' : 'Extract Insights'}
            </button>
          </div>

          <div style={{ flex:1, display:'flex', overflow:'hidden' }}>

            {/* Messages */}
            <div style={{ flex:1, overflow:'auto', padding:'20px' }}>
              {messages.length === 0 && (
                <div style={{ textAlign:'center', color:'var(--text3)', marginTop:60 }}>
                  <div style={{ fontSize:15, marginBottom:8 }}>Start by describing your business situation</div>
                  <div style={{ fontSize:13 }}>e.g. "We have a slow procurement process that takes 3 weeks per purchase order"</div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} style={{
                  display:'flex', justifyContent: m.role==='user' ? 'flex-end' : 'flex-start',
                  marginBottom:16,
                }}>
                  <div style={{
                    maxWidth:'75%', padding:'12px 16px', borderRadius:12,
                    background: m.role==='user' ? 'var(--accent-bg)' : 'var(--bg2)',
                    border: `1px solid ${m.role==='user' ? 'rgba(108,99,255,0.3)' : 'var(--border)'}`,
                    fontSize:14, color:'var(--text)', lineHeight:1.65,
                    whiteSpace:'pre-wrap',
                  }}>
                    {m.role === 'assistant' && (
                      <div style={{ fontSize:10, color:'var(--teal)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontFamily:'var(--mono)' }}>EVA Strategy</div>
                    )}
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display:'flex', justifyContent:'flex-start', marginBottom:16 }}>
                  <div style={{ padding:'12px 16px', background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:12 }}>
                    <div className="dots"><span/><span/><span/></div>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Insights panel */}
            {insights.length > 0 && (
              <div style={{ width:300, flexShrink:0, borderLeft:'1px solid var(--border)', overflow:'auto', padding:'16px' }}>
                <div style={{ fontSize:12, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:12 }}>
                  Extracted Insights
                </div>
                {insights.map((ins, i) => (
                  <div key={i} className="card" style={{ marginBottom:10, padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:6 }}>
                      <div style={{ fontSize:13, fontWeight:600, color:'var(--text)', lineHeight:1.3 }}>{ins.title}</div>
                      <span style={{ fontSize:10, color: prioColor[ins.priority]||'var(--text3)', background:'var(--bg3)', padding:'1px 6px', borderRadius:10, whiteSpace:'nowrap', flexShrink:0 }}>{ins.priority}</span>
                    </div>
                    <div style={{ fontSize:12, color:'var(--text2)', marginBottom:8, lineHeight:1.5 }}>{ins.description}</div>
                    <div style={{ display:'flex', gap:8 }}>
                      {ins.roi_estimate > 0 && (
                        <span style={{ fontSize:11, color:'var(--green)', display:'flex', alignItems:'center', gap:3 }}>
                          <DollarSign size={10}/> ${ins.roi_estimate.toLocaleString()}
                        </span>
                      )}
                      {ins.hours_saved > 0 && (
                        <span style={{ fontSize:11, color:'var(--teal)', display:'flex', alignItems:'center', gap:3 }}>
                          <Clock size={10}/> {ins.hours_saved}h/yr
                        </span>
                      )}
                    </div>
                    {ins.department && <div style={{ fontSize:11, color:'var(--text3)', marginTop:4 }}>{ins.department}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10, flexShrink:0 }}>
            <input
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); }}}
              placeholder="Describe a business problem, bottleneck, or ask a question..."
              disabled={loading}
              style={{ flex:1, fontSize:14, padding:'10px 14px' }}
            />
            <button className="btn btn-primary" onClick={send} disabled={!input.trim()||loading} style={{ padding:'10px 18px' }}>
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>
      )}

      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal" style={{maxWidth:480}}>
            <div className="modal-header">
              <div className="modal-title">New Strategy Session</div>
              <button className="btn-icon" onClick={() => setModal(false)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <div className="form-row"><label className="form-label">Session Title *</label>
                <input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} placeholder="e.g. Procurement Process Optimization" autoFocus/>
              </div>
              <div className="form-row"><label className="form-label">Business Context (optional)</label>
                <textarea rows={3} value={form.context} onChange={e => setForm(f=>({...f,context:e.target.value}))} placeholder="Brief company/department context to help EVA give better advice..."/>
              </div>
              <div className="flex" style={{gap:10,justifyContent:'flex-end'}}>
                <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={createSession}>Create Session</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
