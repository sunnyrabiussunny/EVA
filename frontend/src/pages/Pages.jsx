import { useEffect, useState, useRef, useCallback } from 'react';
import { api } from '../utils/api.js';
import { Plus, Trash2, X, Zap, Search, Brain, RefreshCw, Upload, FileText, Database } from 'lucide-react';

const KB_API = 'http://192.168.10.120:4000';

// ─── TASKS ────────────────────────────────────────────────────────────────────
export function Tasks({ toast }) {
  const [tasks, setTasks] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', priority: 'medium', due_date: '', notes: '' });

  const [search, setSearch] = useState('');
  const load = () => api.get('/tasks').then(setTasks);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title) return;
    try {
      await api.post('/tasks', form);
      toast('Task added');
      setModal(false);
      setForm({ title: '', priority: 'medium', due_date: '', notes: '' });
      load();
    } catch (err) { toast('Save failed: ' + err.message, 'error'); }
  };

  const updateStatus = async (id, status) => {
    await api.put(`/tasks/${id}`, { status }); load();
  };

  const del = async (id) => { await api.del(`/tasks/${id}`); toast('Deleted', 'error'); load(); };

  const filtered = search ? tasks.filter(t => t.title.toLowerCase().includes(search.toLowerCase())) : tasks;
  const grouped = { todo: [], inprogress: [], done: [] };
  filtered.forEach(t => { if (grouped[t.status]) grouped[t.status].push(t); });

  const priorityDot = { high: 'var(--red)', medium: 'var(--yellow)', low: 'var(--green)' };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Tasks</div><div className="page-sub">{tasks.filter(t => t.status === 'todo').length} pending</div></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={14} /> Add Task</button>
      </div>
      <div className="page-body">
        <div className="flex-center gap-12 mb-20" style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, color: 'var(--text3)' }} />
          <input style={{ paddingLeft: 36 }} placeholder="Search tasks..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="grid grid-3" style={{ gap: 16 }}>
          {[['todo', 'To Do'], ['inprogress', 'In Progress'], ['done', 'Done']].map(([status, label]) => (
            <div key={status}>
              <div className="card-title mb-12">{label} ({grouped[status].length})</div>
              <div className="grid" style={{ gap: 8 }}>
                {grouped[status].map(t => (
                  <div key={t.id} className="card card-sm">
                    <div className="flex-between mb-4">
                      <div className="flex-center gap-8">
                        <div style={{ width: 7, height: 7, borderRadius: '50%', background: priorityDot[t.priority] }} />
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{t.title}</span>
                      </div>
                      <button className="btn-icon" onClick={() => del(t.id)}><Trash2 size={12} /></button>
                    </div>
                    {t.due_date && <div className="text-sm mb-8">📅 {new Date(t.due_date).toLocaleDateString()}</div>}
                    <div className="flex-center gap-6" style={{ flexWrap: 'wrap' }}>
                      {status !== 'todo' && <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(t.id, 'todo')}>← Todo</button>}
                      {status !== 'inprogress' && <button className="btn btn-ghost btn-sm" onClick={() => updateStatus(t.id, 'inprogress')}>In Progress</button>}
                      {status !== 'done' && <button className="btn btn-sm" style={{ background: 'var(--green-bg)', color: 'var(--green)', border: 'none' }} onClick={() => updateStatus(t.id, 'done')}>✓ Done</button>}
                    </div>
                  </div>
                ))}
                {grouped[status].length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', padding: '12px 0' }}>Nothing here</div>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">New Task</div><button className="btn-icon" onClick={() => setModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              <div className="form-row"><label className="form-label">Task *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What needs to be done?" /></div>
              <div className="grid grid-2" style={{ gap: 12, marginBottom: 14 }}>
                <div><label className="form-label">Priority</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                    <option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option>
                  </select>
                </div>
                <div><label className="form-label">Due Date</label><input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
              </div>
              <div className="form-row"><label className="form-label">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any extra context..." /></div>
              <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save}>Add Task</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── IDEAS ────────────────────────────────────────────────────────────────────



// ─── IDEAS VAULT (with .md drag-drop import) ──────────────────────────────────
export function Ideas({ toast }) {
  const [ideas,     setIdeas]     = useState([]);
  const [modal,     setModal]     = useState(false);   // new idea modal
  const [editModal, setEditModal] = useState(null);    // idea being edited
  const [viewModal, setViewModal] = useState(null);    // idea being viewed full
  const [form,      setForm]      = useState({ title:'', body:'', category:'general' });
  const [editForm,  setEditForm]  = useState({ title:'', body:'', category:'general' });
  const [expanding, setExpanding] = useState(null);
  const [expanded,  setExpanded]  = useState({});
  const [isDragging,setIsDragging]= useState(false);
  const [importing, setImporting] = useState(false);
  const fileRef = useRef(null);
  const dropRef = useRef(null);

  const load = () => api.get('/ideas').then(setIdeas);
  useEffect(() => { load(); }, []);

  // ── Create ──
  const save = async () => {
    if (!form.title) return;
    try {
      await api.post('/ideas', form);
      toast('Idea saved!');
      setModal(false);
      setForm({ title:'', body:'', category:'general' });
      load();
    } catch (err) { toast('Save failed: ' + err.message, 'error'); }
  };

  // ── Edit / Update ──
  const openEdit = (idea) => {
    setEditForm({ title: idea.title, body: idea.body || '', category: idea.category || 'general' });
    setEditModal(idea);
    setViewModal(null);
  };

  const saveEdit = async () => {
    if (!editForm.title || !editModal) return;
    try {
      await api.put(`/ideas/${editModal.id}`, editForm);
      toast('Idea updated!');
      setEditModal(null);
      load();
    } catch (err) { toast('Update failed: ' + err.message, 'error'); }
  };

  // ── Delete ──
  const del = async (id) => {
    await api.del(`/ideas/${id}`);
    toast('Deleted', 'error');
    setViewModal(null);
    load();
  };

  // ── AI Expand ──
  const expand = async (id) => {
    setExpanding(id);
    try {
      const r = await api.post(`/ideas/${id}/expand`, {});
      setExpanded(e => ({ ...e, [id]: r }));
      toast('Idea expanded by AI!');
      load(); // refresh so expanded text persists
    } catch { toast('AI expansion failed', 'error'); }
    finally { setExpanding(null); }
  };

  // ── .md import ──
  const importMdFiles = async (files) => {
    setImporting(true);
    let count = 0;
    for (const file of files) {
      if (!file.name.endsWith('.md') && !file.name.endsWith('.txt')) continue;
      const content = await new Promise((res,rej) => { const r = new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsText(file); });
      const title = file.name.replace(/\.(md|txt)$/,'').replace(/[-_]/g,' ');
      await api.post('/ideas', { title, body: content, category: 'imported' });
      count++;
    }
    if (count > 0) { toast(`Imported ${count} file${count>1?'s':''}!`); load(); }
    else toast('No .md or .txt files found', 'error');
    setImporting(false);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    importMdFiles(Array.from(e.dataTransfer.files));
  }, []);

  const catColor = { product:'blue', content:'green', business:'yellow', research:'purple', personal:'gray', general:'gray', imported:'teal' };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Idea Vault</div>
          <div className="page-sub">{ideas.length} ideas captured</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button className="btn btn-ghost" onClick={() => fileRef.current?.click()} disabled={importing}>
            <Upload size={13}/> {importing ? 'Importing...' : 'Import .md'}
          </button>
          <input ref={fileRef} type="file" multiple accept=".md,.txt" style={{display:'none'}} onChange={e=>importMdFiles(Array.from(e.target.files))}/>
          <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={14}/> Capture Idea</button>
        </div>
      </div>

      <div className="page-body">
        {/* Drag-drop zone */}
        <div
          ref={dropRef}
          onDragOver={e=>{e.preventDefault();setIsDragging(true);}}
          onDragLeave={e=>{if(!dropRef.current?.contains(e.relatedTarget))setIsDragging(false);}}
          onDrop={onDrop}
          onClick={()=>fileRef.current?.click()}
          style={{
            border:`2px dashed ${isDragging?'var(--teal)':'var(--border)'}`,
            borderRadius:'var(--radius)', padding:'16px',
            textAlign:'center', cursor:'pointer', marginBottom:20,
            background:isDragging?'var(--teal-bg)':'transparent',
            transition:'all .2s', color:'var(--text3)', fontSize:13,
          }}
        >
          <FileText size={18} style={{margin:'0 auto 5px',display:'block',opacity:.4}}/>
          Drag and drop <strong>.md</strong> or <strong>.txt</strong> files here to import as ideas
        </div>

        {ideas.length === 0
          ? <div className="empty"><div className="empty-icon">💡</div><div className="empty-title">No ideas yet</div><div className="empty-sub">Capture an idea or drag .md files above</div></div>
          : <div className="grid grid-auto" style={{ gap:14 }}>
              {ideas.map(idea => {
                const aiData = expanded[idea.id];
                const expandedText = aiData?.expanded || idea.expanded;
                const firstStep    = aiData?.first_step;
                return (
                  <div key={idea.id} className="card" style={{ cursor:'default' }}>
                    {/* Top row */}
                    <div className="flex-between mb-8">
                      <span className={`badge badge-${catColor[idea.category]||'gray'}`}>{idea.category}</span>
                      <div className="flex-center gap-6">
                        <button className="btn-icon" title="Edit" onClick={()=>openEdit(idea)}>
                          ✏️
                        </button>
                        <button className="btn-icon" title="View full" onClick={()=>setViewModal(idea)}
                          style={{fontSize:13}}>👁</button>
                        <button className="btn-icon" title="Delete" onClick={()=>del(idea.id)}>
                          <Trash2 size={13}/>
                        </button>
                      </div>
                    </div>

                    {/* Title — click to open full view */}
                    <div
                      className="fw-600 mb-6"
                      style={{fontSize:14, cursor:'pointer', color:'var(--text)'}}
                      onClick={()=>setViewModal(idea)}
                    >
                      {idea.title}
                    </div>

                    {/* Body preview */}
                    {idea.body && (
                      <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.55,whiteSpace:'pre-wrap',maxHeight:80,overflow:'hidden',marginBottom:8,position:'relative'}}>
                        {idea.body.substring(0,200)}{idea.body.length>200&&'…'}
                      </div>
                    )}

                    {/* AI expansion preview */}
                    {expandedText && (
                      <div style={{marginTop:8,borderTop:'1px solid var(--border)',paddingTop:8}}>
                        <div style={{fontSize:11,color:'var(--accent2)',fontWeight:600,marginBottom:4,display:'flex',alignItems:'center',gap:4}}>
                          <Brain size={11}/> AI Expansion
                        </div>
                        <p style={{fontSize:12,color:'var(--text2)',lineHeight:1.5,maxHeight:60,overflow:'hidden'}}>
                          {expandedText.substring(0,160)}{expandedText.length>160&&'…'}
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="flex-between" style={{marginTop:10}}>
                      <span className="text-sm">{new Date(idea.created_at).toLocaleDateString()}</span>
                      <button
                        className="btn btn-ghost"
                        style={{padding:'3px 10px',fontSize:11}}
                        onClick={()=>expand(idea.id)}
                        disabled={expanding===idea.id}
                      >
                        <Zap size={11}/> {expanding===idea.id?'Thinking...':'Expand with AI'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>

      {/* ── NEW IDEA MODAL ── */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-header">
              <div className="modal-title">Capture Idea</div>
              <button className="btn-icon" onClick={()=>setModal(false)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <div className="form-row"><label className="form-label">Title *</label>
                <input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="What's the idea?" autoFocus/>
              </div>
              <div className="form-row"><label className="form-label">Details</label>
                <textarea rows={5} value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} placeholder="Any initial thoughts, context, or notes..."/>
              </div>
              <div className="form-row"><label className="form-label">Category</label>
                <select value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  {['general','product','content','business','research','personal','imported'].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex" style={{gap:10,justifyContent:'flex-end'}}>
                <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save}>Save Idea</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT MODAL ── */}
      {editModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setEditModal(null)}>
          <div className="modal" style={{maxWidth:560}}>
            <div className="modal-header">
              <div className="modal-title">Edit Idea</div>
              <button className="btn-icon" onClick={()=>setEditModal(null)}><X size={16}/></button>
            </div>
            <div className="modal-body">
              <div className="form-row"><label className="form-label">Title *</label>
                <input value={editForm.title} onChange={e=>setEditForm(f=>({...f,title:e.target.value}))} autoFocus/>
              </div>
              <div className="form-row"><label className="form-label">Details</label>
                <textarea rows={8} value={editForm.body} onChange={e=>setEditForm(f=>({...f,body:e.target.value}))}/>
              </div>
              <div className="form-row"><label className="form-label">Category</label>
                <select value={editForm.category} onChange={e=>setEditForm(f=>({...f,category:e.target.value}))}>
                  {['general','product','content','business','research','personal','imported'].map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex" style={{gap:10,justifyContent:'flex-end'}}>
                <button className="btn btn-ghost" onClick={()=>setEditModal(null)}>Cancel</button>
                <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FULL VIEW MODAL ── */}
      {viewModal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setViewModal(null)}>
          <div className="modal" style={{maxWidth:680, maxHeight:'85vh', display:'flex', flexDirection:'column'}}>
            <div className="modal-header" style={{flexShrink:0}}>
              <div style={{flex:1}}>
                <div className="modal-title">{viewModal.title}</div>
                <span className={`badge badge-${catColor[viewModal.category]||'gray'}`} style={{marginTop:4,display:'inline-block'}}>{viewModal.category}</span>
              </div>
              <div className="flex-center gap-8">
                <button className="btn btn-ghost" style={{padding:'5px 12px',fontSize:12}} onClick={()=>openEdit(viewModal)}>
                  ✏️ Edit
                </button>
                <button className="btn btn-ghost" style={{padding:'5px 12px',fontSize:12}} onClick={()=>{ expand(viewModal.id); }} disabled={expanding===viewModal.id}>
                  <Zap size={12}/> {expanding===viewModal.id?'Thinking...':'Expand'}
                </button>
                <button className="btn-icon" onClick={()=>del(viewModal.id)} title="Delete"><Trash2 size={14}/></button>
                <button className="btn-icon" onClick={()=>setViewModal(null)}><X size={16}/></button>
              </div>
            </div>
            <div className="modal-body" style={{overflow:'auto', flex:1}}>
              {/* Body */}
              {viewModal.body && (
                <div style={{marginBottom:20}}>
                  <div style={{fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:1,marginBottom:8}}>Notes</div>
                  <div style={{fontSize:14,color:'var(--text)',lineHeight:1.75,whiteSpace:'pre-wrap'}}>{viewModal.body}</div>
                </div>
              )}

              {/* AI Expansion */}
              {(expanded[viewModal.id]?.expanded || viewModal.expanded) && (
                <div style={{borderTop:'1px solid var(--border)',paddingTop:16,marginTop:16}}>
                  <div style={{fontSize:11,color:'var(--accent2)',textTransform:'uppercase',letterSpacing:1,marginBottom:10,display:'flex',alignItems:'center',gap:6}}>
                    <Brain size={12}/> AI Expansion
                  </div>
                  <div style={{fontSize:14,color:'var(--text2)',lineHeight:1.8,marginBottom:14}}>
                    {expanded[viewModal.id]?.expanded || viewModal.expanded}
                  </div>
                  {(expanded[viewModal.id]?.first_step) && (
                    <div style={{background:'var(--accent-bg)',border:'1px solid rgba(108,99,255,0.2)',borderRadius:'var(--radius-sm)',padding:'10px 14px',fontSize:13}}>
                      <strong style={{color:'var(--accent2)'}}>First step:</strong>{' '}
                      <span style={{color:'var(--text2)'}}>{expanded[viewModal.id].first_step}</span>
                    </div>
                  )}
                </div>
              )}

              <div style={{marginTop:16,fontSize:12,color:'var(--text3)'}}>
                Created {new Date(viewModal.created_at).toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KNOWLEDGE BASE (with .md drag-drop + persistent KB files) ────────────────
export function Knowledge({ toast }) {
  const [items, setItems] = useState([]);
  const [kbFiles, setKbFiles] = useState([]);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title:'', content:'', tags:'', source:'' });
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState('files'); // 'files' | 'entries'
  const fileRef = useRef(null);
  const dropRef = useRef(null);

  const load = () => api.get(`/knowledge${query ? `?q=${encodeURIComponent(query)}` : ''}`).then(setItems);
  const loadKBFiles = async () => {
    try {
      const r = await fetch(`${KB_API}/api/knowledge-files`);
      if (r.ok) setKbFiles(await r.json());
    } catch {}
  };

  const [refreshKey, setRefreshKey] = useState(0);
  useEffect(() => { load(); }, [query, refreshKey]);
  useEffect(() => { loadKBFiles(); }, [refreshKey]);

  const save = async () => {
    if (!form.title) return;
    try {
      const tags = form.tags.split(',').map(t=>t.trim()).filter(Boolean);
      await api.post('/knowledge', { ...form, tags });
      toast('Saved to knowledge base');
      setModal(false);
      setForm({ title:'', content:'', tags:'', source:'' });
      setRefreshKey(k => k + 1);
    } catch (err) { toast('Save failed: ' + err.message, 'error'); }
  };

  const del = async (id) => { await api.del(`/knowledge/${id}`); toast('Deleted', 'error'); setRefreshKey(k => k + 1); };

  const deleteKBFile = async (id) => {
    await fetch(`${KB_API}/api/knowledge-files/${id}`, { method:'DELETE' });
    toast('File removed'); loadKBFiles();
  };

  // Upload files to persistent KB on server
  const uploadFiles = async (files) => {
    setUploading(true);
    const form = new FormData();
    files.forEach(f => form.append('files', f));
    try {
      const r = await fetch(`${KB_API}/api/knowledge-files/upload`, { method:'POST', body:form });
      if (r.ok) { const d = await r.json(); toast(`Uploaded ${d.count} file${d.count>1?'s':''} to knowledge base`); setRefreshKey(k => k + 1); }
      else toast('Upload failed', 'error');
    } catch(e) { toast('Upload error: ' + e.message, 'error'); }
    setUploading(false);
  };

  const onDrop = useCallback((e) => {
    e.preventDefault(); setIsDragging(false);
    uploadFiles(Array.from(e.dataTransfer.files));
  }, []);

  const tabBtn = (id, label) => (
    <button onClick={()=>setActiveTab(id)} style={{
      background:activeTab===id?'var(--teal-bg)':'transparent',
      border:'none', borderBottom:`2px solid ${activeTab===id?'var(--teal)':'transparent'}`,
      padding:'8px 16px', cursor:'pointer', color:activeTab===id?'var(--teal)':'var(--text2)',
      fontSize:13, fontWeight:600, fontFamily:'inherit', transition:'all .15s',
    }}>{label}</button>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Knowledge Base</div>
          <div className="page-sub">{kbFiles.length} files · {items.length} entries · Used in Boardroom</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-teal" onClick={()=>fileRef.current?.click()} disabled={uploading}>
            <Upload size={13}/> {uploading?'Uploading...':'Upload Files'}
          </button>
          <input ref={fileRef} type="file" multiple accept=".md,.txt,.csv,.json,.pdf,.docx,.xlsx" style={{display:'none'}} onChange={e=>uploadFiles(Array.from(e.target.files))}/>
          <button className="btn btn-primary" onClick={()=>setModal(true)}><Plus size={14}/> Add Entry</button>
        </div>
      </div>

      <div className="page-body">
        {/* Tabs */}
        <div style={{borderBottom:'1px solid var(--border)',marginBottom:20,display:'flex',gap:0}}>
          {tabBtn('files', `📄 Knowledge Files (${kbFiles.length})`)}
          {tabBtn('entries', `📝 Text Entries (${items.length})`)}
        </div>

        {activeTab === 'files' && (
          <div>
            {/* Drop zone */}
            <div
              ref={dropRef}
              onDragOver={e=>{e.preventDefault();setIsDragging(true);}}
              onDragLeave={e=>{if(!dropRef.current?.contains(e.relatedTarget))setIsDragging(false);}}
              onDrop={onDrop}
              onClick={()=>fileRef.current?.click()}
              style={{
                border:`2px dashed ${isDragging?'var(--teal)':'var(--border)'}`,
                borderRadius:'var(--radius)', padding:'28px',
                textAlign:'center', cursor:'pointer', marginBottom:20,
                background:isDragging?'var(--teal-bg)':'transparent',
                transition:'all .2s',
              }}
            >
              <Database size={28} style={{margin:'0 auto 10px',display:'block',color:isDragging?'var(--teal)':'var(--text3)',opacity:.5}}/>
              <div style={{fontSize:14,fontWeight:600,color:isDragging?'var(--teal)':'var(--text2)',marginBottom:4}}>
                {isDragging?'Drop files here':'Drag and drop company files here'}
              </div>
              <div style={{fontSize:12,color:'var(--text3)'}}>PDF · Excel · Word · CSV · Markdown · TXT · JSON</div>
              <div style={{fontSize:11,color:'var(--teal)',marginTop:6}}>✓ Saved permanently to server · Available in Boardroom</div>
            </div>

            {kbFiles.length === 0 ? (
              <div className="empty"><div className="empty-icon">📂</div><div className="empty-title">No files uploaded yet</div><div className="empty-sub">Upload your company documents, reports, and data files above</div></div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))',gap:12}}>
                {kbFiles.map(f=>(
                  <div key={f.id} className="card" style={{display:'flex',alignItems:'flex-start',gap:12,padding:'14px 16px'}}>
                    <FileText size={20} style={{color:'var(--teal)',flexShrink:0,marginTop:2}}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600,color:'var(--text)',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{f.original_name}</div>
                      <div style={{fontSize:11,color:'var(--text3)'}}>{(f.size/1024).toFixed(1)} KB · {new Date(f.created_at).toLocaleDateString()}</div>
                      <div style={{fontSize:10,color:'var(--teal)',marginTop:4,fontFamily:'var(--mono)'}}>✓ In boardroom KB</div>
                    </div>
                    <button className="btn-icon" onClick={()=>deleteKBFile(f.id)} style={{flexShrink:0}}><Trash2 size={13}/></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'entries' && (
          <div>
            <div className="flex-center gap-12 mb-24" style={{position:'relative'}}>
              <Search size={15} style={{position:'absolute',left:12,color:'var(--text3)'}}/>
              <input style={{paddingLeft:36}} placeholder="Search entries..." value={query} onChange={e=>setQuery(e.target.value)}/>
            </div>
            {items.length === 0
              ? <div className="empty"><div className="empty-icon">📚</div><div className="empty-title">{query?'No results':'No entries yet'}</div><div className="empty-sub">Add text entries or use the Files tab to upload documents</div></div>
              : <div className="grid grid-auto" style={{gap:14}}>
                  {items.map(item=>{
                    const tags = JSON.parse(item.tags||'[]');
                    return (
                      <div key={item.id} className="card">
                        <div className="flex-between mb-8">
                          <div className="fw-600" style={{fontSize:14}}>{item.title}</div>
                          <button className="btn-icon" onClick={()=>del(item.id)}><Trash2 size={13}/></button>
                        </div>
                        <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.6,marginBottom:10}}>{item.content?.slice(0,200)}{item.content?.length>200?'…':''}</div>
                        {tags.length>0&&<div className="flex-center gap-6 mb-8" style={{flexWrap:'wrap'}}>{tags.map(t=><span key={t} className="badge badge-gray">{t}</span>)}</div>}
                        {item.source&&<div className="text-sm">Source: {item.source}</div>}
                        <div className="text-sm" style={{marginTop:6}}>{new Date(item.created_at).toLocaleDateString()}</div>
                      </div>
                    );
                  })}
                </div>
            }
          </div>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&setModal(false)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Add Knowledge Entry</div><button className="btn-icon" onClick={()=>setModal(false)}><X size={16}/></button></div>
            <div className="modal-body">
              <div className="form-row"><label className="form-label">Title *</label><input value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Name this entry" autoFocus/></div>
              <div className="form-row"><label className="form-label">Content</label><textarea rows={6} value={form.content} onChange={e=>setForm(f=>({...f,content:e.target.value}))} placeholder="Paste notes, research, documentation..."/></div>
              <div className="form-row"><label className="form-label">Tags (comma separated)</label><input value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="ai, research, finance..."/></div>
              <div className="form-row"><label className="form-label">Source URL</label><input value={form.source} onChange={e=>setForm(f=>({...f,source:e.target.value}))} placeholder="https://..."/></div>
              <div className="flex" style={{gap:10,justifyContent:'flex-end'}}>
                <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
export function Brief({ toast }) {
  const [brief, setBrief] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async (force = false) => {
    setLoading(true);
    try {
      const r = await api.get(force ? '/brief/today?refresh=1' : '/brief/today');
      setBrief(r);
    } catch { toast('Failed to load brief', 'error'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Today's Brief</div><div className="page-sub">AI-generated morning summary</div></div>
        <button className="btn btn-ghost" onClick={() => load(true)} disabled={loading}><RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh</button>
      </div>
      <div className="page-body">
        {loading ? (
          <div className="ai-thinking" style={{ padding: 40 }}><div className="dots"><span /><span /><span /></div> AI is generating your brief...</div>
        ) : brief?.error ? (
          <div className="card"><div className="empty"><div className="empty-title">No AI provider configured</div><div className="empty-sub">Add ANTHROPIC_API_KEY to your .env or start Ollama to generate briefs</div></div></div>
        ) : brief ? (
          <div className="grid" style={{ gap: 16, maxWidth: 720 }}>
            <div className="card" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)' }}>
              <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>{brief.greeting}</div>
              <div style={{ fontSize: 15, color: 'var(--accent)' }}>{brief.focus}</div>
            </div>
            {brief.priorities?.length > 0 && (
              <div className="card">
                <div className="card-title mb-12">Today's Priorities</div>
                {brief.priorities.map((p, i) => (
                  <div key={i} className="flex-center gap-12 mb-8">
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent)', minWidth: 20 }}>0{i + 1}</span>
                    <span style={{ fontSize: 14 }}>{p}</span>
                  </div>
                ))}
              </div>
            )}
            {brief.warnings?.length > 0 && (
              <div className="card" style={{ border: '1px solid var(--yellow)' }}>
                <div className="card-title mb-12" style={{ color: 'var(--yellow)' }}>⚠ Warnings</div>
                {brief.warnings.map((w, i) => <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>{w}</div>)}
              </div>
            )}
            {brief.content_ready?.length > 0 && (
              <div className="card">
                <div className="card-title mb-12">Content Ready to Publish</div>
                {brief.content_ready.map((c, i) => <div key={i} style={{ fontSize: 13, marginBottom: 6 }}>✓ {c}</div>)}
              </div>
            )}
            {brief.quote && (
              <div className="card" style={{ background: 'var(--bg3)' }}>
                <div style={{ fontSize: 14, fontStyle: 'italic', color: 'var(--text2)' }}>"{brief.quote}"</div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── AI INSIGHTS ──────────────────────────────────────────────────────────────

export function Insights({ toast }) {
  const [insights,  setInsights]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [aiStatus,  setAiStatus]  = useState(null);
  const [error,     setError]     = useState('');

  const load = () => api.get('/insights').then(setInsights).catch(() => {});

  useEffect(() => {
    load();
    // Check AI status on mount
    api.get('/ai/status').then(setAiStatus).catch(() => {});
  }, []);

  const generate = async () => {
    setLoading(true); setError('');
    try {
      await api.post('/insights/generate', {});
      toast('Fresh insights generated!');
      load();
    } catch (e) {
      const msg = e.message || 'Generation failed';
      setError(msg);
      toast('Generation failed — check AI connection', 'error');
    } finally {
      setLoading(false);
    }
  };

  const typeColor = { opportunity:'green', risk:'red', action:'accent', content:'blue', branding:'yellow' };

  const ollamaOk  = aiStatus?.ollama;
  const claudeOk  = aiStatus?.claude;
  const noAI      = aiStatus && !ollamaOk && !claudeOk;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">AI Insights</div>
          <div className="page-sub">Proactive analysis of your projects, tasks, and content</div>
        </div>
        <button className="btn btn-primary" onClick={generate} disabled={loading || noAI}>
          <Brain size={14} style={loading?{animation:'spin 1s linear infinite'}:{}} />
          {loading ? 'Analyzing...' : 'Generate Insights'}
        </button>
      </div>

      <div className="page-body">

        {/* AI Status banner */}
        {aiStatus && (
          <div className="card mb-16" style={{
            borderLeft: `3px solid ${ollamaOk || claudeOk ? 'var(--green)' : 'var(--red)'}`,
            padding: '12px 16px', marginBottom: 20,
          }}>
            <div style={{ fontSize:12, fontWeight:600, marginBottom:6, color:'var(--text2)', textTransform:'uppercase', letterSpacing:1 }}>AI Connection</div>
            <div style={{ display:'flex', gap:16, flexWrap:'wrap' }}>
              <span style={{ fontSize:13, color: ollamaOk ? 'var(--green)' : 'var(--red)' }}>
                {ollamaOk ? '✓' : '✗'} Ollama
                {ollamaOk && aiStatus.ollamaModels?.length > 0 && (
                  <span style={{ color:'var(--text3)', marginLeft:6, fontFamily:'var(--mono)', fontSize:11 }}>
                    ({aiStatus.ollamaModels.join(', ')})
                  </span>
                )}
              </span>
              <span style={{ fontSize:13, color: claudeOk ? 'var(--green)' : 'var(--text3)' }}>
                {claudeOk ? '✓' : '○'} Claude API {claudeOk ? '(connected)' : '(no key)'}
              </span>
            </div>
            {noAI && (
              <div style={{ marginTop:10, fontSize:13, color:'var(--yellow)', padding:'8px 12px', background:'var(--yellow-bg)', borderRadius:'var(--radius-sm)' }}>
                ⚠ Ollama is not reachable from the backend container.<br/>
                <strong>Fix:</strong> On your Ubuntu server run: <code style={{fontFamily:'var(--mono)', background:'var(--bg3)', padding:'1px 6px', borderRadius:3}}>ollama serve</code><br/>
                Then check: <code style={{fontFamily:'var(--mono)', background:'var(--bg3)', padding:'1px 6px', borderRadius:3}}>docker logs eva-backend</code> for the actual error.
              </div>
            )}
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ marginBottom:16, padding:'10px 14px', background:'var(--red-bg)', border:'1px solid var(--red)', borderRadius:'var(--radius-sm)', fontSize:13, color:'var(--red)' }}>
            ✗ {error}
          </div>
        )}

        {loading && (
          <div className="ai-thinking mb-24">
            <div className="dots"><span/><span/><span/></div>
            AI is analyzing your projects, tasks, and content...
          </div>
        )}

        {insights.length === 0 && !loading ? (
          <div className="empty">
            <div className="empty-icon">🧠</div>
            <div className="empty-title">No insights yet</div>
            <div className="empty-sub">
              {noAI
                ? 'Fix the Ollama connection above, then click Generate Insights'
                : 'Click "Generate Insights" to get proactive AI analysis of your workspace'}
            </div>
          </div>
        ) : (
          <div className="grid grid-auto" style={{ gap:14 }}>
            {insights.map(ins => (
              <div key={ins.id} className="card">
                <div className="flex-between mb-10">
                  <div className="flex-center gap-8">
                    <span className={`badge badge-${typeColor[ins.type] || 'gray'}`}>{ins.type}</span>
                    <span className={`badge badge-${ins.priority==='high'?'red':ins.priority==='medium'?'yellow':'green'}`}>{ins.priority}</span>
                  </div>
                  <div className="text-sm">{new Date(ins.created_at).toLocaleDateString()}</div>
                </div>
                <div className="fw-600 mb-8" style={{ fontSize:14 }}>{ins.title}</div>
                <div style={{ fontSize:13, color:'var(--text2)', lineHeight:1.65 }}>{ins.body}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SETTINGS ─────────────────────────────────────────────────────────────────

export function Settings({ toast }) {
  const [settings, setSettings] = useState({});
  const [aiStatus, setAiStatus] = useState(null);

  useEffect(() => {
    api.get('/settings').then(setSettings);
    api.get('/ai/status').then(setAiStatus);
  }, []);

  const save = async () => {
    await api.put('/settings', settings);
    toast('Settings saved');
  };

  return (
    <div>
      <div className="page-header"><div className="page-title">Settings</div></div>
      <div className="page-body" style={{ maxWidth: 600 }}>

        {aiStatus && (
          <div className="card mb-24">
            <div className="card-title mb-14">AI Provider Status</div>
            <div className="flex-center gap-12 mb-8">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: aiStatus.claude ? 'var(--green)' : 'var(--red)' }} />
              <span style={{ fontSize: 14 }}>Claude API (Anthropic)</span>
              <span className={`badge badge-${aiStatus.claude ? 'green' : 'red'}`}>{aiStatus.claude ? 'Connected' : 'No API key'}</span>
            </div>
            <div className="flex-center gap-12">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: aiStatus.ollama ? 'var(--green)' : 'var(--text3)' }} />
              <span style={{ fontSize: 14 }}>Ollama (Local)</span>
              <span className={`badge badge-${aiStatus.ollama ? 'green' : 'gray'}`}>{aiStatus.ollama ? 'Running' : 'Not detected'}</span>
            </div>
            <div style={{ marginTop: 14, fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
              Active: {aiStatus.claude ? 'Claude API' : aiStatus.ollama ? 'Ollama' : 'Mock (no AI configured)'}
            </div>
          </div>
        )}

        <div className="card mb-24">
          <div className="card-title mb-14">Setup Guide</div>
          <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.8 }}>
            <p className="mb-8"><strong>Option A — Claude API (Recommended):</strong></p>
            <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 12, marginBottom: 12 }}>
              # Add to your .env file<br />
              ANTHROPIC_API_KEY=sk-ant-your-key-here
            </div>
            <p className="mb-8"><strong>Option B — Local Ollama (Free, private):</strong></p>
            <div style={{ background: 'var(--bg3)', borderRadius: 6, padding: '10px 14px', fontFamily: 'var(--mono)', fontSize: 12 }}>
              # Install Ollama from ollama.com<br />
              ollama pull llama3<br />
              # Then restart EVA
            </div>
          </div>
        </div>

        <div className="card mb-24">
          <div className="card-title mb-14">Preferences</div>
          <div className="form-row"><label className="form-label">Your Name / Brand</label><input value={settings.name || ''} onChange={e => setSettings(s => ({ ...s, name: e.target.value }))} placeholder="Sunny Rabius" /></div>
          <div className="form-row"><label className="form-label">Primary Industry / Focus</label><input value={settings.industry || ''} onChange={e => setSettings(s => ({ ...s, industry: e.target.value }))} placeholder="AI, EdTech, SaaS..." /></div>
          <div className="form-row"><label className="form-label">Content Voice / Style</label><textarea value={settings.voice || ''} onChange={e => setSettings(s => ({ ...s, voice: e.target.value }))} placeholder="Describe your writing style for AI to follow..." /></div>
          <button className="btn btn-primary" onClick={save}>Save Preferences</button>
        </div>
      </div>
    </div>
  );
}
