import { motion, AnimatePresence } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, FileText, Briefcase, CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function Sidebar({ isOpen, toggleSidebar }) {
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
    <motion.div
      initial={false}
      animate={{ width: isOpen ? '280px' : '80px' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      style={{
        background: 'var(--surface-bg)',
        borderRight: '1px solid var(--border-light)',
        display: 'flex',
        flexDirection: 'column',
        padding: '24px 0',
        overflowY: 'auto',
        overflowX: 'hidden',
        flexShrink: 0,
        height: 'calc(100vh - 64px)',
        position: 'sticky',
        top: '64px'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: isOpen ? '0 16px' : '0 12px' }}>
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', padding: '0 8px', marginBottom: '8px', whiteSpace: 'nowrap' }}
            >
              Navigation
            </motion.div>
          )}
        </AnimatePresence>
        
        {links.map((link) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={link.path}
              to={link.path}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', padding: '12px',
                borderRadius: '12px', textDecoration: 'none', fontWeight: 600, fontSize: '0.95rem',
                color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                background: isActive ? 'rgba(79, 70, 229, 0.1)' : 'transparent',
                transition: 'all 0.2s',
                justifyContent: isOpen ? 'flex-start' : 'center',
                whiteSpace: 'nowrap',
                overflow: 'hidden'
              }}
              title={!isOpen ? link.name : ''}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', flexShrink: 0 }}>
                {link.icon}
              </div>
              <AnimatePresence>
                {isOpen && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}
                  >
                    {link.name}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </div>
    </motion.div>
  );
}
