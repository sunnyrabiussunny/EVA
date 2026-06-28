import { useEffect, useState } from 'react';
import { api } from '../utils/api.js';
import { Plus, Trash2, Brain, X, ChevronRight } from 'lucide-react';

const STATUS = ['active', 'on-hold', 'completed', 'cancelled'];
const PRIORITY = ['high', 'medium', 'low'];

function Modal({ open, onClose, onSave, initial = {} }) {
  const [form, setForm] = useState({ title: '', description: '', status: 'active', priority: 'medium', deadline: '', notes: '', ...initial });
  useEffect(() => { if (open) setForm({ title: '', description: '', status: 'active', priority: 'medium', deadline: '', notes: '', ...initial }); }, [open]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{initial.id ? 'Edit Project' : 'New Project'}</div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row"><label className="form-label">Title *</label><input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Project title" /></div>
          <div className="form-row"><label className="form-label">Description</label><textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this project about?" /></div>
          <div className="grid grid-2" style={{ gap: 12, marginBottom: 14 }}>
            <div><label className="form-label">Status</label>
              <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {STATUS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div><label className="form-label">Priority</label>
              <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITY.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <div className="form-row"><label className="form-label">Deadline</label><input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} /></div>
          <div className="form-row"><label className="form-label">Notes</label><textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any notes or context..." /></div>
          <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={() => form.title && onSave(form)}>Save Project</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnalysisPanel({ result, onClose }) {
  if (!result) return null;
  const healthColor = { good: 'green', warning: 'yellow', critical: 'red' }[result.health] || 'gray';
  return (
    <div className="card" style={{ border: `1px solid var(--${healthColor})`, marginTop: 12 }}>
      <div className="flex-between mb-12">
        <div className="flex-center gap-8">
          <Brain size={15} style={{ color: 'var(--accent2)' }} />
          <span className="fw-600" style={{ fontSize: 13 }}>AI Analysis</span>
          <span className={`badge badge-${healthColor}`}>{result.health}</span>
        </div>
        <button className="btn-icon" onClick={onClose}><X size={14} /></button>
      </div>
      <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12, lineHeight: 1.6 }}>{result.summary}</p>
      {result.next_actions?.length > 0 && (
        <div className="mb-12">
          <div className="text-sm fw-600 mb-8" style={{ color: 'var(--text)' }}>Next Actions</div>
          {result.next_actions.map((a, i) => (
            <div key={i} className="flex-center gap-8 mb-4">
              <ChevronRight size={12} style={{ color: 'var(--accent2)', flexShrink: 0 }} />
              <span style={{ fontSize: 13 }}>{a}</span>
            </div>
          ))}
        </div>
      )}
      {result.risks?.length > 0 && (
        <div>
          <div className="text-sm fw-600 mb-8" style={{ color: 'var(--red)' }}>Risks</div>
          {result.risks.map((r, i) => <div key={i} style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>⚠ {r}</div>)}
        </div>
      )}
    </div>
  );
}

export function Projects({ toast }) {
  const [projects, setProjects] = useState([]);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [analysis, setAnalysis] = useState({});
  const [analyzing, setAnalyzing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [editProgress, setEditProgress] = useState({});

  const load = () => api.get('/projects').then(setProjects);
  useEffect(() => { load(); }, []);

  const save = async (form) => {
    if (editing) {
      await api.put(`/projects/${editing.id}`, form);
      toast('Project updated');
    } else {
      await api.post('/projects', form);
      toast('Project created');
    }
    setModal(false); setEditing(null); load();
  };

  const del = async (id) => {
    if (!confirm('Delete this project?')) return;
    await api.del(`/projects/${id}`); toast('Deleted', 'error'); load();
  };

  const analyze = async (id) => {
    setAnalyzing(id);
    try {
      const r = await api.post(`/projects/${id}/analyze`, {});
      setAnalysis(a => ({ ...a, [id]: r }));
    } catch { toast('AI analysis failed', 'error'); }
    finally { setAnalyzing(null); }
  };

  const updateProgress = async (id, progress) => {
    await api.put(`/projects/${id}`, { progress: parseInt(progress) });
    load();
  };

  const filtered = filter === 'all' ? projects : projects.filter(p => p.status === filter);
  const priorityColor = { high: 'red', medium: 'yellow', low: 'green' };
  const statusColor = { active: 'green', 'on-hold': 'yellow', completed: 'blue', cancelled: 'gray' };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Projects</div>
          <div className="page-sub">{projects.length} total · {projects.filter(p => p.status === 'active').length} active</div>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModal(true); }}>
          <Plus size={14} /> New Project
        </button>
      </div>

      <div className="page-body">
        {/* Filter tabs */}
        <div className="flex-center gap-8 mb-24" style={{ flexWrap: 'wrap' }}>
          {['all', ...STATUS].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(s)}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>

        {filtered.length === 0
          ? <div className="empty"><div className="empty-icon">📁</div><div className="empty-title">No projects here</div><div className="empty-sub">Create your first project to get started</div></div>
          : <div className="grid grid-auto" style={{ gap: 14 }}>
              {filtered.map(p => (
                <div key={p.id} className="card">
                  <div className="flex-between mb-8">
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span className={`badge badge-${statusColor[p.status] || 'gray'}`}>{p.status}</span>
                      <span className={`badge badge-${priorityColor[p.priority] || 'gray'}`}>{p.priority}</span>
                    </div>
                    <div className="flex-center gap-8">
                      <button className="btn-icon" title="Edit" onClick={() => { setEditing(p); setModal(true); }}>✎</button>
                      <button className="btn-icon" title="Delete" onClick={() => del(p.id)}><Trash2 size={13} /></button>
                    </div>
                  </div>

                  <div className="fw-600 mb-4" style={{ fontSize: 15 }}>{p.title}</div>
                  {p.description && <div className="text-sm mb-12" style={{ lineHeight: 1.5 }}>{p.description.slice(0, 120)}{p.description.length > 120 ? '…' : ''}</div>}

                  <div className="mb-8">
                    <div className="flex-between mb-4">
                      <span className="text-sm">Progress</span>
                      <span className="text-mono">{p.progress}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={editProgress[p.id] ?? p.progress}
                      onChange={e => setEditProgress(ep => ({ ...ep, [p.id]: e.target.value }))}
                      onMouseUp={e => updateProgress(p.id, e.target.value)}
                      style={{ width: '100%', accentColor: 'var(--accent)', background: 'transparent', padding: 0, border: 'none' }}
                    />
                  </div>

                  {p.deadline && <div className="text-sm mb-12">📅 Due {new Date(p.deadline).toLocaleDateString()}</div>}
                  {p.notes && <div style={{ fontSize: 12, color: 'var(--text3)', fontStyle: 'italic', marginBottom: 12 }}>{p.notes.slice(0, 100)}…</div>}

                  <div className="flex-center gap-8">
                    <button className="btn btn-ghost btn-sm" onClick={() => analyze(p.id)} disabled={analyzing === p.id}>
                      <Brain size={12} /> {analyzing === p.id ? 'Analyzing...' : 'AI Analyze'}
                    </button>
                    {analysis[p.id] && <button className="btn btn-ghost btn-sm" onClick={() => setAnalysis(a => ({ ...a, [p.id]: null }))}>Hide</button>}
                  </div>

                  {analyzing === p.id && <div className="ai-thinking" style={{ marginTop: 10 }}><div className="dots"><span /><span /><span /></div> AI is analyzing...</div>}
                  {analysis[p.id] && <AnalysisPanel result={analysis[p.id]} onClose={() => setAnalysis(a => ({ ...a, [p.id]: null }))} />}
                </div>
              ))}
            </div>
        }
      </div>

      <Modal open={modal} onClose={() => { setModal(false); setEditing(null); }} onSave={save} initial={editing || {}} />
    </div>
  );
}
