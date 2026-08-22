import { useState, useEffect, useRef, useCallback } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  Mic, MicOff, Send, Upload, FileText, X,
  Settings2, ChevronDown, ChevronUp, Database,
  Trash2, RefreshCw, CheckSquare, Square, Eye, EyeOff
} from 'lucide-react';

const API = 'http://192.168.10.120:4000';

// ─── SAMPLE CHART DATA (visual only — real numbers come from docs) ─────────
const SD = {
  revenue: [
    {m:'Jan',cur:4.2,prv:3.1},{m:'Feb',cur:4.8,prv:3.4},{m:'Mar',cur:5.1,prv:3.9},
    {m:'Apr',cur:4.7,prv:4.2},{m:'May',cur:6.3,prv:4.5},{m:'Jun',cur:7.1,prv:4.8},
    {m:'Jul',cur:6.8,prv:5.1},{m:'Aug',cur:7.9,prv:5.6},{m:'Sep',cur:8.4,prv:5.9},
    {m:'Oct',cur:9.2,prv:6.3},{m:'Nov',cur:10.1,prv:6.8},{m:'Dec',cur:11.4,prv:7.2},
  ],
  depts:[
    {n:'Sales',b:2.4,a:2.1},{n:'Mktg',b:1.8,a:2.0},{n:'R&D',b:3.2,a:3.0},
    {n:'Ops',b:1.5,a:1.4},{n:'HR',b:0.9,a:0.8},
  ],
  pipeline:[
    {name:'Prospecting',v:42,fill:'#00f5d4'},{name:'Qualified',v:28,fill:'#6c63ff'},
    {name:'Proposal',v:18,fill:'#f59e0b'},{name:'Negotiation',v:8,fill:'#f15bb5'},
    {name:'Closed Won',v:14,fill:'#22c55e'},
  ],
  radar:[
    {m:'Revenue',v:88},{m:'Growth',v:74},{m:'Retention',v:91},
    {m:'NPS',v:67},{m:'Efficiency',v:82},{m:'Pipeline',v:79},
  ],
  cashflow:[
    {w:'W1',i:2.1,o:1.4},{w:'W2',i:1.8,o:1.6},{w:'W3',i:2.9,o:1.9},
    {w:'W4',i:3.2,o:2.1},{w:'W5',i:2.7,o:1.8},{w:'W6',i:3.8,o:2.3},
  ],
};

const GC='rgba(255,255,255,0.05)';
const TC='var(--text3)';
const TT={ backgroundColor:'var(--bg)', border:'1px solid var(--teal-border)', borderRadius:8, color:'var(--text)', fontSize:13 };

function ChartRevenue() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={SD.revenue}>
        <defs>
          <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#00f5d4" stopOpacity={0.25}/><stop offset="95%" stopColor="#00f5d4" stopOpacity={0}/></linearGradient>
          <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6c63ff" stopOpacity={0.18}/><stop offset="95%" stopColor="#6c63ff" stopOpacity={0}/></linearGradient>
        </defs>
        <CartesianGrid stroke={GC} strokeDasharray="3 3"/>
        <XAxis dataKey="m" tick={{fill:TC,fontSize:12}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fill:TC,fontSize:12}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}M`}/>
        <Tooltip contentStyle={TT} formatter={v=>[`$${v}M`]}/>
        <Area type="monotone" dataKey="cur" stroke="#00f5d4" strokeWidth={2.5} fill="url(#g1)" name="This Year"/>
        <Area type="monotone" dataKey="prv" stroke="#6c63ff" strokeWidth={2} fill="url(#g2)" name="Last Year"/>
        <Legend wrapperStyle={{color:TC,fontSize:12}}/>
      </AreaChart>
    </ResponsiveContainer>
  );
}
function ChartDepts() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={SD.depts}>
        <CartesianGrid stroke={GC} strokeDasharray="3 3"/>
        <XAxis dataKey="n" tick={{fill:TC,fontSize:12}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fill:TC,fontSize:12}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}M`}/>
        <Tooltip contentStyle={TT} formatter={v=>[`$${v}M`]}/>
        <Bar dataKey="b" fill="#6c63ff" radius={[4,4,0,0]} name="Budget"/>
        <Bar dataKey="a" fill="#00f5d4" radius={[4,4,0,0]} name="Actual"/>
        <Legend wrapperStyle={{color:TC,fontSize:12}}/>
      </BarChart>
    </ResponsiveContainer>
  );
}
function ChartPipeline() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={SD.pipeline} cx="50%" cy="50%" innerRadius={55} outerRadius={82} paddingAngle={3} dataKey="v">
          {SD.pipeline.map((e,i)=><Cell key={i} fill={e.fill} opacity={0.9}/>)}
        </Pie>
        <Tooltip contentStyle={TT}/>
        <Legend wrapperStyle={{color:TC,fontSize:12}}/>
      </PieChart>
    </ResponsiveContainer>
  );
}
function ChartRadar() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={SD.radar}>
        <PolarGrid stroke={GC}/>
        <PolarAngleAxis dataKey="m" tick={{fill:TC,fontSize:12}}/>
        <Radar dataKey="v" stroke="#00f5d4" fill="#00f5d4" fillOpacity={0.15} strokeWidth={2.5}/>
        <Tooltip contentStyle={TT} formatter={v=>[`${v}/100`]}/>
      </RadarChart>
    </ResponsiveContainer>
  );
}
function ChartCashflow() {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={SD.cashflow}>
        <CartesianGrid stroke={GC} strokeDasharray="3 3"/>
        <XAxis dataKey="w" tick={{fill:TC,fontSize:12}} axisLine={false} tickLine={false}/>
        <YAxis tick={{fill:TC,fontSize:12}} axisLine={false} tickLine={false} tickFormatter={v=>`$${v}M`}/>
        <Tooltip contentStyle={TT} formatter={v=>[`$${v}M`]}/>
        <Bar dataKey="i" fill="#00f5d4" radius={[4,4,0,0]} name="Inflow"/>
        <Bar dataKey="o" fill="#f15bb5" radius={[4,4,0,0]} name="Outflow"/>
        <Legend wrapperStyle={{color:TC,fontSize:12}}/>
      </BarChart>
    </ResponsiveContainer>
  );
}
const CHARTS = {
  revenue:     { label:'Revenue Trend',   C:ChartRevenue },
  departments: { label:'Dept Budgets',    C:ChartDepts },
  pipeline:    { label:'Sales Pipeline',  C:ChartPipeline },
  radar:       { label:'KPI Radar',       C:ChartRadar },
  cashflow:    { label:'Cash Flow',       C:ChartCashflow },
};

// ─── ROBOT FACE ────────────────────────────────────────────
function RobotFace({ state }) {
  const C = { idle:'#00f5d4', listening:'#f59e0b', thinking:'#6c63ff', speaking:'#00f5d4' }[state] || '#00f5d4';
  const LABEL = { idle:'STANDBY', listening:'LISTENING', thinking:'PROCESSING', speaking:'REPORTING' }[state];
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:8 }}>
      <div style={{
        width:110, height:110, borderRadius:'50%',
        background:'radial-gradient(circle at 35% 35%, var(--bg3), var(--bg))',
        border:`2.5px solid ${C}`, boxShadow:`0 0 28px ${C}44, inset 0 0 24px rgba(0,0,0,.5)`,
        display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12,
        transition:'border-color .4s, box-shadow .4s',
        animation:(state==='thinking'||state==='speaking')?'robotPulse 1.6s ease-in-out infinite':'none',
      }}>
        <div style={{ display:'flex', gap:20 }}>
          {[0,1].map(i=>(
            <div key={i} style={{
              width:14, height:state==='thinking'?3:14,
              borderRadius:state==='thinking'?2:'50%',
              background:C, boxShadow:`0 0 10px ${C}`, transition:'all .35s',
              animation:state==='listening'?`eyeBlink 2.2s ease-in-out ${i*.2}s infinite`:'none',
            }}/>
          ))}
        </div>
        <div style={{
          width:state==='speaking'?32:18, height:state==='speaking'?8:4,
          borderRadius:10, background:C, boxShadow:`0 0 8px ${C}`, transition:'all .3s',
          animation:state==='speaking'?'mouthMove .45s ease-in-out infinite alternate':'none',
        }}/>
      </div>
      <div style={{ display:'flex', gap:3, alignItems:'flex-end', height:20, marginTop:2,
        opacity:(state==='listening'||state==='speaking')?.9:.12, transition:'opacity .4s' }}>
        {[6,12,18,10,16,8,14,11,7,13].map((h,i)=>(
          <div key={i} style={{ width:3, height:h, borderRadius:2, background:C,
            animation:(state==='listening'||state==='speaking')?`barDance .9s ease-in-out ${i*.07}s infinite alternate`:'none' }}/>
        ))}
      </div>
      <div style={{ fontFamily:'var(--mono)', fontSize:11, color:C, letterSpacing:3 }}>{LABEL}</div>
    </div>
  );
}

// ─── REAL KPI TILES (from AI only) ────────────────────────
function KPIGrid({ kpis }) {
  if (!kpis?.length) return null;
  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:2, marginBottom:10, display:'flex', alignItems:'center', gap:8 }}>
        Key Performance Indicators
        <span style={{ fontSize:10, color:'var(--teal)', background:'var(--teal-bg)', padding:'2px 8px', borderRadius:20, border:'1px solid var(--teal-border)' }}>
          Extracted from your documents
        </span>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
        {kpis.map((k,i)=>(
          <div key={i} style={{
            background:'var(--bg2)', border:'1px solid var(--border)',
            borderLeft:`3px solid ${k.up?'var(--teal)':'var(--red)'}`,
            borderRadius:'var(--radius)', padding:'12px 14px',
          }}>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:4 }}>{k.label}</div>
            <div style={{ fontSize:20, fontWeight:700, color:'var(--text)', fontFamily:'var(--mono)' }}>{k.value}</div>
            <div style={{ fontSize:12, color:k.up?'var(--teal)':'var(--red)', marginTop:2 }}>{k.change}</div>
            {k.source && (
              <div style={{ fontSize:10, color:'var(--text3)', marginTop:4, fontFamily:'var(--mono)', display:'flex', alignItems:'center', gap:3 }}>
                <FileText size={9}/> {k.source}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── SOURCE SELECTOR ───────────────────────────────────────
function SourceSelector({ kbFiles, transcripts, selectedSources, onToggle, onToggleTranscript, selectedTranscripts }) {
  const [open, setOpen] = useState(false);
  const total = selectedSources.length + selectedTranscripts.length;

  return (
    <div style={{ padding:'8px 16px', borderBottom:'1px solid var(--border)' }}>
      <button
        onClick={() => setOpen(o=>!o)}
        style={{
          width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between',
          background:'var(--bg3)', border:'1px solid var(--border)',
          borderRadius:'var(--radius-sm)', padding:'7px 10px',
          cursor:'pointer', fontFamily:'inherit', color:'var(--text2)', fontSize:12,
        }}
      >
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <CheckSquare size={12} style={{color:'var(--teal)'}}/>
          Sources for this query
          <span style={{
            background: total > 0 ? 'var(--teal-bg)' : 'var(--bg2)',
            color: total > 0 ? 'var(--teal)' : 'var(--text3)',
            border: `1px solid ${total > 0 ? 'var(--teal-border)' : 'var(--border)'}`,
            borderRadius:20, padding:'1px 7px', fontSize:10, fontWeight:700,
          }}>{total} selected</span>
        </div>
        {open ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
      </button>

      {open && (
        <div style={{ marginTop:6, background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:8, animation:'fadeUp .15s ease' }}>

          {/* KB Files */}
          {kbFiles.length > 0 && (
            <div style={{ marginBottom:6 }}>
              <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:5, padding:'0 4px' }}>
                Knowledge Base Files
              </div>
              {kbFiles.map(f => {
                const selected = selectedSources.includes(f.id);
                return (
                  <button key={f.id} onClick={() => onToggle(f.id)} style={{
                    width:'100%', display:'flex', alignItems:'center', gap:7,
                    background:selected?'var(--teal-bg)':'transparent',
                    border:`1px solid ${selected?'var(--teal-border)':'transparent'}`,
                    borderRadius:'var(--radius-sm)', padding:'5px 6px',
                    cursor:'pointer', fontFamily:'inherit', marginBottom:2,
                  }}>
                    {selected ? <CheckSquare size={11} style={{color:'var(--teal)',flexShrink:0}}/> : <Square size={11} style={{color:'var(--text3)',flexShrink:0}}/>}
                    <FileText size={10} style={{color:'var(--teal)',flexShrink:0}}/>
                    <span style={{ fontSize:11, color:selected?'var(--teal)':'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, textAlign:'left' }}>
                      {f.original_name}
                    </span>
                    <span style={{ fontSize:10, color:'var(--text3)', flexShrink:0 }}>
                      {(f.size/1024).toFixed(0)}KB
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Session transcripts */}
          {transcripts.length > 0 && (
            <div>
              <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:5, padding:'0 4px', borderTop:kbFiles.length?'1px solid var(--border)':'none', paddingTop:kbFiles.length?6:0 }}>
                Session Transcripts
              </div>
              {transcripts.map(t => {
                const selected = selectedTranscripts.includes(t.id);
                return (
                  <button key={t.id} onClick={() => onToggleTranscript(t.id)} style={{
                    width:'100%', display:'flex', alignItems:'center', gap:7,
                    background:selected?'rgba(108,99,255,0.1)':'transparent',
                    border:`1px solid ${selected?'rgba(108,99,255,0.3)':'transparent'}`,
                    borderRadius:'var(--radius-sm)', padding:'5px 6px',
                    cursor:'pointer', fontFamily:'inherit', marginBottom:2,
                  }}>
                    {selected ? <CheckSquare size={11} style={{color:'var(--accent2)',flexShrink:0}}/> : <Square size={11} style={{color:'var(--text3)',flexShrink:0}}/>}
                    <FileText size={10} style={{color:'var(--accent2)',flexShrink:0}}/>
                    <span style={{ fontSize:11, color:selected?'var(--accent2)':'var(--text2)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, textAlign:'left' }}>
                      {t.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {kbFiles.length === 0 && transcripts.length === 0 && (
            <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center', padding:'8px 0' }}>
              No sources loaded yet — upload files below
            </div>
          )}

          {/* Select all / none */}
          {(kbFiles.length > 0 || transcripts.length > 0) && (
            <div style={{ display:'flex', gap:6, marginTop:6, borderTop:'1px solid var(--border)', paddingTop:6 }}>
              <button onClick={() => { kbFiles.forEach(f=>!selectedSources.includes(f.id)&&onToggle(f.id)); transcripts.forEach(t=>!selectedTranscripts.includes(t.id)&&onToggleTranscript(t.id)); }}
                style={{ flex:1, background:'var(--teal-bg)', border:'1px solid var(--teal-border)', borderRadius:'var(--radius-sm)', padding:'4px', cursor:'pointer', color:'var(--teal)', fontSize:11, fontFamily:'inherit' }}>
                Select All
              </button>
              <button onClick={() => { kbFiles.forEach(f=>selectedSources.includes(f.id)&&onToggle(f.id)); transcripts.forEach(t=>selectedTranscripts.includes(t.id)&&onToggleTranscript(t.id)); }}
                style={{ flex:1, background:'var(--bg2)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'4px', cursor:'pointer', color:'var(--text3)', fontSize:11, fontFamily:'inherit' }}>
                Clear All
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── KB FILE MANAGER ──────────────────────────────────────
function KBFileManager({ kbFiles, onRefresh, onDelete, onUpload, uploading }) {
  const [showManager, setShowManager] = useState(false);
  const fileRef = useRef(null);

  return (
    <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:2 }}>
          <Database size={11}/> Knowledge Files
          {kbFiles.length > 0 && (
            <span style={{ background:'var(--teal-bg)', color:'var(--teal)', border:'1px solid var(--teal-border)', borderRadius:20, padding:'1px 6px', fontSize:10 }}>
              {kbFiles.length}
            </span>
          )}
        </div>
        <div style={{ display:'flex', gap:4 }}>
          <button className="btn-icon" onClick={()=>setShowManager(s=>!s)} title="Manage files">
            {showManager ? <EyeOff size={12}/> : <Eye size={12}/>}
          </button>
          <button className="btn-icon" onClick={onRefresh} title="Refresh"><RefreshCw size={11}/></button>
          <button
            onClick={()=>fileRef.current?.click()}
            disabled={uploading}
            style={{ fontSize:11, color:'var(--teal)', background:'var(--teal-bg)', border:'1px solid var(--teal-border)', borderRadius:'var(--radius-sm)', padding:'3px 8px', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}
          >
            {uploading ? <RefreshCw size={10} style={{animation:'spin 1s linear infinite'}}/> : <Upload size={10}/>}
            {uploading ? 'Saving...' : 'Add'}
          </button>
        </div>
        <input ref={fileRef} type="file" multiple accept=".txt,.md,.csv,.json,.pdf,.docx,.xlsx"
          style={{display:'none'}} onChange={e=>onUpload(Array.from(e.target.files))}/>
      </div>

      {kbFiles.length === 0 ? (
        <div onClick={()=>fileRef.current?.click()} style={{
          border:'1.5px dashed var(--border2)', borderRadius:'var(--radius-sm)',
          padding:'10px', textAlign:'center', cursor:'pointer', color:'var(--text3)', fontSize:11,
          transition:'border-color .2s',
        }}
          onMouseEnter={e=>e.currentTarget.style.borderColor='var(--teal)'}
          onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border2)'}
        >
          <Database size={16} style={{margin:'0 auto 4px',display:'block',opacity:.3}}/>
          Upload company files<br/>
          <span style={{fontSize:10,color:'var(--teal)'}}>Saved permanently to server</span>
        </div>
      ) : (
        <>
          {/* Compact list always visible */}
          <div style={{ fontSize:11, color:'var(--text3)', marginBottom:showManager?6:0 }}>
            {kbFiles.slice(0,2).map(f=>(
              <div key={f.id} style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                <FileText size={10} style={{color:'var(--teal)',flexShrink:0}}/>
                <span style={{ overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1, color:'var(--text2)' }}>{f.original_name}</span>
              </div>
            ))}
            {kbFiles.length > 2 && !showManager && (
              <button onClick={()=>setShowManager(true)} style={{ background:'none', border:'none', color:'var(--text3)', fontSize:10, cursor:'pointer', padding:0, fontFamily:'inherit' }}>
                +{kbFiles.length-2} more — click eye to manage
              </button>
            )}
          </div>

          {/* Full manager */}
          {showManager && (
            <div style={{ background:'var(--bg)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:8, maxHeight:200, overflowY:'auto', animation:'fadeUp .2s ease' }}>
              <div style={{ fontSize:10, color:'var(--text3)', marginBottom:6, padding:'0 4px' }}>
                All knowledge files — stored permanently on server
              </div>
              {kbFiles.map(f=>(
                <div key={f.id} style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 6px', borderRadius:'var(--radius-sm)', marginBottom:2, background:'var(--bg2)', border:'1px solid var(--border)' }}>
                  <FileText size={11} style={{color:'var(--teal)',flexShrink:0}}/>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:11, color:'var(--text)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{f.original_name}</div>
                    <div style={{ fontSize:10, color:'var(--text3)' }}>{(f.size/1024).toFixed(1)}KB · {new Date(f.created_at).toLocaleDateString()}</div>
                  </div>
                  <button className="btn-icon" onClick={()=>onDelete(f.id)} style={{flexShrink:0}} title="Remove from knowledge base">
                    <Trash2 size={11}/>
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── MAIN BOARDROOM ────────────────────────────────────────
export function Boardroom() {
  const [robotState,          setRobotState]          = useState('idle');
  const [question,            setQuestion]            = useState('');
  const [report,              setReport]              = useState(null);
  const [showReport,          setShowReport]          = useState(false);
  const [sessionLog,          setSessionLog]          = useState([]);
  const [transcripts,         setTranscripts]         = useState([]);
  const [kbFiles,             setKbFiles]             = useState([]);
  const [selectedSources,     setSelectedSources]     = useState([]); // selected KB file IDs
  const [selectedTranscripts, setSelectedTranscripts] = useState([]); // selected transcript IDs
  const [listening,           setListening]           = useState(false);
  const [voiceOK,             setVoiceOK]             = useState(false);
  const [voiceMsg,            setVoiceMsg]            = useState('');
  const [ollamaModel,         setOllamaModel]         = useState('llama3.1:latest');
  const [ollamaUrl,           setOllamaUrl]           = useState('http://192.168.10.120:11434');
  const [showConfig,          setShowConfig]          = useState(false);
  const [uploading,           setUploading]           = useState(false);
  const [aiModels,            setAiModels]            = useState([]);
  const recogRef = useRef(null);
  const txFileRef = useRef(null);

  const loadKBFiles = async () => {
    try {
      const r = await fetch(`${API}/api/knowledge-files`);
      if (r.ok) {
        const files = await r.json();
        setKbFiles(files);
        // Auto-select all files by default
        setSelectedSources(prev => {
          const newIds = files.map(f=>f.id).filter(id=>!prev.includes(id));
          return [...prev, ...newIds];
        });
      }
    } catch {}
  };

  const loadModels = async () => {
    try {
      const r = await fetch(`${API}/api/ai/status`);
      if (r.ok) { const d=await r.json(); if(d.ollamaModels?.length) setAiModels(d.ollamaModels); }
    } catch {}
  };

  useEffect(() => { loadKBFiles(); loadModels(); }, []);

  const handleUpload = async (files) => {
    setUploading(true);
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    try {
      const r = await fetch(`${API}/api/knowledge-files/upload`, { method:'POST', body:form });
      if (r.ok) await loadKBFiles();
    } catch(e) { console.error(e); }
    setUploading(false);
  };

  const deleteKBFile = async (id) => {
    await fetch(`${API}/api/knowledge-files/${id}`, { method:'DELETE' });
    setSelectedSources(p=>p.filter(s=>s!==id));
    await loadKBFiles();
  };

  const toggleSource = (id) => {
    setSelectedSources(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  };

  const toggleTranscript = (id) => {
    setSelectedTranscripts(p => p.includes(id) ? p.filter(x=>x!==id) : [...p, id]);
  };

  // Add transcript file
  const addTranscripts = async (files) => {
    for (const file of files) {
      const content = await new Promise((res,rej) => { const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsText(file); });
      const id = `${file.name}-${Date.now()}`;
      setTranscripts(p=>[...p,{ id, name:file.name, content, size:file.size }]);
      setSelectedTranscripts(p=>[...p, id]);
    }
  };

  // Voice
  useEffect(()=>{
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setVoiceOK(false); return; }
    setVoiceOK(true);
    const rec = new SR();
    rec.continuous=false; rec.interimResults=false; rec.lang='en-US';
    rec.onresult = e => { const t=e.results[0][0].transcript; setQuestion(t); setListening(false); doAsk(t); };
    rec.onend  = ()=>setListening(false);
    rec.onerror= e=>{
      setListening(false); setRobotState('idle');
      setVoiceMsg(e.error==='not-allowed'?'Mic blocked — click 🔒 in address bar → Allow microphone':`Mic error: ${e.error}`);
      setTimeout(()=>setVoiceMsg(''),5000);
    };
    recogRef.current = rec;
  },[]);

  const toggleVoice = ()=>{
    if (!voiceOK) { setVoiceMsg('Use Chrome for voice support'); setTimeout(()=>setVoiceMsg(''),3000); return; }
    if (listening) { recogRef.current?.stop(); setListening(false); setRobotState('idle'); }
    else { try { recogRef.current?.start(); setListening(true); setRobotState('listening'); setVoiceMsg(''); } catch { setVoiceMsg('Mic error — refresh page'); } }
  };

  // Send query to backend — with selected sources only
  const doAsk = useCallback(async (q) => {
    const text = (q||question).trim(); if (!text) return;
    setRobotState('thinking'); setShowReport(false); setReport(null);
    setSessionLog(p=>[...p.slice(-6),{role:'user',text,time:new Date().toLocaleTimeString()}]);

    // Only pass selected sources
    const selectedTx = transcripts.filter(t=>selectedTranscripts.includes(t.id));
    const selectedKBIds = selectedSources; // backend will filter by these IDs

    try {
      const r = await fetch(`${API}/api/boardroom/query`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({
          question:text,
          model: ollamaModel,
          transcripts: selectedTx,
          selectedKBFileIds: selectedKBIds,
        }),
      });
      if (!r.ok) throw new Error(`Backend ${r.status}`);
      const result = await r.json();
      if (result.error && !result.title) throw new Error(result.error);
      setReport(result);
      setRobotState('speaking');
      setSessionLog(p=>[...p,{role:'eva',text:result.title||'Report generated',time:new Date().toLocaleTimeString()}]);
      setTimeout(()=>{ setShowReport(true); setTimeout(()=>setRobotState('idle'),3500); },300);
    } catch(err) {
      setVoiceMsg(`Error: ${err.message}`);
      setTimeout(()=>setVoiceMsg(''),5000);
      setRobotState('idle');
    }
  }, [question, transcripts, selectedSources, selectedTranscripts, ollamaModel]);

  const submit = ()=>{ if(!question.trim()||robotState==='thinking') return; doAsk(question); setQuestion(''); };

  const SUGGESTIONS = [
    'Show me the revenue performance',
    'What does the sales pipeline look like?',
    'Give me the executive scorecard',
    'Summarize the key risks from our documents',
    'How are departments tracking vs budget?',
  ];

  return (
    <div className="boardroom-layout">

      {/* ── LEFT SIDEBAR ── */}
      <div className="boardroom-sidebar" style={{ overflowY:'auto' }}>

        {/* Robot face */}
        <div style={{ padding:'22px 20px 16px', display:'flex', flexDirection:'column', alignItems:'center', gap:6, borderBottom:'1px solid var(--border)' }}>
          <RobotFace state={robotState}/>
          <div style={{ marginTop:12, textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:800, color:'var(--text)', letterSpacing:1 }}>E.V.A.</div>
            <div style={{ fontSize:11, color:'var(--text3)', letterSpacing:2, textTransform:'uppercase', marginTop:2 }}>Boardroom Intelligence</div>
          </div>
          <button onClick={()=>setShowConfig(s=>!s)} style={{ marginTop:4, fontSize:11, color:'var(--text3)', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'4px 10px', display:'flex', alignItems:'center', gap:4, cursor:'pointer' }}>
            <Settings2 size={11}/> Configure {showConfig?<ChevronUp size={10}/>:<ChevronDown size={10}/>}
          </button>
          {showConfig && (
            <div style={{ width:'100%', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:12, marginTop:2, animation:'fadeUp .2s ease' }}>
              <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Ollama URL</div>
              <input value={ollamaUrl} onChange={e=>setOllamaUrl(e.target.value)} style={{ marginBottom:10, fontSize:12, fontFamily:'var(--mono)', padding:'6px 10px' }}/>
              <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:6 }}>Model</div>
              {(aiModels.length?aiModels:['llama3.1:latest','qwen3:0.6b-q4_K_M']).map(m=>(
                <button key={m} onClick={()=>setOllamaModel(m)} style={{
                  width:'100%', marginBottom:4,
                  background:ollamaModel===m?'var(--teal-bg)':'var(--bg2)',
                  border:`1px solid ${ollamaModel===m?'var(--teal-border)':'var(--border)'}`,
                  borderRadius:'var(--radius-sm)', padding:'5px 8px', cursor:'pointer',
                  color:ollamaModel===m?'var(--teal)':'var(--text2)',
                  fontSize:11, fontFamily:'var(--mono)', textAlign:'left',
                }}>{m}</button>
              ))}
            </div>
          )}
        </div>

        {/* KB File Manager */}
        <KBFileManager
          kbFiles={kbFiles}
          onRefresh={loadKBFiles}
          onDelete={deleteKBFile}
          onUpload={handleUpload}
          uploading={uploading}
        />

        {/* Session transcripts */}
        <div style={{ padding:'8px 16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
            <div style={{ fontSize:11, color:'var(--text3)', textTransform:'uppercase', letterSpacing:2 }}>
              Transcripts (session)
              {transcripts.length>0&&<span style={{marginLeft:5,background:'var(--accent-bg)',color:'var(--accent2)',border:'1px solid rgba(108,99,255,.3)',borderRadius:20,padding:'1px 6px',fontSize:10}}>{transcripts.length}</span>}
            </div>
            <button onClick={()=>txFileRef.current?.click()} style={{ fontSize:11, color:'var(--accent2)', background:'var(--accent-bg)', border:'1px solid rgba(108,99,255,.3)', borderRadius:'var(--radius-sm)', padding:'3px 8px', cursor:'pointer', display:'flex', alignItems:'center', gap:4 }}>
              <Upload size={10}/> Upload
            </button>
            <input ref={txFileRef} type="file" multiple accept=".txt,.md" style={{display:'none'}} onChange={e=>addTranscripts(Array.from(e.target.files))}/>
          </div>
          {transcripts.length===0
            ? <div onClick={()=>txFileRef.current?.click()} style={{ border:'1.5px dashed var(--border)', borderRadius:'var(--radius-sm)', padding:'8px', textAlign:'center', cursor:'pointer', color:'var(--text3)', fontSize:11 }}>
                Upload meeting transcripts (.txt, .md)
              </div>
            : <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                {transcripts.map(t=>(
                  <div key={t.id} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--text2)', background:'var(--bg3)', borderRadius:'var(--radius-sm)', padding:'4px 7px' }}>
                    <FileText size={10} style={{color:'var(--accent2)',flexShrink:0}}/>
                    <span style={{ flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</span>
                    <button className="btn-icon" onClick={()=>{ setTranscripts(p=>p.filter(x=>x.id!==t.id)); setSelectedTranscripts(p=>p.filter(x=>x!==t.id)); }}><X size={10}/></button>
                  </div>
                ))}
              </div>
          }
        </div>

        {/* Source selector */}
        <SourceSelector
          kbFiles={kbFiles}
          transcripts={transcripts}
          selectedSources={selectedSources}
          selectedTranscripts={selectedTranscripts}
          onToggle={toggleSource}
          onToggleTranscript={toggleTranscript}
        />

        {/* Input */}
        <div style={{ padding:'10px 16px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:'var(--radius)', padding:'9px 11px', display:'flex', gap:7, alignItems:'flex-end' }}>
            <textarea
              value={question}
              onChange={e=>setQuestion(e.target.value)}
              onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); submit(); }}}
              placeholder="Ask EVA anything..." disabled={robotState==='thinking'} rows={2}
              style={{ flex:1, background:'transparent', border:'none', outline:'none', color:'var(--text)', fontSize:14, resize:'none', minHeight:44, fontFamily:'inherit', lineHeight:1.6 }}
            />
            <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
              <button onClick={toggleVoice} style={{
                width:32, height:32, borderRadius:'50%',
                background:listening?'var(--yellow-bg)':voiceOK?'var(--teal-bg)':'var(--bg2)',
                border:`1.5px solid ${listening?'var(--yellow)':voiceOK?'var(--teal-border)':'var(--border)'}`,
                color:listening?'var(--yellow)':voiceOK?'var(--teal)':'var(--text3)',
                display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer',
              }}>
                {listening?<MicOff size={13}/>:<Mic size={13}/>}
              </button>
              <button onClick={submit} disabled={!question.trim()||robotState==='thinking'} style={{
                width:32, height:32, borderRadius:'50%',
                background:question.trim()?'var(--teal-bg)':'var(--bg2)',
                border:`1.5px solid ${question.trim()?'var(--teal-border)':'var(--border)'}`,
                color:question.trim()?'var(--teal)':'var(--text3)',
                cursor:question.trim()?'pointer':'default',
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Send size={13}/>
              </button>
            </div>
          </div>
          {voiceMsg && <div style={{ fontSize:12, color:'var(--yellow)', marginTop:5, padding:'4px 8px', background:'var(--yellow-bg)', borderRadius:'var(--radius-sm)' }}>{voiceMsg}</div>}
          {listening && <div style={{ fontSize:12, color:'var(--yellow)', marginTop:4, textAlign:'center', animation:'pulseGlow 1s ease-in-out infinite' }}>● Listening — speak now</div>}
        </div>

        {/* Suggestions */}
        <div style={{ padding:'8px 14px', borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:2, marginBottom:7 }}>Try asking</div>
          {SUGGESTIONS.map((s,i)=>(
            <button key={i} onClick={()=>{ setQuestion(s); doAsk(s); }} disabled={robotState==='thinking'}
              style={{ width:'100%', background:'none', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', padding:'6px 9px', color:'var(--text2)', fontSize:12, textAlign:'left', cursor:'pointer', fontFamily:'inherit', lineHeight:1.4, marginBottom:3, transition:'all .15s' }}
              onMouseEnter={e=>{ e.currentTarget.style.borderColor='var(--teal-border)'; e.currentTarget.style.color='var(--text)'; }}
              onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='var(--text2)'; }}
            >{s}</button>
          ))}
        </div>

        {/* Session log */}
        <div style={{ flex:1, overflow:'auto', padding:'8px 14px' }}>
          <div style={{ fontSize:10, color:'var(--text3)', textTransform:'uppercase', letterSpacing:2, marginBottom:7 }}>Session Log</div>
          {!sessionLog.length && <div style={{ fontSize:12, color:'var(--text3)', textAlign:'center', marginTop:10 }}>No queries yet</div>}
          {sessionLog.map((t,i)=>(
            <div key={i} style={{ marginBottom:9 }}>
              <div style={{ fontSize:10, color:t.role==='eva'?'var(--teal)':'var(--accent2)', marginBottom:2, fontFamily:'var(--mono)' }}>{t.role==='eva'?'EVA':'CEO'} · {t.time}</div>
              <div style={{ fontSize:12, color:'var(--text2)', lineHeight:1.5 }}>{t.text}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── REPORT AREA ── */}
      <div className="boardroom-main">
        {!report && robotState==='idle' && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'80vh', gap:18 }}>
            <div style={{ fontSize:60, opacity:.07 }}>⬡</div>
            <div style={{ color:'var(--text3)', fontSize:16, textAlign:'center', lineHeight:2.2 }}>
              E.V.A. Boardroom is ready<br/>
              <span style={{ fontSize:14 }}>Ask a question to generate a live intelligence report</span><br/>
              <span style={{ fontSize:12, fontFamily:'var(--mono)', color:'var(--text3)' }}>
                {kbFiles.length > 0
                  ? `✓ ${selectedSources.length}/${kbFiles.length} knowledge sources selected`
                  : '⬡ Upload the demo data .md file to get started'}
              </span>
            </div>
          </div>
        )}

        {robotState==='thinking' && (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'80vh', gap:20 }}>
            <div style={{ width:52, height:52, borderRadius:'50%', border:'2.5px solid transparent', borderTop:'2.5px solid var(--accent)', borderRight:'2.5px solid rgba(108,99,255,.3)', animation:'spin 1s linear infinite' }}/>
            <div style={{ color:'var(--text3)', fontSize:14, letterSpacing:3, textTransform:'uppercase' }}>Analyzing via Ollama...</div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>
              Using {selectedSources.length} KB file{selectedSources.length!==1?'s':''}{selectedTranscripts.length>0?` + ${selectedTranscripts.length} transcript${selectedTranscripts.length!==1?'s':''}`:''}
            </div>
            <div style={{ height:2, width:200, background:'var(--border)', borderRadius:1, overflow:'hidden', position:'relative' }}>
              <div style={{ position:'absolute', height:'100%', width:'40%', background:'var(--accent)', borderRadius:1, animation:'progress 1.4s ease-in-out infinite' }}/>
            </div>
          </div>
        )}

        {report && showReport && (
          <div style={{ animation:'fadeUp .5s ease forwards' }}>
            <div style={{ marginBottom:22 }}>
              <div style={{ fontSize:11, color:'var(--teal)', letterSpacing:3, textTransform:'uppercase', marginBottom:8, fontFamily:'var(--mono)', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                Live Report · {new Date().toLocaleTimeString()}
                {report.dataSource && (
                  <span style={{ fontSize:10, color:'var(--text3)', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:20, padding:'2px 8px' }}>
                    📄 {report.dataSource}
                  </span>
                )}
                {selectedSources.length > 0 && (
                  <span style={{ fontSize:10, color:'var(--text3)', background:'var(--bg3)', border:'1px solid var(--border)', borderRadius:20, padding:'2px 8px' }}>
                    {selectedSources.length} source{selectedSources.length!==1?'s':''} used
                  </span>
                )}
              </div>
              <h1 style={{ fontSize:26, fontWeight:800, color:'var(--text)', margin:0, lineHeight:1.2, letterSpacing:-.5 }}>{report.title}</h1>
              <p style={{ fontSize:14, color:'var(--text2)', margin:'7px 0 0', lineHeight:1.65 }}>{report.subtitle}</p>

              {kbFiles.length===0 && transcripts.length===0 && (
                <div style={{ marginTop:12, padding:'10px 14px', background:'var(--yellow-bg)', border:'1px solid var(--yellow)', borderRadius:'var(--radius-sm)', fontSize:13, color:'var(--yellow)' }}>
                  ⚠ No documents selected — upload the demo .md file and select it in Sources to see real data
                </div>
              )}

              <div className="card-teal" style={{ marginTop:14 }}>
                <div style={{ fontSize:11, color:'var(--teal)', letterSpacing:2, textTransform:'uppercase', marginBottom:6, fontFamily:'var(--mono)' }}>◈ EVA INSIGHT</div>
                <div style={{ fontSize:14, color:'var(--text2)', lineHeight:1.8 }}>{report.insight}</div>
              </div>
            </div>

            {report.showKPIs && report.kpis?.length > 0 && <KPIGrid kpis={report.kpis}/>}

            <div style={{ display:'grid', gridTemplateColumns:(report.charts||[]).length>=2?'1fr 1fr':'1fr', gap:16 }}>
              {(report.charts||[]).map((type,i)=>{
                const item=CHARTS[type]; if(!item) return null;
                const {label,C}=item;
                return (
                  <div key={type} className="card chart-card" style={{ animationDelay:`${i*.12}s`, opacity:0 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                      <div style={{ fontSize:11, color:'var(--text3)', letterSpacing:2, textTransform:'uppercase' }}>
                        <span style={{color:'var(--teal)',marginRight:6}}>◈</span>{label}
                      </div>
                      <span style={{ fontSize:10, color:'var(--text3)', fontFamily:'var(--mono)', background:'var(--bg3)', padding:'2px 6px', borderRadius:4 }}>
                        visual · sample shape
                      </span>
                    </div>
                    <C/>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
