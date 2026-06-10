import { Link } from 'react-router-dom';
import AnimatedLogo from './AnimatedLogo';

export default function Navbar() {
  return (
    <nav style={{ 
      position: 'fixed', top: 0, left: 0, right: 0,
      background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)',
      borderBottom: '1px solid var(--border-light)',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
      padding: '16px 5%', zIndex: 100 
    }}>
      <Link to="/" style={{ textDecoration: 'none' }}>
        <AnimatedLogo />
      </Link>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
        <Link to="/login" style={{ color: 'var(--text-secondary)', fontWeight: 500, textDecoration: 'none', transition: 'color 0.2s' }}>Log in</Link>
        <Link to="/register" className="btn-primary" style={{ padding: '8px 16px', borderRadius: '6px' }}>Sign up</Link>
      </div>
    </nav>
  );
}
