import { useState, useEffect, useRef } from 'react';
import { ChevronRight, RefreshCw, Calendar, Brain, Briefcase } from 'lucide-react';

const API = 'http://192.168.10.120:4000';

const MODES = [
  { id:'advisor',         label:'Personal Advisor',    icon:Brain,     desc:'Life, career, and business decisions' },
  { id:'chief_of_staff',  label:'Chief of Staff',      icon:Briefcase, desc:'Priorities, open loops, and action items' },
];

export function Advisor({ toast }) {
  const [mode,       setMode]       = useState('chief_of_staff');
  const [messages,   setMessages]   = useState([]);
  const [input,      setInput]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [checkin,    setCheckin]    = useState(null);
  const [checkining, setCheckining] = useState(false);
  const [view,       setView]       = useState('chat'); // 'chat' | 'checkin'
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  // Auto-load first message on mount
  useEffect(() => {
    send('Give me a quick status briefing on everything — projects, tasks, open loops, and what I should focus on today.');
  }, []);

  const send = async (overrideMsg) => {
    const text = (overrideMsg || input).trim();
    if (!text || loading) return;
    if (!overrideMsg) setInput('');
    const newMessages = [...messages, { role:'user', content:text }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const r = await fetch(`${API}/api/advisor/ask`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ question:text, mode, history:messages }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setMessages(p => [...p, { role:'assistant', content:d.reply }]);
    } catch(err) {
      toast('Advisor error: ' + err.message, 'error');
      setMessages(p => [...p, { role:'assistant', content:`Error: ${err.message}` }]);
    }
    setLoading(false);
  };

  const runMonthlyCheckin = async () => {
    setCheckining(true); setView('checkin'); setCheckin(null);
    try {
      const r = await fetch(`${API}/api/advisor/monthly-checkin`, { method:'POST' });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setCheckin(d);
    } catch(err) { toast('Check-in failed: ' + err.message, 'error'); }
    setCheckining(false);
  };

  const STARTERS = {
    chief_of_staff: [
      'What are my top 3 priorities right now?',
      'What open loops am I ignoring?',
      'What decisions am I avoiding?',
      'What should I stop doing this week?',
      'Where am I most behind?',
    ],
    advisor: [
      'Should I take on this new project?',
      'What is my biggest strategic risk right now?',
      'How should I allocate my time this quarter?',
      'What am I not seeing clearly about my business?',
      'What would you do differently if you were me?',
    ],
  };

  const prioColor = { high:'var(--red)', medium:'var(--yellow)', low:'var(--green)' };
  const currentMode = MODES.find(m => m.id===mode);
  const ModeIcon = currentMode?.icon || Brain;

  return (
    <div style={{ display:'flex', height:'calc(100vh - 50px)', overflow:'hidden' }}>

      {/* ── Left sidebar ── */}
      <div style={{ width:260, flexShrink:0, borderRight:'1px solid var(--border)', background:'var(--bg2)', display:'flex', flexDirection:'column' }}>

        {/* Mode selector */}
        <div style={{ padding:'16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Mode</div>
          {MODES.map(m => {
            const Icon = m.icon;
            return (
              <button key={m.id} onClick={() => { setMode(m.id); setMessages([]); }} style={{
                width:'100%', display:'flex', alignItems:'flex-start', gap:10,
                background: mode===m.id ? 'var(--teal-bg)' : 'transparent',
                border:`1px solid ${mode===m.id ? 'var(--teal-border)' : 'transparent'}`,
                borderRadius:'var(--radius-sm)', padding:'10px 10px', cursor:'pointer',
                fontFamily:'inherit', marginBottom:4, textAlign:'left', transition:'all .15s',
              }}>
                <Icon size={14} style={{ color: mode===m.id ? 'var(--teal)' : 'var(--text3)', flexShrink:0, marginTop:1 }}/>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, color: mode===m.id ? 'var(--teal)' : 'var(--text)' }}>{m.label}</div>
                  <div style={{ fontSize:11, color:'var(--text3)', marginTop:2 }}>{m.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* View switcher */}
        <div style={{ padding:'12px 16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', gap:6 }}>
            <button onClick={() => setView('chat')} className={`btn ${view==='chat'?'btn-primary':'btn-ghost'}`} style={{flex:1,padding:'5px',fontSize:12}}>Chat</button>
            <button onClick={() => setView('checkin')} className={`btn ${view==='checkin'?'btn-primary':'btn-ghost'}`} style={{flex:1,padding:'5px',fontSize:12}}>Monthly Check-in</button>
          </div>
        </div>

        {/* Starters */}
        {view==='chat' && (
          <div style={{ padding:'12px 14px', flex:1, overflow:'auto' }}>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:8 }}>Quick questions</div>
            {(STARTERS[mode]||[]).map((s,i) => (
              <button key={i} onClick={() => send(s)} disabled={loading} style={{
                width:'100%', background:'none', border:'1px solid var(--border)',
                borderRadius:'var(--radius-sm)', padding:'7px 10px',
                color:'var(--text2)', fontSize:12, textAlign:'left',
                cursor:'pointer', fontFamily:'inherit', lineHeight:1.4,
                marginBottom:4, transition:'all .15s',
              }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--teal-border)'; e.currentTarget.style.color='var(--text)'; }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}
              >{s}</button>
            ))}
          </div>
        )}

        {view==='checkin' && (
          <div style={{ padding:'12px 14px', flex:1, overflow:'auto' }}>
            <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.6, marginBottom:14 }}>
              Monthly check-in analyzes all your projects, tasks, metrics, and ideas to give you a full executive review.
            </div>
            <button className="btn btn-primary" style={{ width:'100%' }} onClick={runMonthlyCheckin} disabled={checkining}>
              <Calendar size={13}/> {checkining ? 'Generating...' : 'Generate Monthly Check-in'}
            </button>
          </div>
        )}
      </div>

      {/* ── Main area ── */}
      {view==='chat' ? (
        <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>

          {/* Header */}
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <ModeIcon size={16} style={{ color:'var(--teal)' }}/>
            <div>
              <div style={{ fontSize:15, fontWeight:700 }}>{currentMode?.label}</div>
              <div style={{ fontSize:12, color:'var(--text3)' }}>{currentMode?.desc}</div>
            </div>
            {messages.length > 0 && (
              <button className="btn btn-ghost" style={{ marginLeft:'auto', padding:'4px 10px', fontSize:11 }}
                onClick={() => setMessages([])}>Clear</button>
            )}
          </div>

          {/* Messages */}
          <div style={{ flex:1, overflow:'auto', padding:'20px' }}>
            {messages.map((m,i) => (
              <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start', marginBottom:18 }}>
                <div style={{
                  maxWidth:'78%', padding:'12px 16px', borderRadius:12,
                  background: m.role==='user' ? 'var(--accent-bg)' : 'var(--bg2)',
                  border:`1px solid ${m.role==='user'?'rgba(108,99,255,.3)':'var(--border)'}`,
                  fontSize:14, color:'var(--text)', lineHeight:1.75, whiteSpace:'pre-wrap',
                }}>
                  {m.role==='assistant' && (
                    <div style={{ fontSize:10, color:'var(--teal)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontFamily:'var(--mono)', display:'flex', alignItems:'center', gap:5 }}>
                      <ModeIcon size={10}/> EVA {currentMode?.label}
                    </div>
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

          {/* Input */}
          <div style={{ padding:'12px 20px', borderTop:'1px solid var(--border)', display:'flex', gap:10, flexShrink:0 }}>
            <input value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); }}}
              placeholder={mode==='chief_of_staff' ? "What needs your attention?" : "Ask your advisor anything..."}
              disabled={loading}
              style={{ flex:1, fontSize:14, padding:'10px 14px' }}/>
            <button className="btn btn-primary" onClick={() => send()} disabled={!input.trim()||loading} style={{padding:'10px 18px'}}>
              <ChevronRight size={16}/>
            </button>
          </div>
        </div>

      ) : (
        /* ── Monthly Check-in ── */
        <div style={{ flex:1, overflow:'auto', padding:'28px 32px' }}>
          {checkining && (
            <div style={{ textAlign:'center', padding:'60px 0' }}>
              <RefreshCw size={32} style={{ animation:'spin 1s linear infinite', color:'var(--teal)', margin:'0 auto 16px', display:'block' }}/>
              <div style={{ fontSize:14, color:'var(--text3)' }}>Generating your monthly check-in...</div>
            </div>
          )}

          {!checkin && !checkining && (
            <div style={{ textAlign:'center', padding:'60px 0', color:'var(--text3)' }}>
              <Calendar size={40} style={{ opacity:.2, margin:'0 auto 16px', display:'block' }}/>
              <div style={{ fontSize:16, marginBottom:8 }}>Monthly Check-in</div>
              <div style={{ fontSize:13, marginBottom:20 }}>A full executive review of your month — wins, concerns, decisions, and priorities</div>
              <button className="btn btn-primary" onClick={runMonthlyCheckin}>
                <Calendar size={13}/> Generate Check-in
              </button>
            </div>
          )}

          {checkin && (
            <div style={{ animation:'fadeUp .4s ease forwards', maxWidth:860, margin:'0 auto' }}>
              <div style={{ marginBottom:24 }}>
                <div style={{ fontSize:12, color:'var(--teal)', letterSpacing:3, textTransform:'uppercase', marginBottom:8, fontFamily:'var(--mono)' }}>
                  Monthly Check-in · {checkin.month}
                </div>
                <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text)', margin:'0 0 20px' }}>{checkin.headline}</h1>
              </div>

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                {/* Wins */}
                <div className="card" style={{ borderLeft:'3px solid var(--green)' }}>
                  <div style={{ fontSize:11, color:'var(--green)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>✓ Wins This Month</div>
                  {(checkin.wins||[]).map((w,i) => (
                    <div key={i} style={{ display:'flex', gap:8, marginBottom:6, fontSize:13, color:'var(--text2)' }}>
                      <span style={{ color:'var(--green)', flexShrink:0 }}>✓</span>{w}
                    </div>
                  ))}
                </div>

                {/* Concerns */}
                <div className="card" style={{ borderLeft:'3px solid var(--red)' }}>
                  <div style={{ fontSize:11, color:'var(--red)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>⚠ Concerns</div>
                  {(checkin.concerns||[]).map((c,i) => (
                    <div key={i} style={{ display:'flex', gap:8, marginBottom:6, fontSize:13, color:'var(--text2)' }}>
                      <span style={{ color:'var(--red)', flexShrink:0 }}>!</span>{c}
                    </div>
                  ))}
                </div>
              </div>

              {/* Metrics review */}
              {checkin.metrics_review && (
                <div className="card-teal" style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11, color:'var(--teal)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontFamily:'var(--mono)' }}>◈ Metrics Review</div>
                  <div style={{ fontSize:14, color:'var(--text2)', lineHeight:1.7 }}>{checkin.metrics_review}</div>
                </div>
              )}

              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:20 }}>
                {/* Decisions needed */}
                <div className="card">
                  <div style={{ fontSize:11, color:'var(--yellow)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Decisions Needed</div>
                  {(checkin.decisions_needed||[]).map((d,i) => (
                    <div key={i} style={{ display:'flex', gap:8, marginBottom:6, fontSize:13, color:'var(--text2)' }}>
                      <span style={{ color:'var(--yellow)', flexShrink:0 }}>→</span>{d}
                    </div>
                  ))}
                </div>

                {/* Next month */}
                <div className="card">
                  <div style={{ fontSize:11, color:'var(--accent2)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>Next Month Priorities</div>
                  {(checkin.next_month_priorities||[]).map((p,i) => (
                    <div key={i} style={{ display:'flex', gap:8, marginBottom:6, fontSize:13, color:'var(--text2)' }}>
                      <span style={{ color:'var(--accent2)', fontFamily:'var(--mono)', flexShrink:0 }}>{i+1}.</span>{p}
                    </div>
                  ))}
                </div>
              </div>

              {/* Advisor note */}
              {checkin.advisor_note && (
                <div className="card" style={{ borderLeft:'3px solid var(--accent)', background:'var(--accent-bg)' }}>
                  <div style={{ fontSize:11, color:'var(--accent2)', textTransform:'uppercase', letterSpacing:1, marginBottom:8, display:'flex', alignItems:'center', gap:6 }}>
                    <Brain size={11}/> EVA Advisor Note
                  </div>
                  <div style={{ fontSize:14, color:'var(--text)', lineHeight:1.8, fontStyle:'italic' }}>"{checkin.advisor_note}"</div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
