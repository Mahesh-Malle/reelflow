import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calendar, Video, Tag, TrendingUp, Radio, Settings, Loader2, Menu, X } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import Dashboard from './components/Dashboard';
import Planner from './components/Planner';
import Videos from './components/Videos';
import Categories from './components/Categories';
import Channels from './components/Channels';

import AdminPanel from './components/AdminPanel';
import Login from './components/Login';

const TopBar = ({ onMenuClick }) => {
  const { channels, activeChannel, setActiveChannel, setUser, user } = useApp();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <div className="top-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '1.25rem' }}>{activeChannel?.name || 'Reel Flow'}</h1>
          {!activeChannel && channels.length > 0 && (
            <p style={{ color: 'var(--primary)', fontSize: '0.8rem', marginTop: '0.1rem' }}>No channel selected</p>
          )}
        </div>
        <div className="channel-switcher">
          {channels.length > 0 ? (
            channels.map(c => (
              <button
                key={c._id}
                className={`channel-btn ${activeChannel?._id === c._id ? 'active' : ''}`}
                onClick={() => setActiveChannel(c)}
              >
                {c.name}
              </button>
            ))
          ) : (
            <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No channels</span>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', width: '100%', justifyContent: 'flex-end', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem', marginTop: '0.5rem' }} className="desktop-only-top-border">
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Logged in as</div>
          <div style={{ fontWeight: '600', fontSize: '0.9rem' }}>{user?.name || 'User'}</div>
        </div>
        <button onClick={handleLogout} className="btn" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '0.3rem 0.8rem', fontSize: '0.85rem' }}>
          Logout
        </button>
      </div>
    </div>
  );
};

const Sidebar = ({ isOpen, onClose }) => {
  const { user, hasPermission } = useApp();
  const location = useLocation();

  // Close sidebar on route change for mobile
  useEffect(() => {
    if (isOpen) onClose();
  }, [location.pathname]);

  return (
    <>
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
          <div className="logo" style={{ marginBottom: 0 }}>
            <Video size={32} />
            <span>REEL FLOW</span>
          </div>
          <button onClick={onClose} className="btn mobile-only" style={{ background: 'transparent', padding: '0.5rem' }}>
            <X size={24} />
          </button>
        </div>
        <ul className="nav-links">
          {hasPermission('VIEW_ANALYTICS') && (
            <li className="nav-item">
              <NavLink to="/" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <LayoutDashboard size={20} /> Dashboard
              </NavLink>
            </li>
          )}
          {hasPermission('VIEW_PLANNER') && (
            <li className="nav-item">
              <NavLink to="/planner" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Calendar size={20} /> Content Planner
              </NavLink>
            </li>
          )}
          {hasPermission('VIEW_ANALYTICS') && (
            <>
              <li className="nav-item">
                <NavLink to="/videos" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Video size={20} /> Video Library
                </NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/categories" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                  <Tag size={20} /> Category Master
                </NavLink>
              </li>
            </>
          )}
          {hasPermission('ADMIN') && (
            <li className="nav-item">
              <NavLink to="/channels" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Radio size={20} /> Manage Channels
              </NavLink>
            </li>
          )}
          {hasPermission('ADMIN') && (
            <li className="nav-item">
              <NavLink to="/admin" className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}>
                <Settings size={20} /> Team Access
              </NavLink>
            </li>
          )}
        </ul>
        <div className="stat-card" style={{ padding: '1rem', marginTop: 'auto' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>User Account</p>
          <p style={{ fontWeight: '600', margin: '0.2rem 0' }}>Hi, {user?.name || 'User'}!</p>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', alignItems: 'center' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)' }}></div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{user?.isAdmin ? 'Admin Access' : 'Team Access'}</span>
          </div>
        </div>
      </div>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={onClose}></div>
    </>
  );
};

const MobileHeader = ({ onMenuClick }) => {
  return (
    <div className="mobile-header">
      <div className="logo" style={{ marginBottom: 0, fontSize: '1.2rem' }}>
        <Video size={24} />
        <span>REEL FLOW</span>
      </div>
      <button onClick={onMenuClick} className="btn" style={{ background: 'transparent', padding: '0.5rem' }}>
        <Menu size={24} />
      </button>
    </div>
  );
};

const Layout = () => {
  const { user, loading, hasPermission } = useApp();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  if (!user && !loading) {
    return <Login />;
  }

  if (loading) {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a' }}>
        <div className="stat-card" style={{ textAlign: 'center' }}>
          <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Initializing workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <MobileHeader onMenuClick={() => setIsSidebarOpen(true)} />
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      <main className="main-content">
        <TopBar onMenuClick={() => setIsSidebarOpen(true)} />
        <Routes>
          <Route path="/" element={hasPermission('VIEW_ANALYTICS') ? <Dashboard /> : <Planner />} />
          <Route path="/planner" element={<Planner />} />
          <Route path="/videos" element={hasPermission('VIEW_ANALYTICS') ? <Videos /> : <Planner />} />
          <Route path="/categories" element={hasPermission('VIEW_ANALYTICS') ? <Categories /> : <Planner />} />
          <Route path="/channels" element={hasPermission('ADMIN') ? <Channels /> : <Planner />} />
          <Route path="/admin" element={hasPermission('ADMIN') ? <AdminPanel /> : <Planner />} />
        </Routes>
      </main>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <Router>
        <Layout />
      </Router>
    </AppProvider>
  );
}

export default App;

