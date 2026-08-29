import { useState } from 'react';
import { Zap, ChevronDown, ChevronUp, ExternalLink, RefreshCw, Clock, BarChart2 } from 'lucide-react';

const API = 'http://192.168.10.120:4000';
const N8N_URL = 'http://192.168.10.120:5678';

const PRIO_COLOR = { high:'var(--red)', medium:'var(--yellow)', low:'var(--green)' };
const COMPLEXITY_COLOR = { simple:'var(--green)', medium:'var(--yellow)', complex:'var(--red)' };

export function AutomationPlanner({ toast }) {
  const [workflows, setWorkflows]   = useState([]);
  const [summary,   setSummary]     = useState('');
  const [auditing,  setAuditing]    = useState(false);
  const [expanded,  setExpanded]    = useState({});
  const [building,  setBuilding]    = useState({});
  const [results,   setResults]     = useState({});

  const runAudit = async () => {
    setAuditing(true); setWorkflows([]); setSummary('');
    try {
      const r = await fetch(`${API}/api/automation/audit`, { method:'POST' });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setWorkflows(d.workflows || []);
      setSummary(d.summary || '');
    } catch(err) { toast('Audit failed: ' + err.message, 'error'); }
    setAuditing(false);
  };

  const buildWorkflow = async (wf, i) => {
    setBuilding(b => ({...b, [i]: true}));
    try {
      const r = await fetch(`${API}/api/automation/build-n8n`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ workflow: wf }),
      });
      const d = await r.json();
      setResults(p => ({...p, [i]: d}));
      if (d.ok) toast(`Workflow pushed to n8n!`);
      else if (d.manual) toast('n8n not reachable — JSON ready for manual import');
      else toast('Build failed', 'error');
    } catch(err) { toast('Build error: ' + err.message, 'error'); }
    setBuilding(b => ({...b, [i]: false}));
  };

  const copyJSON = (json) => {
    navigator.clipboard.writeText(JSON.stringify(json, null, 2));
    toast('Workflow JSON copied!');
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Automation Planner</div>
          <div className="page-sub">AI audits your work and builds n8n workflows automatically</div>
        </div>
        <div style={{display:'flex', gap:8}}>
          <a href={N8N_URL} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
            <ExternalLink size={13}/> Open n8n
          </a>
          <button className="btn btn-primary" onClick={runAudit} disabled={auditing}>
            {auditing
              ? <><RefreshCw size={13} style={{animation:'spin 1s linear infinite'}}/> Auditing...</>
              : <><Zap size={13}/> Run Workflow Audit</>
            }
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* How it works */}
        {workflows.length === 0 && !auditing && (
          <div>
            <div className="card" style={{marginBottom:20, padding:'20px 24px'}}>
              <div style={{fontSize:12,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:14}}>How it works</div>
              <div style={{display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16}}>
                {[
                  {step:'1', icon:'🔍', title:'Audit', desc:'AI scans your projects, tasks, strategy sessions and ideas to find recurring manual work'},
                  {step:'2', icon:'🗺️', title:'Map', desc:'EVA maps every step of each workflow and identifies exactly where automation helps most'},
                  {step:'3', icon:'⚙️', title:'Build', desc:'Click "Build in n8n" and EVA generates a working n8n workflow JSON automatically'},
                  {step:'4', icon:'🚀', title:'Deploy', desc:'Push directly to your n8n instance or copy JSON for manual import'},
                ].map(s => (
                  <div key={s.step} style={{textAlign:'center'}}>
                    <div style={{fontSize:28, marginBottom:8}}>{s.icon}</div>
                    <div style={{fontSize:13, fontWeight:600, marginBottom:4}}>{s.title}</div>
                    <div style={{fontSize:12, color:'var(--text3)', lineHeight:1.5}}>{s.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{textAlign:'center', padding:'40px 0'}}>
              <button className="btn btn-primary" onClick={runAudit} style={{padding:'12px 24px', fontSize:14}}>
                <Zap size={15}/> Run Workflow Audit
              </button>
              <div style={{fontSize:12,color:'var(--text3)',marginTop:12}}>EVA will analyze all your data and surface the 5 best automation opportunities</div>
            </div>
          </div>
        )}

        {/* Auditing spinner */}
        {auditing && (
          <div style={{textAlign:'center', padding:'60px 0'}}>
            <RefreshCw size={32} style={{animation:'spin 1s linear infinite', color:'var(--teal)', margin:'0 auto 16px', display:'block'}}/>
            <div style={{fontSize:14, color:'var(--text3)'}}>Analyzing your workflows with Ollama...</div>
            <div style={{fontSize:12, color:'var(--text3)', marginTop:6}}>Reading projects, tasks, strategy sessions, ideas...</div>
          </div>
        )}

        {/* Summary */}
        {summary && (
          <div className="card-teal" style={{marginBottom:20}}>
            <div style={{fontSize:11, color:'var(--teal)', textTransform:'uppercase', letterSpacing:1, marginBottom:6, fontFamily:'var(--mono)'}}>◈ Audit Summary</div>
            <div style={{fontSize:14, color:'var(--text2)', lineHeight:1.7}}>{summary}</div>
          </div>
        )}

        {/* Workflows */}
        {workflows.length > 0 && (
          <div>
            <div style={{fontSize:12,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:14}}>
              {workflows.length} Automation Opportunities Found
            </div>
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {workflows.map((wf, i) => (
                <div key={i} className="card">
                  {/* Header */}
                  <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                        <div style={{fontSize:15,fontWeight:700}}>{wf.title}</div>
                        <span style={{fontSize:11,color:PRIO_COLOR[wf.priority]||'var(--text3)',background:'var(--bg3)',padding:'1px 7px',borderRadius:10}}>{wf.priority}</span>
                        <span style={{fontSize:11,color:COMPLEXITY_COLOR[wf.complexity]||'var(--text3)',background:'var(--bg3)',padding:'1px 7px',borderRadius:10}}>{wf.complexity}</span>
                      </div>
                      <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6,marginBottom:8}}>{wf.description}</div>
                      <div style={{display:'flex',gap:16}}>
                        <span style={{fontSize:12,color:'var(--teal)',display:'flex',alignItems:'center',gap:4}}>
                          <Clock size={11}/> {wf.time_saved}
                        </span>
                        <span style={{fontSize:12,color:'var(--text3)'}}>Trigger: {wf.trigger}</span>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:8,flexShrink:0}}>
                      <button className="btn btn-ghost" style={{padding:'6px 12px',fontSize:12}} onClick={() => setExpanded(p=>({...p,[i]:!p[i]}))}>
                        {expanded[i] ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                        {expanded[i] ? 'Less' : 'Details'}
                      </button>
                      <button className="btn btn-primary" style={{padding:'6px 14px',fontSize:12}}
                        onClick={() => buildWorkflow(wf,i)} disabled={building[i]}>
                        {building[i]
                          ? <><RefreshCw size={11} style={{animation:'spin 1s linear infinite'}}/> Building...</>
                          : '⚙️ Build in n8n'
                        }
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expanded[i] && (
                    <div style={{marginTop:16,paddingTop:16,borderTop:'1px solid var(--border)'}}>
                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                        <div>
                          <div style={{fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Steps</div>
                          {(wf.steps||[]).map((s,si) => (
                            <div key={si} style={{display:'flex',gap:8,marginBottom:5,fontSize:12,color:'var(--text2)'}}>
                              <span style={{color:'var(--teal)',flexShrink:0,fontFamily:'var(--mono)'}}>{si+1}.</span>
                              {s}
                            </div>
                          ))}
                        </div>
                        <div>
                          <div style={{fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>n8n Nodes</div>
                          <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                            {(wf.n8n_nodes||[]).map((n,ni) => (
                              <span key={ni} style={{fontSize:11,background:'var(--accent-bg)',color:'var(--accent2)',border:'1px solid rgba(108,99,255,.3)',borderRadius:20,padding:'2px 8px'}}>{n}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Build result */}
                  {results[i] && (
                    <div style={{marginTop:12,paddingTop:12,borderTop:'1px solid var(--border)'}}>
                      {results[i].ok ? (
                        <div style={{display:'flex',alignItems:'center',gap:10}}>
                          <span style={{color:'var(--green)',fontSize:13}}>✓ Pushed to n8n!</span>
                          <a href={results[i].n8nUrl} target="_blank" rel="noopener noreferrer" className="btn btn-teal" style={{padding:'4px 12px',fontSize:11}}>
                            <ExternalLink size={11}/> Open in n8n
                          </a>
                        </div>
                      ) : (
                        <div>
                          <div style={{fontSize:12,color:'var(--yellow)',marginBottom:8}}>
                            ⚠ {results[i].message || 'n8n not reachable'} — copy JSON below for manual import
                          </div>
                          <div style={{display:'flex',gap:8}}>
                            <button className="btn btn-ghost" style={{fontSize:11,padding:'4px 12px'}} onClick={() => copyJSON(results[i].workflow)}>
                              Copy n8n JSON
                            </button>
                            <a href={N8N_URL} target="_blank" rel="noopener noreferrer" className="btn btn-teal" style={{fontSize:11,padding:'4px 12px'}}>
                              <ExternalLink size={11}/> Open n8n to import
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
