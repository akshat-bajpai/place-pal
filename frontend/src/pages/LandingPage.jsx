import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import WorkflowAnimation from '../components/WorkflowAnimation';
import { ArrowRight, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { useState, useEffect } from 'react';

const words = ["internships.", "careers.", "applications.", "future."];

export default function LandingPage() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % words.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  return (
    <div style={{ paddingTop: '80px', position: 'relative', overflowX: 'hidden' }}>
      
      {/* Aurora Animated Background */}
      <div className="aurora-bg">
        <div className="aurora-blob aurora-1"></div>
        <div className="aurora-blob aurora-2"></div>
        <div className="aurora-blob aurora-3"></div>
      </div>

      <section style={{ minHeight: '85vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '0 20px', position: 'relative', zIndex: 10 }}>
        
        {/* Background Example Workflow Cards with REAL SVGs */}
        <div className="hide-on-mobile" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: -1 }}>
          
          {/* Google Card */}
          <motion.div 
            animate={{ y: [40, -20, 40] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            className="card" style={{ position: 'absolute', top: '15%', left: '8%', padding: '16px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', display: 'flex', gap: '16px', alignItems: 'center', width: '260px', textAlign: 'left', opacity: 0.9 }}
          >
            <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://www.google.com/s2/favicons?domain=google.com&sz=128" alt="Google" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Google</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>SWE Intern</div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.75rem', color: '#10b981', marginTop: '6px', fontWeight: 600 }}>
                <CheckCircle2 size={12} /> Interviewing
              </div>
            </div>
          </motion.div>

          {/* Meta Card */}
          <motion.div 
            animate={{ y: [-30, 30, -30] }}
            transition={{ duration: 7, delay: 1, repeat: Infinity, ease: "easeInOut" }}
            className="card" style={{ position: 'absolute', top: '20%', right: '8%', padding: '16px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', display: 'flex', gap: '16px', alignItems: 'center', width: '260px', textAlign: 'left', opacity: 0.9 }}
          >
            <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://www.google.com/s2/favicons?domain=meta.com&sz=128" alt="Meta" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Meta</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Frontend Eng</div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.75rem', color: '#f59e0b', marginTop: '6px', fontWeight: 600 }}>
                <Clock size={12} /> Applied
              </div>
            </div>
          </motion.div>

          {/* PayPal Card */}
          <motion.div 
            animate={{ y: [20, -40, 20] }}
            transition={{ duration: 8, delay: 2, repeat: Infinity, ease: "easeInOut" }}
            className="card" style={{ position: 'absolute', bottom: '15%', left: '10%', padding: '16px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', display: 'flex', gap: '16px', alignItems: 'center', width: '260px', textAlign: 'left', opacity: 0.9 }}
          >
            <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://www.google.com/s2/favicons?domain=paypal.com&sz=128" alt="PayPal" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>PayPal</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Backend Intern</div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.75rem', color: '#3b82f6', marginTop: '6px', fontWeight: 600 }}>
                <Clock size={12} /> Online Assessment
              </div>
            </div>
          </motion.div>

          {/* Salesforce Card (Positive state) */}
          <motion.div 
            animate={{ y: [-40, 20, -40] }}
            transition={{ duration: 6.5, delay: 0.5, repeat: Infinity, ease: "easeInOut" }}
            className="card" style={{ position: 'absolute', bottom: '20%', right: '10%', padding: '16px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', display: 'flex', gap: '16px', alignItems: 'center', width: '260px', textAlign: 'left', opacity: 0.9 }}
          >
            <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://www.google.com/s2/favicons?domain=salesforce.com&sz=128" alt="Salesforce" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Salesforce</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Product Manager</div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.75rem', color: '#8b5cf6', marginTop: '6px', fontWeight: 600 }}>
                <PlayCircle size={12} /> Final Round
              </div>
            </div>
          </motion.div>

          {/* Deloitte Card */}
          <motion.div 
            animate={{ y: [30, -30, 30] }}
            transition={{ duration: 7.5, delay: 3, repeat: Infinity, ease: "easeInOut" }}
            className="card" style={{ position: 'absolute', top: '45%', left: '2%', padding: '16px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', display: 'flex', gap: '16px', alignItems: 'center', width: '260px', textAlign: 'left', opacity: 0.8 }}
          >
            <div style={{ background: '#ffffff', padding: '8px', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src="https://www.google.com/s2/favicons?domain=deloitte.com&sz=128" alt="Deloitte" style={{ width: '24px', height: '24px', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Deloitte</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700 }}>Tech Consultant</div>
              <div style={{ display: 'flex', gap: '4px', alignItems: 'center', fontSize: '0.75rem', color: '#10b981', marginTop: '6px', fontWeight: 600 }}>
                <CheckCircle2 size={12} /> Offer Received
              </div>
            </div>
          </motion.div>

        </div>

        {/* Main Content Lens */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ duration: 0.8, ease: "easeOut" }}
          style={{ maxWidth: '800px', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(20px)', padding: '40px', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.8)', boxShadow: '0 10px 30px rgba(0,0,0,0.02)' }}
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            style={{ display: 'inline-block', padding: '6px 14px', background: 'rgba(255, 255, 255, 0.9)', border: '1px solid var(--border-light)', borderRadius: '20px', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.5px' }}
          >
            APPLICATION TRACKING OS
          </motion.div>

          <h1 style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 800, lineHeight: 1.1, marginBottom: '24px', letterSpacing: '-1.5px', color: 'var(--text-primary)' }}>
            The professional way <br/> to track your <br />
            <div style={{ height: '1.2em', position: 'relative', overflow: 'hidden', display: 'flex', justifyContent: 'center', marginTop: '8px' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={words[index]}
                  initial={{ opacity: 0, y: 40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -40 }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                  className="text-animate-gradient"
                  style={{ position: 'absolute' }}
                >
                  {words[index]}
                </motion.div>
              </AnimatePresence>
            </div>
          </h1>
          
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', margin: '0 auto 40px', lineHeight: 1.6 }}
          >
            A fast, clean, and powerful dashboard designed for ambitious students targeting top-tier tech companies.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}
          >
            <Link to="/register" className="btn-primary" style={{ padding: '14px 28px', fontSize: '1rem' }}>
              Start tracking for free <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn-secondary" style={{ padding: '14px 28px', fontSize: '1rem', background: 'rgba(255,255,255,0.7)' }}>
              View live demo
            </Link>
          </motion.div>
        </motion.div>
      </section>

      <section style={{ padding: '60px 0', borderTop: '1px solid var(--border-light)', borderBottom: '1px solid var(--border-light)', background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(20px)', position: 'relative', zIndex: 10 }}>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '32px' }}>
          Track applications for top engineering teams
        </p>
        <WorkflowAnimation />
      </section>
    </div>
  );
}
