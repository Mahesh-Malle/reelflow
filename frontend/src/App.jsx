import React from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Video, Tag, TrendingUp, Radio, Settings, Loader2 } from 'lucide-react';
import { AppProvider, useApp } from './context/AppContext';
import Dashboard from './components/Dashboard';
import Planner from './components/Planner';
import Videos from './components/Videos';
import Categories from './components/Categories';
import Channels from './components/Channels';

import AdminPanel from './components/AdminPanel';
import Login from './components/Login';

const TopBar = () => {
  const { channels, activeChannel, setActiveChannel, setUser, user } = useApp();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <div className="top-bar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
        <div>
          <h1>{activeChannel?.name || 'Reel Flow'}</h1>
          {!activeChannel && channels.length > 0 && (
            <p style={{ color: 'var(--primary)', fontSize: '0.9rem', marginTop: '0.25rem' }}>No channel selected. Choose one below:</p>
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
            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No channels yet</span>
          )}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Logged in as</div>
          <div style={{ fontWeight: '600' }}>Hi, {user?.name || 'User'}!</div>
        </div>
        <button onClick={handleLogout} className="btn" style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', border: '1px solid rgba(239,68,68,0.2)', padding: '0.4rem 1rem' }}>
          Logout
        </button>
      </div>
    </div>
  );
};

const Sidebar = () => {
  const { user, hasPermission } = useApp();

  return (
    <div className="sidebar">
      <div className="logo">
        <Video size={32} />
        <span>REEL FLOW</span>
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
  );
};

const Layout = () => {
  const { user, loading, hasPermission } = useApp();

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
      <Sidebar />
      <main className="main-content">
        <TopBar />
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
