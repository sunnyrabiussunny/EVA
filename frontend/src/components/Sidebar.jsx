import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, CheckSquare, Lightbulb,
  Newspaper, BookOpen, Zap, Settings, Sun, Moon, Brain
} from 'lucide-react';

const NAV = [
  { label: 'Overview', items: [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: Brain, label: 'Today\'s Brief', path: '/brief' },
    { icon: Zap, label: 'AI Insights', path: '/insights' },
  ]},
  { label: 'Work', items: [
    { icon: FolderKanban, label: 'Projects', path: '/projects' },
    { icon: CheckSquare, label: 'Tasks', path: '/tasks' },
  ]},
  { label: 'Content', items: [
    { icon: Newspaper, label: 'Content Queue', path: '/content' },
    { icon: Lightbulb, label: 'Idea Vault', path: '/ideas' },
    { icon: BookOpen, label: 'Knowledge Base', path: '/knowledge' },
  ]},
];

export function Sidebar({ theme, onThemeToggle }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-mark">E</div>
        <div>
          <div className="logo-text">EVA</div>
          <div className="logo-sub">Executive Virtual Assistant</div>
        </div>
      </div>

      {NAV.map(section => (
        <div className="nav-section" key={section.label}>
          <div className="nav-label">{section.label}</div>
          {section.items.map(item => (
            <button
              key={item.path}
              className={`nav-item ${pathname === item.path ? 'active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              <item.icon size={15} />
              {item.label}
            </button>
          ))}
        </div>
      ))}

      <div className="sidebar-bottom">
        <button
          className="nav-item"
          onClick={() => navigate('/settings')}
          style={{ marginBottom: 4 }}
        >
          <Settings size={15} />Settings
        </button>
        <button className="nav-item" onClick={onThemeToggle}>
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
        </button>
      </div>
    </div>
  );
}
