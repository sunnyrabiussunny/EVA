import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  Tv2, Zap, LayoutDashboard, FolderKanban, CheckSquare,
  Lightbulb, Newspaper, BookOpen, Settings, Sun, Moon, Power,
  MessageSquare, TrendingUp, Target, Layers, FolderSearch,
  BarChart2, Layout, Bot, Workflow
} from 'lucide-react';

const API = 'http://192.168.10.120:4000';

const NAV = [
  { label:'Intelligence', items:[
    { icon:Tv2,           label:'Boardroom',        path:'/',           teal:true },
    { icon:Bot,           label:'Advisor / CoS',    path:'/advisor' },
    { icon:MessageSquare, label:'Chat with Docs',   path:'/chat' },
    { icon:BarChart2,     label:'Metrics',          path:'/metrics' },
  ]},
  { label:'Strategy', items:[
    { icon:Target,        label:'Strategy AI',      path:'/strategy' },
    { icon:Layers,        label:'Insights Pipeline',path:'/pipeline' },
    { icon:Workflow,      label:'Automation Planner',path:'/automations' },
    { icon:Zap,           label:'AI Insights',      path:'/insights' },
  ]},
  { label:'Knowledge', items:[
    { icon:Layout,        label:'Board',            path:'/board' },
    { icon:BookOpen,      label:'Knowledge Base',   path:'/knowledge' },
    { icon:FolderSearch,  label:'Watch Folders',    path:'/watch' },
    { icon:Lightbulb,     label:'Idea Vault',       path:'/ideas' },
  ]},
  { label:'Workspace', items:[
    { icon:LayoutDashboard,label:'Dashboard',       path:'/dashboard' },
    { icon:FolderKanban,  label:'Projects',         path:'/projects' },
    { icon:CheckSquare,   label:'Tasks',            path:'/tasks' },
    { icon:Newspaper,     label:'Content Queue',    path:'/content' },
  ]},
];

export function Sidebar({ theme, onThemeToggle }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [aiRunning, setAiRunning] = useState(true);
  const [toggling,  setToggling]  = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('eva-ai-running');
    if (saved !== null) setAiRunning(saved === 'true');
  }, []);

  const toggleAI = async () => {
    setToggling(true);
    const next = !aiRunning;
    try {
      await fetch(`${API}/api/ai/toggle`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ running:next }),
      });
    } catch {}
    setAiRunning(next);
    localStorage.setItem('eva-ai-running', String(next));
    setToggling(false);
  };

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">E</div>
        <div>
          <div className="logo-text">E.V.A.</div>
          <div className="logo-sub">Executive Virtual Assistant</div>
        </div>
      </div>

      {NAV.map(section => (
        <div className="nav-section" key={section.label}>
          <div className="nav-label">{section.label}</div>
          {section.items.map(item => {
            const isActive = pathname === item.path;
            return (
              <button key={item.path}
                className={`nav-item ${isActive?(item.teal?'active':'active-purple'):''}`}
                onClick={() => navigate(item.path)}
              >
                <item.icon size={15}/>
                {item.label}
                {item.teal && !isActive && (
                  <span style={{marginLeft:'auto',width:6,height:6,borderRadius:'50%',background:'var(--teal)',boxShadow:'0 0 6px var(--teal)',flexShrink:0}}/>
                )}
              </button>
            );
          })}
        </div>
      ))}

      <div className="sidebar-bottom">
        <button className="nav-item" onClick={() => navigate('/settings')} style={{marginBottom:4}}>
          <Settings size={15}/> Settings
        </button>
        <button className="nav-item" onClick={onThemeToggle} style={{marginBottom:6}}>
          {theme==='dark' ? <Sun size={15}/> : <Moon size={15}/>}
          {theme==='dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
        <button onClick={toggleAI} disabled={toggling} style={{
          width:'100%', display:'flex', alignItems:'center', gap:10,
          padding:'9px 10px', borderRadius:'var(--radius-sm)',
          border:`1px solid ${aiRunning?'rgba(0,245,212,0.3)':'var(--border)'}`,
          background:aiRunning?'var(--teal-bg)':'rgba(239,68,68,0.08)',
          color:aiRunning?'var(--teal)':'var(--red)',
          cursor:'pointer', fontFamily:'inherit', transition:'all .2s',
        }}>
          <Power size={13}/>
          <div style={{flex:1,textAlign:'left'}}>
            <div style={{fontSize:12,fontWeight:600}}>{toggling?'Switching...':aiRunning?'AI: Running':'AI: Stopped'}</div>
            <div style={{fontSize:10,color:'var(--text3)',marginTop:1}}>{aiRunning?'Click to stop background tasks':'Click to resume'}</div>
          </div>
          <div style={{width:7,height:7,borderRadius:'50%',background:aiRunning?'var(--teal)':'var(--red)',boxShadow:aiRunning?'0 0 6px var(--teal)':'none',animation:aiRunning?'pulseGlow 2s ease-in-out infinite':'none',flexShrink:0}}/>
        </button>
      </div>
    </div>
  );
}
