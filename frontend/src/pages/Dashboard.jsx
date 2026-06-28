import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { FolderKanban, CheckSquare, Lightbulb, Newspaper, Zap, ArrowRight, RefreshCw, Brain } from 'lucide-react';

function BriefSection({ brief, loading, onRefresh }) {
  if (loading) return (
    <div className="card mb-24" style={{ background: 'var(--accent-bg)', border: '1px solid var(--accent)' }}>
      <div className="ai-thinking"><div className="dots"><span /><span /><span /></div> EVA is preparing your daily brief...</div>
    </div>
  );
  if (!brief) return null;

  return (
    <div className="card mb-24" style={{ background: 'linear-gradient(135deg, rgba(108,99,255,0.08), rgba(139,131,255,0.04))', border: '1px solid var(--accent)', position: 'relative' }}>
      <div className="flex-between mb-16">
        <div className="flex-center gap-10">
          <Brain size={18} style={{ color: 'var(--accent2)' }} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 650 }}>{brief.greeting || 'Good morning!'}</div>
            {brief.yesterday_summary && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{brief.yesterday_summary}</div>}
          </div>
        </div>
        <button className="btn-icon" onClick={onRefresh} title="Refresh brief"><RefreshCw size={13} /></button>
      </div>

      {brief.focus && (
        <div style={{ background: 'var(--accent-bg)', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 13, color: 'var(--accent2)', fontWeight: 500 }}>
          🎯 {brief.focus}
        </div>
      )}

      <div className="grid grid-2" style={{ gap: 14 }}>
        {brief.priorities?.length > 0 && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 8 }}>Today's Priorities</div>
            {brief.priorities.slice(0, 3).map((p, i) => (
              <div key={i} className="flex-center gap-8 mb-6">
                <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent2)', minWidth: 18 }}>0{i+1}</span>
                <span style={{ fontSize: 13 }}>{p}</span>
              </div>
            ))}
          </div>
        )}
        <div>
          {brief.warnings?.length > 0 && (
            <div className="mb-10">
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--yellow)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>⚠ Warnings</div>
              {brief.warnings.map((w, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>{w}</div>)}
            </div>
          )}
          {brief.content_ready?.length > 0 && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--green)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>Content Ready</div>
              {brief.content_ready.map((c, i) => <div key={i} style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>✓ {c}</div>)}
            </div>
          )}
        </div>
      </div>

      {brief.quote && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 12, fontStyle: 'italic', color: 'var(--text3)' }}>"{brief.quote}"</div>
      )}
    </div>
  );
}

function StatCard({ label, value, sub, color = 'accent', icon: Icon }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 44, height: 44, borderRadius: 10, background: `var(--${color}-bg, var(--accent-bg))`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon size={20} style={{ color: `var(--${color === 'accent' ? 'accent2' : color})` }} />
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: -1 }}>{value}</div>
        <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 500 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text3)' }}>{sub}</div>}
      </div>
    </div>
  );
}

export function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [insights, setInsights] = useState([]);
  const [content, setContent] = useState([]);
  const [brief, setBrief] = useState(null);
  const [briefLoading, setBriefLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/projects'),
      api.get('/tasks?status=todo'),
      api.get('/insights'),
      api.get('/content?status=ready'),
    ]).then(([p, t, i, c]) => {
      setProjects(p.filter(x => x.status === 'active').slice(0, 4));
      setTasks(t.slice(0, 5));
      setInsights(i.slice(0, 3));
      setContent(c.slice(0, 3));
      setLoading(false);
    }).catch(() => setLoading(false));

    api.get('/brief/today').then(b => {
      setBrief(b);
      setBriefLoading(false);
    }).catch(() => setBriefLoading(false));
  }, []);

  const refreshBrief = () => {
    setBriefLoading(true);
    api.get('/brief/today?refresh=1').then(b => { setBrief(b); setBriefLoading(false); }).catch(() => setBriefLoading(false));
  };

  const insightColor = { opportunity: 'green', risk: 'red', action: 'accent', content: 'blue', branding: 'yellow' };

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>

      <div className="page-body">
        <BriefSection brief={brief} loading={briefLoading} onRefresh={refreshBrief} />

        <div className="grid grid-auto mb-24">
          <StatCard icon={FolderKanban} label="Active Projects" value={projects.length} color="accent" />
          <StatCard icon={CheckSquare} label="Pending Tasks" value={tasks.length} sub={`${tasks.filter(t=>t.priority==='high').length} high priority`} color="yellow" />
          <StatCard icon={Newspaper} label="Content Ready" value={content.length} sub="Ready to publish" color="green" />
          <StatCard icon={Lightbulb} label="AI Insights" value={insights.length} color="blue" />
        </div>

        <div className="grid grid-2" style={{ gap: 20 }}>
          <div>
            <div className="flex-between mb-12">
              <div className="card-title">Active Projects</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>View all <ArrowRight size={12} /></button>
            </div>
            {projects.length === 0
              ? <div className="card"><div className="empty"><div className="empty-title">No active projects</div></div></div>
              : <div className="grid" style={{ gap: 10 }}>
                  {projects.map(p => (
                    <div key={p.id} className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/projects')}>
                      <div className="flex-between mb-8">
                        <div className="truncate fw-500">{p.title}</div>
                        <span className={`badge badge-${p.priority==='high'?'red':p.priority==='medium'?'yellow':'green'}`}>{p.priority}</span>
                      </div>
                      <div className="progress"><div className="progress-fill" style={{ width: `${p.progress}%` }} /></div>
                      <div className="text-sm mt-4">{p.progress}% complete</div>
                    </div>
                  ))}
                </div>
            }
          </div>

          <div>
            <div className="flex-between mb-12">
              <div className="card-title">Priority Tasks</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>View all <ArrowRight size={12} /></button>
            </div>
            <div className="card">
              {tasks.length === 0
                ? <div className="empty"><div className="empty-title">No pending tasks</div></div>
                : tasks.map(t => (
                    <div key={t.id} className="list-item">
                      <div style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: t.priority==='high'?'var(--red)':t.priority==='medium'?'var(--yellow)':'var(--green)' }} />
                      <div className="flex-1 truncate">{t.title}</div>
                      {t.due_date && <div className="text-sm">{new Date(t.due_date).toLocaleDateString()}</div>}
                    </div>
                  ))
              }
            </div>
          </div>

          <div>
            <div className="flex-between mb-12">
              <div className="card-title">AI Insights</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/insights')}>View all <ArrowRight size={12} /></button>
            </div>
            {insights.length === 0
              ? <div className="card"><div className="empty"><div className="empty-title">No insights yet</div><div className="empty-sub">Go to AI Insights to generate</div></div></div>
              : <div className="grid" style={{ gap: 10 }}>
                  {insights.map(ins => (
                    <div key={ins.id} className="card card-sm">
                      <div className="flex-between mb-6">
                        <span className={`badge badge-${insightColor[ins.type]||'gray'}`}>{ins.type}</span>
                        <span className={`badge badge-${ins.priority==='high'?'red':ins.priority==='medium'?'yellow':'green'}`}>{ins.priority}</span>
                      </div>
                      <div className="fw-500 mb-4" style={{ fontSize: 13 }}>{ins.title}</div>
                      <div className="text-sm" style={{ lineHeight: 1.5 }}>{ins.body}</div>
                    </div>
                  ))}
                </div>
            }
          </div>

          <div>
            <div className="flex-between mb-12">
              <div className="card-title">Content Ready</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/content')}>View all <ArrowRight size={12} /></button>
            </div>
            <div className="card">
              {content.length === 0
                ? <div className="empty"><div className="empty-title">No content ready</div><div className="empty-sub">EVA is preparing content in background</div></div>
                : content.map(c => (
                    <div key={c.id} className="list-item">
                      <span className={`badge badge-${c.platform==='linkedin'?'blue':c.platform==='twitter'?'gray':'green'}`}>{c.platform}</span>
                      <div className="flex-1 truncate">{c.title || c.angle}</div>
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
