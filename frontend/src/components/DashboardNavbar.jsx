import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, Bell, Search, Menu } from 'lucide-react';
import { motion } from 'framer-motion';

import AnimatedLogo from './AnimatedLogo';

export default function DashboardNavbar({ onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 50,
      background: 'rgba(255, 255, 255, 0.8)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border-light)',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px'
    }}>
      {/* Left: Menu & Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        <button onClick={onMenuClick} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)', display: 'flex', alignItems: 'center' }}>
          <Menu size={24} />
        </button>
        <Link to="/" style={{ textDecoration: 'none' }}>
          <AnimatedLogo />
        </Link>
      </div>

      {/* Center: Search */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '32px', margin: '0 32px' }}>
        <div style={{ position: 'relative', width: '300px', display: 'flex', alignItems: 'center' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', color: 'var(--text-secondary)' }} />
          <input 
            type="text" 
            placeholder="Search..." 
            style={{
              width: '100%', padding: '8px 16px 8px 36px', borderRadius: '100px',
              border: '1px solid var(--border-light)', background: 'var(--bg-color)',
              fontSize: '0.9rem', outline: 'none', transition: 'all 0.2s'
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--accent-primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(79, 70, 229, 0.1)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-light)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>
      </div>

      {/* Right: Auth/User Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {!token ? (
          <>
            <Link to="/login" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontWeight: 600, fontSize: '0.9rem' }}>Log in</Link>
            <Link to="/register" className="btn-primary" style={{ padding: '8px 16px' }}>Sign up</Link>
          </>
        ) : (
          <>
            <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', position: 'relative' }}>
              <Bell size={20} />
              <span style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '8px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid white' }}></span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '20px', borderLeft: '1px solid var(--border-light)' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #e0e7ff, #c7d2fe)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
                <LogOut size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
