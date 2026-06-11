import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Briefcase, CheckCircle2, Clock, XCircle, X } from 'lucide-react';
import AnimatedLogo from './AnimatedLogo';

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();

  const links = [
    { name: 'Summary Board', path: '/dashboard', icon: <LayoutDashboard size={18} /> },
    { name: 'Applied', path: '/applications/applied', icon: <Briefcase size={18} /> },
    { name: 'Interviewing', path: '/applications/interviewing', icon: <Clock size={18} /> },
    { name: 'Offered', path: '/applications/offered', icon: <CheckCircle2 size={18} /> },
    { name: 'Rejected', path: '/applications/rejected', icon: <XCircle size={18} /> },
    { name: 'Resume Vault', path: '/resumes', icon: <FileText size={18} /> },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', zIndex: 100 }}
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed', top: 0, left: 0, bottom: 0, width: '280px',
              background: 'var(--surface-bg)', borderRight: '1px solid var(--border-light)',
              zIndex: 101, display: 'flex', flexDirection: 'column', padding: '24px 0'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', marginBottom: '40px' }}>
              <AnimatedLogo />
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '0 16px' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 8px', marginBottom: '8px' }}>
                Navigation
              </div>
              
              {links.map((link) => {
                const isActive = location.pathname === link.path;
                return (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={onClose}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                      borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem',
                      color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      background: isActive ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                      transition: 'all 0.2s'
                    }}
                  >
                    {link.icon}
                    {link.name}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
