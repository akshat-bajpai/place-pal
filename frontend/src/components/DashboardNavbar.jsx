import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { LogOut, Bell, Search, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

import AnimatedLogo from './AnimatedLogo';

export default function DashboardNavbar({ onMenuClick }) {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const notifRef = useRef();

  useEffect(() => {
    const handleJobUpdate = (e) => {
      const data = e.detail;
      const newNotif = {
        id: Date.now(),
        message: data.message,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setNotifications(prev => [newNotif, ...prev]);
    };

    window.addEventListener('job_update_received', handleJobUpdate);
    return () => window.removeEventListener('job_update_received', handleJobUpdate);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const clearNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
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
            <div style={{ position: 'relative' }} ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span style={{ position: 'absolute', top: -2, right: -2, width: '10px', height: '10px', background: 'var(--danger)', borderRadius: '50%', border: '2px solid white' }}></span>
                )}
              </button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: 'absolute',
                      top: '40px',
                      right: '-10px',
                      width: '320px',
                      background: 'white',
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                      border: '1px solid var(--border-light)',
                      overflow: 'hidden',
                      zIndex: 100
                    }}
                  >
                    <div style={{ padding: '16px', borderBottom: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Notifications</h3>
                      {notifications.length > 0 && (
                        <button onClick={clearNotifications} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', fontSize: '0.8rem', cursor: 'pointer', textDecoration: 'underline' }}>Clear All</button>
                      )}
                    </div>

                    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                      {notifications.length === 0 ? (
                        <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          <Bell size={32} style={{ opacity: 0.2, margin: '0 auto 12px' }} />
                          <p style={{ margin: 0 }}>No new notifications</p>
                        </div>
                      ) : (
                        notifications.map((notif, index) => (
                          <div key={notif.id} style={{ padding: '16px', borderBottom: index < notifications.length - 1 ? '1px solid var(--border-light)' : 'none', display: 'flex', gap: '12px', background: 'var(--surface-bg)' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--success)', marginTop: '6px', flexShrink: 0 }}></div>
                            <div>
                              <p style={{ margin: '0 0 4px 0', fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>{notif.message}</p>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{notif.time}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingLeft: '20px', borderLeft: '1px solid var(--border-light)' }}>
              <Link to="/profile" style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #F2F4F3, #A9927D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#22333B', cursor: 'pointer' }}
                >
                  {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                </motion.div>
              </Link>
              <button onClick={handleLogout} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }} title="Logout">
                <LogOut size={18} />
              </button>
            </div>
          </>
        )}
      </div>
    </nav>
  );
}
