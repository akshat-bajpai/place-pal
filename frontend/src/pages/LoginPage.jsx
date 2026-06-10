import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AnimatedLogo from '../components/AnimatedLogo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '20px', background: 'var(--bg-color)' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="card" style={{ width: '100%', maxWidth: '400px', padding: '40px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <AnimatedLogo />
        </div>
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px', textAlign: 'center', letterSpacing: '-0.5px' }}>
          Log in to your account
        </h2>

        <form onSubmit={handleLogin}>
          <div>
            <label className="label">Email address</label>
            <input type="email" placeholder="you@example.com" className="input-field" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" placeholder="••••••••" className="input-field" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          
          <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: '8px' }}>
            Sign in
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Sign up</Link>
        </p>
      </motion.div>
    </div>
  );
}
