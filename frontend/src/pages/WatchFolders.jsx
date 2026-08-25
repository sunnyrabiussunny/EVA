import { useState, useEffect, useRef } from 'react';
import { api } from '../utils/api.js';
import { Plus, Trash2, X, RefreshCw, FolderOpen, CheckCircle } from 'lucide-react';

const API = 'http://192.168.10.120:4000';

export function WatchFolders({ toast }) {
  const [folders,   setFolders]   = useState([]);
  const [scanning,  setScanning]  = useState(false);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState({ path:'', label:'' });
  const [lastScan,  setLastScan]  = useState(null);

  const load = async () => {
    try {
      const r = await fetch(`${API}/api/watch/folders`);
      const data = await r.json();
      setFolders(data);
    } catch {}
  };

  useEffect(() => { load(); }, []);

  const addFolder = async () => {
    if (!form.path) return;
    try {
      const r = await fetch(`${API}/api/watch/folder`, {
        method:'POST',
        headers:{ 'Content-Type':'application/json' },
        body: JSON.stringify(form),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      toast('Folder added!');
      setModal(false);
      setForm({ path:'', label:'' });
      load();
    } catch(err) { toast('Failed: ' + err.message, 'error'); }
  };

  const removeFolder = async (id) => {
    await fetch(`${API}/api/watch/folder/${id}`, { method:'DELETE' });
    toast('Folder removed', 'error');
    load();
  };

  const scanNow = async () => {
    setScanning(true);
    try {
      const r = await fetch(`${API}/api/watch/scan-now`, { method:'POST' });
      const d = await r.json();
      const msg = d.new_files > 0
        ? `Scan complete — ${d.new_files} new file${d.new_files>1?'s':''} imported to Knowledge Base`
        : `Scan complete — no new files found (${d.folders_scanned} folders checked)`;
      toast(msg);
      setLastScan({ new_files: d.new_files, folders: d.folders_scanned, time: new Date().toLocaleTimeString() });
      load();
    } catch(err) { toast('Scan failed: ' + err.message, 'error'); }
    setScanning(false);
  };

  const EXAMPLE_PATHS = [
    '/home/ubuntuasus/company-data',
    '/home/ubuntuasus/Documents',
    '/mnt/shared/reports',
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Watch Folders</div>
          <div className="page-sub">Monitor server folders — new files auto-import to Knowledge Base</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" onClick={scanNow} disabled={scanning || folders.length===0}>
            <RefreshCw size={13} style={{ animation: scanning ? 'spin 1s linear infinite' : 'none' }}/>
            {scanning ? 'Scanning...' : 'Scan Now'}
          </button>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <Plus size={14}/> Add Folder
          </button>
        </div>
      </div>

      <div className="page-body">

        {/* Last scan result */}
        {lastScan && (
          <div className="card-teal" style={{ marginBottom:20, display:'flex', alignItems:'center', gap:12 }}>
            <CheckCircle size={16} style={{ color:'var(--teal)', flexShrink:0 }}/>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>Last scan at {lastScan.time}</div>
              <div style={{ fontSize:12, color:'var(--text2)' }}>
                {lastScan.new_files} new file{lastScan.new_files!==1?'s':''} imported · {lastScan.folders} folder{lastScan.folders!==1?'s':''} scanned
              </div>
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="card" style={{ marginBottom:20, background:'var(--bg2)', padding:'16px 20px' }}>
          <div style={{ fontSize:12, color:'var(--text3)', textTransform:'uppercase', letterSpacing:1, marginBottom:10 }}>How it works</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16 }}>
            {[
              { step:'1', title:'Add a folder path', desc:'Point EVA to any folder on the server — company data, shared drives, exports' },
              { step:'2', title:'Click Scan Now', desc:'EVA scans for new PDF, Excel, Word, CSV, and text files not yet in Knowledge Base' },
              { step:'3', title:'Auto-imported', desc:'New files appear in Knowledge Base and are immediately available for Boardroom queries' },
            ].map(s => (
              <div key={s.step} style={{ display:'flex', gap:12, alignItems:'flex-start' }}>
                <div style={{ width:24, height:24, borderRadius:'50%', background:'var(--teal-bg)', border:'1px solid var(--teal-border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'var(--teal)', flexShrink:0 }}>{s.step}</div>
                <div>
                  <div style={{ fontSize:13, fontWeight:600, marginBottom:3 }}>{s.title}</div>
                  <div style={{ fontSize:12, color:'var(--text3)', lineHeight:1.5 }}>{s.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Folder list */}
        {folders.length === 0 ? (
          <div className="empty">
            <div className="empty-icon"><FolderOpen size={36} style={{ opacity:.3 }}/></div>
            <div className="empty-title">No folders watched yet</div>
            <div className="empty-sub">Add a server folder path to start auto-importing files</div>
            <button className="btn btn-primary" style={{ marginTop:12 }} onClick={() => setModal(true)}>
              <Plus size={13}/> Add First Folder
            </button>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {folders.map(f => (
              <div key={f.id} className="card" style={{ display:'flex', alignItems:'center', gap:16 }}>
                <FolderOpen size={22} style={{ color:'var(--teal)', flexShrink:0 }}/>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:14, fontWeight:600, color:'var(--text)', marginBottom:3 }}>
                    {f.label || f.path.split('/').pop()}
                  </div>
                  <div style={{ fontSize:12, color:'var(--text3)', fontFamily:'var(--mono)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {f.path}
                  </div>
                  {f.last_scan && (
                    <div style={{ fontSize:11, color:'var(--text3)', marginTop:3 }}>
                      Last scanned: {new Date(f.last_scan).toLocaleString()} · {f.file_count} files found
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
                  <div style={{
                    fontSize:11, padding:'3px 10px', borderRadius:20,
                    background: f.active ? 'var(--green-bg)' : 'var(--bg3)',
                    color: f.active ? 'var(--green)' : 'var(--text3)',
                    border: `1px solid ${f.active ? 'var(--green)' : 'var(--border)'}`,
                  }}>
                    {f.active ? 'Active' : 'Paused'}
                  </div>
                  <button className="btn-icon" onClick={() => removeFolder(f.id)}><Trash2 size={14}/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add folder modal */}
      {modal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setModal(false)}>
          <div className="modal" style={{ maxWidth:500 }}>
            <div className="modal-header">
              <div className="modal-title">Add Watch Folder</div>
              <button className="btn-icon" onClick={() => setModal(false)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <div className="form-row">
                <label className="form-label">Server Folder Path *</label>
                <input value={form.path} onChange={e => setForm(f=>({...f,path:e.target.value}))}
                  placeholder="/home/ubuntuasus/company-data" autoFocus
                  style={{ fontFamily:'var(--mono)', fontSize:13 }}/>
                <div className="form-hint">Full absolute path on the Ubuntu server</div>
              </div>
              <div className="form-row">
                <label className="form-label">Label (optional)</label>
                <input value={form.label} onChange={e => setForm(f=>({...f,label:e.target.value}))}
                  placeholder="e.g. Company Reports"/>
              </div>

              {/* Example paths */}
              <div style={{ marginBottom:16 }}>
                <div style={{ fontSize:11, color:'var(--text3)', marginBottom:6, textTransform:'uppercase', letterSpacing:1 }}>Example paths</div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {EXAMPLE_PATHS.map(p => (
                    <button key={p} onClick={() => setForm(f=>({...f,path:p}))} style={{
                      background:'var(--bg3)', border:'1px solid var(--border)',
                      borderRadius:'var(--radius-sm)', padding:'5px 10px',
                      cursor:'pointer', textAlign:'left', color:'var(--text2)',
                      fontSize:12, fontFamily:'var(--mono)', fontFamily:'inherit',
                    }}>{p}</button>
                  ))}
                </div>
              </div>

              <div style={{ padding:'10px 14px', background:'var(--yellow-bg)', border:'1px solid var(--yellow)', borderRadius:'var(--radius-sm)', fontSize:12, color:'var(--yellow)', marginBottom:16 }}>
                ⚠ Path must exist on the Ubuntu server. EVA will scan it for PDF, Excel, Word, CSV, TXT, and Markdown files.
              </div>

              <div className="flex" style={{gap:10,justifyContent:'flex-end'}}>
                <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={addFolder}>Add Folder</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
