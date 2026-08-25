import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.jsx';
import { ToastContainer } from './components/Toast.jsx';
import { useToast } from './hooks/useToast.js';
import { Boardroom }      from './pages/Boardroom.jsx';
import { Projects }       from './pages/Projects.jsx';
import { Content }        from './pages/Content.jsx';
import { Metrics }        from './pages/Metrics.jsx';
import { Strategy }       from './pages/Strategy.jsx';
import { NexusInsights }  from './pages/NexusInsights.jsx';
import { DocumentChat }   from './pages/DocumentChat.jsx';
import { WatchFolders }   from './pages/WatchFolders.jsx';
import { Dashboard }      from './pages/Dashboard.jsx';
import { Tasks, Ideas, Knowledge, Insights, Settings } from './pages/Pages.jsx';

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('eva-theme') || 'dark');
  const { toasts, toast } = useToast();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('eva-theme', theme);
  }, [theme]);

  return (
    <BrowserRouter>
      <div className="layout">
        <Sidebar theme={theme} onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} />
        <main className="main">
          <Routes>
            <Route path="/"              element={<Boardroom />} />
            <Route path="/boardroom"     element={<Navigate to="/" replace />} />
            <Route path="/dashboard"     element={<Dashboard />} />
            <Route path="/chat"          element={<DocumentChat toast={toast} />} />
            <Route path="/metrics"       element={<Metrics toast={toast} />} />
            <Route path="/strategy"      element={<Strategy toast={toast} />} />
            <Route path="/pipeline"      element={<NexusInsights toast={toast} />} />
            <Route path="/watch"         element={<WatchFolders toast={toast} />} />
            <Route path="/insights"      element={<Insights toast={toast} />} />
            <Route path="/projects"      element={<Projects toast={toast} />} />
            <Route path="/tasks"         element={<Tasks toast={toast} />} />
            <Route path="/content"       element={<Content toast={toast} />} />
            <Route path="/ideas"         element={<Ideas toast={toast} />} />
            <Route path="/knowledge"     element={<Knowledge toast={toast} />} />
            <Route path="/settings"      element={<Settings toast={toast} />} />
          </Routes>
        </main>
        <ToastContainer toasts={toasts} />
      </div>
    </BrowserRouter>
  );
}
