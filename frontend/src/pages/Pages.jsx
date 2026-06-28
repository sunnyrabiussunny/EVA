import { useEffect, useState } from 'react';
import { api } from '../utils/api.js';
import { Plus, Trash2, X, Zap, Search, Brain, RefreshCw } from 'lucide-react';

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
    await api.post('/tasks', form);
    toast('Task added'); setModal(false); setForm({ title: '', priority: 'medium', due_date: '', notes: '' }); load();
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

export function Ideas({ toast }) {
  const [ideas, setIdeas] = useState([]);
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', body: '', category: 'general' });
  const [expanding, setExpanding] = useState(null);
  const [expanded, setExpanded] = useState({});

  const load = () => api.get('/ideas').then(setIdeas);
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title) return;
    await api.post('/ideas', form); toast('Idea saved!'); setModal(false); setForm({ title: '', body: '', category: 'general' }); load();
  };

  const del = async (id) => { await api.del(`/ideas/${id}`); toast('Deleted', 'error'); load(); };

  const expand = async (id) => {
    setExpanding(id);
    try {
      const r = await api.post(`/ideas/${id}/expand`, {});
      setExpanded(e => ({ ...e, [id]: r }));
      toast('Idea expanded by AI!');
    } catch { toast('AI expansion failed', 'error'); }
    finally { setExpanding(null); }
  };

  const catColor = { product: 'blue', content: 'green', business: 'yellow', research: 'purple', personal: 'gray', general: 'gray' };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Idea Vault</div><div className="page-sub">{ideas.length} ideas captured</div></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={14} /> Capture Idea</button>
      </div>
      <div className="page-body">
        {ideas.length === 0
          ? <div className="empty"><div className="empty-icon">💡</div><div className="empty-title">No ideas yet</div><div className="empty-sub">Capture your first idea before it disappears</div></div>
          : <div className="grid grid-auto" style={{ gap: 14 }}>
              {ideas.map(idea => (
                <div key={idea.id} className="card">
                  <div className="flex-between mb-8">
                    <span className={`badge badge-${catColor[idea.category] || 'gray'}`}>{idea.category}</span>
                    <div className="flex-center gap-8">
                      <button className="btn btn-ghost btn-sm" onClick={() => expand(idea.id)} disabled={expanding === idea.id}>
                        <Zap size={12} /> {expanding === idea.id ? 'AI Expanding...' : 'Expand'}
                      </button>
                      <button className="btn-icon" onClick={() => del(idea.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="fw-600 mb-4" style={{ fontSize: 14 }}>{idea.title}</div>
                  {idea.body && <div className="text-sm mb-8" style={{ lineHeight: 1.5 }}>{idea.body}</div>}
                  {(expanded[idea.id] || idea.expanded) && (
                    <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                      <div className="flex-center gap-6 mb-8">
                        <Brain size={12} style={{ color: 'var(--accent2)' }} />
                        <span style={{ fontSize: 11, color: 'var(--accent2)', fontWeight: 600 }}>AI Expansion</span>
                      </div>
                      <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10 }}>
                        {(expanded[idea.id] || {}).expanded || idea.expanded}
                      </p>
                      {(expanded[idea.id] || {}).first_step && (
                        <div style={{ background: 'var(--accent-bg)', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                          <strong>First step:</strong> {expanded[idea.id].first_step}
                        </div>
                      )}
                    </div>
                  )}
                  <div className="text-sm" style={{ marginTop: 10 }}>{new Date(idea.created_at).toLocaleDateString()}</div>
                </div>
              ))}
            </div>
        }
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Capture Idea</div><button className="btn-icon" onClick={() => setModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              <div className="form-row"><label className="form-label">Idea *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="What's the idea?" autoFocus /></div>
              <div className="form-row"><label className="form-label">Details</label><textarea value={form.body} onChange={e => setForm(f => ({ ...f, body: e.target.value }))} placeholder="Any initial thoughts..." /></div>
              <div className="form-row"><label className="form-label">Category</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {['general','product','content','business','research','personal'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save}>Save Idea</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── KNOWLEDGE BASE ───────────────────────────────────────────────────────────

export function Knowledge({ toast }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', tags: '', source: '' });

  const load = () => api.get(`/knowledge${query ? `?q=${encodeURIComponent(query)}` : ''}`).then(setItems);
  useEffect(() => { load(); }, [query]);

  const save = async () => {
    if (!form.title) return;
    const tags = form.tags.split(',').map(t => t.trim()).filter(Boolean);
    await api.post('/knowledge', { ...form, tags }); toast('Saved to knowledge base'); setModal(false); setForm({ title: '', content: '', tags: '', source: '' }); load();
  };

  const del = async (id) => { await api.del(`/knowledge/${id}`); toast('Deleted', 'error'); load(); };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Knowledge Base</div><div className="page-sub">{items.length} entries</div></div>
        <button className="btn btn-primary" onClick={() => setModal(true)}><Plus size={14} /> Add Entry</button>
      </div>
      <div className="page-body">
        <div className="flex-center gap-12 mb-24" style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, color: 'var(--text3)' }} />
          <input style={{ paddingLeft: 36 }} placeholder="Search knowledge base..." value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        {items.length === 0
          ? <div className="empty"><div className="empty-icon">📚</div><div className="empty-title">{query ? 'No results' : 'Empty knowledge base'}</div><div className="empty-sub">Store documents, notes, research, and references here</div></div>
          : <div className="grid grid-auto" style={{ gap: 14 }}>
              {items.map(item => {
                const tags = JSON.parse(item.tags || '[]');
                return (
                  <div key={item.id} className="card">
                    <div className="flex-between mb-8">
                      <div className="fw-600" style={{ fontSize: 14 }}>{item.title}</div>
                      <button className="btn-icon" onClick={() => del(item.id)}><Trash2 size={13} /></button>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 10 }}>{item.content?.slice(0, 200)}{item.content?.length > 200 ? '…' : ''}</div>
                    {tags.length > 0 && <div className="flex-center gap-6 mb-8" style={{ flexWrap: 'wrap' }}>{tags.map(t => <span key={t} className="badge badge-gray">{t}</span>)}</div>}
                    {item.source && <div className="text-sm">Source: {item.source}</div>}
                    <div className="text-sm" style={{ marginTop: 6 }}>{new Date(item.created_at).toLocaleDateString()}</div>
                  </div>
                );
              })}
            </div>
        }
      </div>

      {modal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModal(false)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Add to Knowledge Base</div><button className="btn-icon" onClick={() => setModal(false)}><X size={16} /></button></div>
            <div className="modal-body">
              <div className="form-row"><label className="form-label">Title *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Name this entry" /></div>
              <div className="form-row"><label className="form-label">Content</label><textarea rows={6} value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} placeholder="Paste notes, research, documentation..." /></div>
              <div className="form-row"><label className="form-label">Tags (comma separated)</label><input value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} placeholder="ai, research, bangladesh, ..." /></div>
              <div className="form-row"><label className="form-label">Source URL</label><input value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} placeholder="https://..." /></div>
              <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={save}>Save</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── TODAY'S BRIEF ────────────────────────────────────────────────────────────

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
              <div style={{ fontSize: 15, color: 'var(--accent2)' }}>{brief.focus}</div>
            </div>
            {brief.priorities?.length > 0 && (
              <div className="card">
                <div className="card-title mb-12">Today's Priorities</div>
                {brief.priorities.map((p, i) => (
                  <div key={i} className="flex-center gap-12 mb-8">
                    <span style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--accent2)', minWidth: 20 }}>0{i + 1}</span>
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
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  const load = () => api.get('/insights').then(setInsights);
  useEffect(() => { load(); }, []);

  const generate = async () => {
    setLoading(true);
    try {
      await api.post('/insights/generate', {});
      toast('Fresh insights generated!'); load();
    } catch { toast('Generation failed', 'error'); }
    finally { setLoading(false); }
  };

  const typeColor = { opportunity: 'green', risk: 'red', action: 'accent', content: 'blue', branding: 'yellow' };

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">AI Insights</div><div className="page-sub">Proactive analysis of your business and projects</div></div>
        <button className="btn btn-primary" onClick={generate} disabled={loading}>
          <Brain size={14} className={loading ? 'spin' : ''} /> {loading ? 'Analyzing...' : 'Generate Insights'}
        </button>
      </div>
      <div className="page-body">
        {loading && <div className="ai-thinking mb-24"><div className="dots"><span /><span /><span /></div> AI is analyzing all your projects, tasks, and content...</div>}
        {insights.length === 0 && !loading
          ? <div className="empty"><div className="empty-icon">🧠</div><div className="empty-title">No insights yet</div><div className="empty-sub">Click "Generate Insights" to get proactive AI analysis</div></div>
          : <div className="grid grid-auto" style={{ gap: 14 }}>
              {insights.map(ins => (
                <div key={ins.id} className="card">
                  <div className="flex-between mb-10">
                    <div className="flex-center gap-8">
                      <span className={`badge badge-${typeColor[ins.type] || 'gray'}`}>{ins.type}</span>
                      <span className={`badge badge-${ins.priority === 'high' ? 'red' : ins.priority === 'medium' ? 'yellow' : 'green'}`}>{ins.priority}</span>
                    </div>
                    <div className="text-sm">{new Date(ins.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="fw-600 mb-8" style={{ fontSize: 14 }}>{ins.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65 }}>{ins.body}</div>
                </div>
              ))}
            </div>
        }
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
