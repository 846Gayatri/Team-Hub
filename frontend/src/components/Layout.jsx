import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FolderKanban, CheckSquare, Users, LogOut } from 'lucide-react';

export default function Layout() {
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/auth';
  };

  const navItems = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/projects', label: 'Projects', icon: FolderKanban },
    { path: '/tasks', label: 'My Tasks', icon: CheckSquare },
    ...(user.role === 'ADMIN' ? [{ path: '/team', label: 'Team', icon: Users }] : [])
  ];

  return (
    <div className="layout">
      <div className="sidebar">
        <h2>TeamTask</h2>
        <div style={{ marginBottom: '20px', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Welcome, {user.name} ({user.role})
        </div>
        <div className="nav-links">
          {navItems.map(item => {
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className={location.pathname === item.path ? 'active' : ''} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Icon size={18} /> {item.label}
              </Link>
            );
          })}
        </div>
        <div style={{ marginTop: 'auto' }}>
          <button onClick={handleLogout} className="btn" style={{ background: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>
      <div className="main-content">
        <Outlet />
      </div>
    </div>
  );
}
