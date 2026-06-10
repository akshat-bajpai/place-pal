import { motion } from 'framer-motion';
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import AnimatedLogo from '../components/AnimatedLogo';

export default function RegisterPage() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '', university: '', major: '', graduationYear: '' });
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});

  const handleRegister = (e) => {
    e.preventDefault();
    navigate('/dashboard');
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '100px 20px', background: 'var(--bg-color)' }}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="card" style={{ width: '100%', maxWidth: '480px', padding: '40px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <AnimatedLogo />
        </div>
        
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '24px', textAlign: 'center', letterSpacing: '-0.5px' }}>
          Create your account
        </h2>

        <form onSubmit={handleRegister}>
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Full Name</label>
              <input type="text" name="name" className="input-field" onChange={handleChange} required />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Email address</label>
              <input type="email" name="email" className="input-field" onChange={handleChange} required />
            </div>
          </div>
          <div>
            <label className="label">Password</label>
            <input type="password" name="password" className="input-field" onChange={handleChange} required minLength="6" />
          </div>

          <div style={{ margin: '24px 0', borderTop: '1px solid var(--border-light)', paddingTop: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '16px' }}>Education</h3>
            <div>
              <label className="label">University</label>
              <input type="text" name="university" className="input-field" onChange={handleChange} required />
            </div>
            <div style={{ display: 'flex', gap: '16px' }}>
              <div style={{ flex: 2 }}>
                <label className="label">Major / Degree</label>
                <input type="text" name="major" className="input-field" onChange={handleChange} required />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Grad Year</label>
                <input type="text" name="graduationYear" className="input-field" onChange={handleChange} required />
              </div>
            </div>
          </div>
          
          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            Create account
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          Already have an account? <Link to="/login" style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Log in</Link>
        </p>
      </motion.div>
    </div>
  );
}
