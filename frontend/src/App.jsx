import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Sidebar } from './components/Sidebar.jsx';
import { ToastContainer } from './components/Toast.jsx';
import { useToast } from './hooks/useToast.js';
import { Dashboard } from './pages/Dashboard.jsx';
import { Projects } from './pages/Projects.jsx';
import { Content } from './pages/Content.jsx';
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/insights" element={<Insights toast={toast} />} />
            <Route path="/projects" element={<Projects toast={toast} />} />
            <Route path="/tasks" element={<Tasks toast={toast} />} />
            <Route path="/content" element={<Content toast={toast} />} />
            <Route path="/ideas" element={<Ideas toast={toast} />} />
            <Route path="/knowledge" element={<Knowledge toast={toast} />} />
            <Route path="/settings" element={<Settings toast={toast} />} />
          </Routes>
        </main>
        <ToastContainer toasts={toasts} />
      </div>
    </BrowserRouter>
  );
}
