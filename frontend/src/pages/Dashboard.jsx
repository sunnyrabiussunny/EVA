import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api.js';
import { FolderKanban, CheckSquare, Lightbulb, Newspaper, Zap, ArrowRight, RefreshCw } from 'lucide-react';

function StatCard({ label, value, sub, color = 'accent', icon: Icon }) {
  return (
    <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 10,
        background: `var(--${color}-bg, var(--accent-bg))`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
      }}>
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

function ProjectCard({ project }) {
  const navigate = useNavigate();
  const priorityColor = { high: 'red', medium: 'yellow', low: 'green' }[project.priority] || 'gray';

  return (
    <div className="card" style={{ cursor: 'pointer' }} onClick={() => navigate('/projects')}>
      <div className="flex-between mb-8">
        <div className="truncate fw-500" style={{ fontSize: 14 }}>{project.title}</div>
        <span className={`badge badge-${priorityColor}`}>{project.priority}</span>
      </div>
      <div className="progress mb-8">
        <div className="progress-fill" style={{ width: `${project.progress}%` }} />
      </div>
      <div className="text-sm">{project.progress}% complete {project.deadline ? `· Due ${new Date(project.deadline).toLocaleDateString()}` : ''}</div>
    </div>
  );
}

export function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [insights, setInsights] = useState([]);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [genInsights, setGenInsights] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.get('/projects'),
      api.get('/tasks?status=todo'),
      api.get('/insights'),
      api.get('/content?status=ready'),
    ]).then(([p, t, i, c]) => {
      setProjects(p.slice(0, 4));
      setTasks(t.slice(0, 5));
      setInsights(i.slice(0, 3));
      setContent(c.slice(0, 3));
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const generateInsights = async () => {
    setGenInsights(true);
    try {
      await api.post('/insights/generate', {});
      const i = await api.get('/insights');
      setInsights(i.slice(0, 3));
    } finally { setGenInsights(false); }
  };

  const insightColor = { opportunity: 'green', risk: 'red', action: 'accent', content: 'blue', branding: 'yellow' };

  if (loading) return <div style={{ padding: 40, color: 'var(--text2)' }}>Loading...</div>;

  const activeProjects = projects.filter(p => p.status === 'active');
  const highTasks = tasks.filter(t => t.priority === 'high');

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Dashboard</div>
          <div className="page-sub">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/brief')}>
          <Zap size={14} /> Today's Brief
        </button>
      </div>

      <div className="page-body">
        {/* Stats */}
        <div className="grid grid-auto mb-24">
          <StatCard icon={FolderKanban} label="Active Projects" value={activeProjects.length} color="accent" />
          <StatCard icon={CheckSquare} label="Pending Tasks" value={tasks.length} sub={`${highTasks.length} high priority`} color="yellow" />
          <StatCard icon={Newspaper} label="Content Ready" value={content.length} sub="Ready to publish" color="green" />
          <StatCard icon={Lightbulb} label="AI Insights" value={insights.length} color="blue" />
        </div>

        <div className="grid grid-2" style={{ gap: 20 }}>
          {/* Projects */}
          <div>
            <div className="flex-between mb-12">
              <div className="card-title">Active Projects</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/projects')}>
                View all <ArrowRight size={12} />
              </button>
            </div>
            {activeProjects.length === 0
              ? <div className="card"><div className="empty"><div className="empty-title">No active projects</div></div></div>
              : <div className="grid" style={{ gap: 10 }}>
                  {activeProjects.map(p => <ProjectCard key={p.id} project={p} />)}
                </div>
            }
          </div>

          {/* Tasks */}
          <div>
            <div className="flex-between mb-12">
              <div className="card-title">Priority Tasks</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/tasks')}>
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="card">
              {tasks.length === 0
                ? <div className="empty"><div className="empty-title">No pending tasks</div></div>
                : tasks.map(t => (
                    <div key={t.id} className="list-item">
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                        background: t.priority === 'high' ? 'var(--red)' : t.priority === 'medium' ? 'var(--yellow)' : 'var(--green)'
                      }} />
                      <div className="flex-1 truncate">{t.title}</div>
                      {t.due_date && <div className="text-sm">{new Date(t.due_date).toLocaleDateString()}</div>}
                    </div>
                  ))
              }
            </div>
          </div>

          {/* AI Insights */}
          <div>
            <div className="flex-between mb-12">
              <div className="card-title">AI Insights</div>
              <button className="btn btn-ghost btn-sm" onClick={generateInsights} disabled={genInsights}>
                {genInsights ? <><span className="spin" style={{ display: 'inline-block' }}>↻</span> Thinking...</> : <><RefreshCw size={12} /> Refresh</>}
              </button>
            </div>
            {insights.length === 0
              ? <div className="card">
                  <div className="empty">
                    <div className="empty-title">No insights yet</div>
                    <div className="empty-sub">Click Refresh to generate AI analysis</div>
                  </div>
                </div>
              : <div className="grid" style={{ gap: 10 }}>
                  {insights.map(ins => (
                    <div key={ins.id} className="card card-sm">
                      <div className="flex-between mb-8">
                        <span className={`badge badge-${insightColor[ins.type] || 'gray'}`}>{ins.type}</span>
                        <span className={`badge badge-${ins.priority === 'high' ? 'red' : ins.priority === 'medium' ? 'yellow' : 'green'}`}>{ins.priority}</span>
                      </div>
                      <div className="fw-500 mb-4" style={{ fontSize: 13 }}>{ins.title}</div>
                      <div className="text-sm" style={{ color: 'var(--text2)', lineHeight: 1.5 }}>{ins.body}</div>
                    </div>
                  ))}
                </div>
            }
          </div>

          {/* Content Queue */}
          <div>
            <div className="flex-between mb-12">
              <div className="card-title">Content Ready</div>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/content')}>
                View all <ArrowRight size={12} />
              </button>
            </div>
            <div className="card">
              {content.length === 0
                ? <div className="empty"><div className="empty-title">No content ready</div><div className="empty-sub">Generate content in the Content Queue</div></div>
                : content.map(c => (
                    <div key={c.id} className="list-item">
                      <span className={`badge badge-${c.platform === 'linkedin' ? 'blue' : c.platform === 'twitter' ? 'gray' : 'green'}`}>{c.platform}</span>
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
