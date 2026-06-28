import { useEffect, useState } from 'react';
import { api } from '../utils/api.js';
import { Sparkles, Trash2, Check, Archive, X, Copy, RefreshCw, Search } from 'lucide-react';

const PLATFORMS = ['linkedin', 'facebook', 'twitter'];
const ANGLES = ['Educational','Founder Story','Personal Branding','Product Update','Technical','Case Study','Behind the Scenes','Lessons Learned','Business Insight','Marketing','Industry Trend','Opinion','Announcement'];
const STATUS_COLORS = { ready: 'green', scheduled: 'blue', posted: 'gray', skipped: 'yellow', archived: 'gray' };

function GenerateModal({ open, onClose, onGenerate }) {
  const [platform, setPlatform] = useState('linkedin');
  const [angle, setAngle] = useState('');
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  if (!open) return null;
  const go = async () => {
    setLoading(true);
    await onGenerate({ platform, angle, topic });
    setLoading(false); onClose();
  };
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">Generate Content</div>
          <button className="btn-icon" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <label className="form-label">Platform</label>
            <div className="flex-center gap-8">
              {PLATFORMS.map(p => <button key={p} className={`btn btn-sm ${platform === p ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setPlatform(p)}>{p}</button>)}
            </div>
          </div>
          <div className="form-row">
            <label className="form-label">Angle (leave empty = AI picks)</label>
            <select value={angle} onChange={e => setAngle(e.target.value)}>
              <option value="">AI picks the best angle</option>
              {ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div className="form-row">
            <label className="form-label">Topic hint (optional)</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="e.g. self-hosted AI, EVA project, Bangladesh tech scene..." />
          </div>
          <div className="flex" style={{ gap: 10, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-primary" onClick={go} disabled={loading}>
              <Sparkles size={14} /> {loading ? 'AI is writing... (may take 30s)' : 'Generate'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentCard({ item, onStatus, onDelete, toast }) {
  const [expanded, setExpanded] = useState(false);
  const hashtags = JSON.parse(item.hashtags || '[]');
  const copy = () => {
    const text = `${item.content}\n\n${hashtags.map(h => `#${h}`).join(' ')}`;
    navigator.clipboard.writeText(text);
    toast('Copied to clipboard!');
  };
  const platformColor = { linkedin: 'blue', facebook: 'accent', twitter: 'gray' };
  return (
    <div className="card">
      <div className="flex-between mb-8">
        <div className="flex-center gap-8">
          <span className={`badge badge-${platformColor[item.platform] || 'gray'}`}>{item.platform}</span>
          <span className="badge badge-purple">{item.angle}</span>
          <span className={`badge badge-${STATUS_COLORS[item.status] || 'gray'}`}>{item.status}</span>
        </div>
        <div className="flex-center gap-8">
          <button className="btn-icon" title="Copy" onClick={copy}><Copy size={13} /></button>
          <button className="btn-icon" title="Delete" onClick={() => onDelete(item.id)}><Trash2 size={13} /></button>
        </div>
      </div>
      {item.title && <div className="fw-500 mb-8" style={{ fontSize: 13 }}>{item.title}</div>}
      <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {expanded ? item.content : item.content?.slice(0, 220)}
        {!expanded && item.content?.length > 220 && <button onClick={() => setExpanded(true)} style={{ background: 'none', border: 'none', color: 'var(--accent2)', cursor: 'pointer', fontSize: 12 }}> ...more</button>}
        {expanded && <button onClick={() => setExpanded(false)} style={{ background: 'none', border: 'none', color: 'var(--accent2)', cursor: 'pointer', fontSize: 12 }}> less</button>}
      </div>
      {hashtags.length > 0 && (
        <div className="flex-center gap-6 mt-8" style={{ flexWrap: 'wrap' }}>
          {hashtags.map(h => <span key={h} style={{ fontSize: 11, color: 'var(--accent2)' }}>#{h}</span>)}
        </div>
      )}
      {item.cta && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6, fontStyle: 'italic' }}>{item.cta}</div>}
      {item.status === 'ready' && (
        <div className="flex-center gap-8 mt-12">
          <button className="btn btn-sm" style={{ background: 'var(--green-bg)', color: 'var(--green)', border: 'none' }} onClick={() => onStatus(item.id, 'posted')}>
            <Check size={12} /> Mark Posted
          </button>
          <button className="btn btn-ghost btn-sm" onClick={() => onStatus(item.id, 'skipped')}>Skip</button>
          <button className="btn btn-ghost btn-sm" onClick={() => onStatus(item.id, 'archived')}><Archive size={12} /></button>
        </div>
      )}
    </div>
  );
}

export function Content({ toast }) {
  const [items, setItems] = useState([]);
  const [modal, setModal] = useState(false);
  const [filter, setFilter] = useState('ready');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [autofilling, setAutofilling] = useState(false);

  const load = () => api.get('/content').then(setItems);
  useEffect(() => { load(); }, []);

  const generate = async (opts) => {
    setLoading(true);
    try {
      await api.post('/content/generate', opts);
      toast('Content generated!');
      load();
    } catch (e) {
      toast('Generation failed — check AI provider in Settings', 'error');
    } finally { setLoading(false); }
  };

  const autofill = async () => {
    setAutofilling(true);
    toast('EVA is filling your queue with 10 posts... this takes a few minutes');
    try {
      await api.post('/content/autofill', {});
      setTimeout(() => { load(); setAutofilling(false); }, 30000);
      setTimeout(() => load(), 60000);
      setTimeout(() => load(), 90000);
    } catch { setAutofilling(false); }
  };

  const setStatus = async (id, status) => {
    await api.put(`/content/${id}`, { status });
    toast(status === 'posted' ? '✓ Marked as posted' : 'Updated');
    load();
  };

  const del = async (id) => { await api.del(`/content/${id}`); load(); };

  const statusTabs = ['ready', 'posted', 'skipped', 'archived', 'all'];
  let displayed = filter === 'all' ? items : items.filter(i => i.status === filter);
  if (search) displayed = displayed.filter(i =>
    i.title?.toLowerCase().includes(search.toLowerCase()) ||
    i.content?.toLowerCase().includes(search.toLowerCase()) ||
    i.angle?.toLowerCase().includes(search.toLowerCase()) ||
    i.platform?.toLowerCase().includes(search.toLowerCase())
  );
  const counts = {};
  statusTabs.forEach(s => counts[s] = s === 'all' ? items.length : items.filter(i => i.status === s).length);
  const readyCount = counts['ready'] || 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Content Queue</div>
          <div className="page-sub">{readyCount} ready · EVA auto-maintains 10 posts</div>
        </div>
        <div className="flex-center gap-10">
          <button className="btn btn-ghost" onClick={autofill} disabled={autofilling}>
            <RefreshCw size={14} className={autofilling ? 'spin' : ''} />
            {autofilling ? 'Filling queue...' : 'Auto-Fill to 10'}
          </button>
          <button className="btn btn-primary" onClick={() => setModal(true)}>
            <Sparkles size={14} /> Generate
          </button>
        </div>
      </div>

      <div className="page-body">
        <div className="flex-center gap-12 mb-16" style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: 12, color: 'var(--text3)' }} />
          <input style={{ paddingLeft: 36 }} placeholder="Search content..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        <div className="flex-center gap-8 mb-20" style={{ flexWrap: 'wrap' }}>
          {statusTabs.map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(s)}>
              {s} {counts[s] > 0 && <span style={{ marginLeft: 4, opacity: 0.7 }}>({counts[s]})</span>}
            </button>
          ))}
        </div>

        {loading && <div className="ai-thinking mb-16"><div className="dots"><span /><span /><span /></div> Generating content (may take 30 seconds)...</div>}

        {displayed.length === 0
          ? <div className="empty"><div className="empty-icon">✍️</div><div className="empty-title">No {filter} content</div><div className="empty-sub">Click "Auto-Fill to 10" to let EVA prepare your queue</div></div>
          : <div className="grid grid-auto" style={{ gap: 14 }}>
              {displayed.map(item => <ContentCard key={item.id} item={item} onStatus={setStatus} onDelete={del} toast={toast} />)}
            </div>
        }
      </div>
      <GenerateModal open={modal} onClose={() => setModal(false)} onGenerate={generate} />
    </div>
  );
}
