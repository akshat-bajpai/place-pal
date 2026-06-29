import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Calendar, User, Briefcase, FileText, Settings, Shield, Award, Link as LinkIcon, CheckCircle2 } from 'lucide-react';
import { getApplications } from '../api/applications';
import { getResumes } from '../api/resumes';
import axios from 'axios';

const ProfilePage = () => {
  const localUser = JSON.parse(localStorage.getItem('user') || '{}');
  const [user, setUser] = useState(localUser);
  const [stats, setStats] = useState({ applications: 0, resumes: 0, successRate: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if redirect from google auth with ?gmail_connected=true
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('gmail_connected') === 'true') {
        // Clear url params without reloading
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    const fetchData = async () => {
      try {
        const token = localStorage.getItem('token');
        const [apps, resumesData, profileRes] = await Promise.all([
          getApplications(),
          getResumes(),
          axios.get(`${import.meta.env.VITE_API_URL}/auth/profile`, {
              headers: { Authorization: `Bearer ${token}` }
          }).catch(() => ({ data: localUser })) // fallback
        ]);
        
        if (profileRes.data) {
            setUser({ ...localUser, ...profileRes.data });
        }

        const applied = apps.length;
        const success = apps.filter(a => a.status === 'Offered' || a.status === 'Interviewing').length;
        const rate = applied > 0 ? Math.round((success / applied) * 100) : 0;
        
        setStats({ applications: applied, resumes: resumesData.length, successRate: rate });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleConnectGmail = async () => {
    try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/auth/google/url`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.url) {
            window.location.href = res.data.url;
        }
    } catch (err) {
        console.error('Error fetching Google URL', err);
        alert('Failed to connect to Google');
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* Header Banner */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
        style={{
          background: 'linear-gradient(135deg, #A9927D, #5E503F)', // User specified colors
          borderRadius: '24px',
          height: '200px',
          position: 'relative',
          marginBottom: '80px',
          boxShadow: '0 20px 40px rgba(34, 51, 59, 0.2)'
        }}
      >
        <motion.div 
          initial={{ y: 50, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 120 }}
          style={{
            position: 'absolute',
            bottom: '-60px',
            left: '40px',
            display: 'flex',
            alignItems: 'flex-end',
            gap: '24px'
          }}
        >
          <div style={{
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            border: '4px solid white',
            fontSize: '3rem',
            fontWeight: 800,
            color: '#22333B' // Dark slate/brown
          }}>
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div style={{ paddingBottom: '10px' }}>
            <h1 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', textShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              {user.name || 'User'}
            </h1>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Briefcase size={16} /> Aspiring Professional
            </p>
          </div>
        </motion.div>
      </motion.div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '32px' }}
      >
        {/* Left Column: Personal Info */}
        <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{
            background: 'var(--surface-bg)',
            padding: '24px',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-light)'
          }}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Personal Details</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ padding: '10px', background: '#F2F4F3', borderRadius: '12px', color: '#5E503F' }}>
                  <Mail size={18} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Email</p>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 500 }}>{user.email || 'user@example.com'}</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ padding: '10px', background: '#F2F4F3', borderRadius: '12px', color: '#5E503F' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Joined</p>
                  <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 500 }}>{new Date(user.created_at || Date.now()).toLocaleDateString()}</p>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--text-secondary)' }}>
                <div style={{ padding: '10px', background: '#F2F4F3', borderRadius: '12px', color: '#5E503F' }}>
                  <Shield size={18} />
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Account Status</p>
                  <p style={{ margin: 0, color: 'var(--success)', fontWeight: 600 }}>Active</p>
                </div>
              </div>
            </div>
          </div>
          
          <button style={{
            background: 'var(--bg-color)',
            border: '1px solid var(--border-light)',
            padding: '16px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            color: 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => { e.target.style.background = 'var(--surface-bg)'; e.target.style.color = 'var(--text-primary)'; }}
          onMouseLeave={(e) => { e.target.style.background = 'var(--bg-color)'; e.target.style.color = 'var(--text-secondary)'; }}
          >
            <Settings size={18} /> Account Settings
          </button>

          {/* Integrations Section */}
          <div style={{
            background: 'var(--surface-bg)',
            padding: '24px',
            borderRadius: '20px',
            boxShadow: 'var(--shadow-sm)',
            border: '1px solid var(--border-light)'
          }}>
            <h2 style={{ fontSize: '1.2rem', margin: '0 0 20px 0', color: 'var(--text-primary)' }}>Integrations</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#F2F4F3', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5E503F' }}>
                        <Mail size={20} />
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>Gmail Tracking</p>
                        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Auto-sync application updates</p>
                    </div>
                </div>
                {user.gmail_connected ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--success)', fontWeight: 600, fontSize: '0.9rem', padding: '6px 12px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '100px' }}>
                        <CheckCircle2 size={16} /> Connected
                    </div>
                ) : (
                    <button 
                        onClick={handleConnectGmail}
                        style={{ background: 'var(--text-primary)', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '100px', fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', transition: 'opacity 0.2s' }}
                        onMouseEnter={(e) => e.target.style.opacity = '0.8'}
                        onMouseLeave={(e) => e.target.style.opacity = '1'}
                    >
                        <LinkIcon size={14} /> Connect
                    </button>
                )}
              </div>
            </div>
          </div>

        </motion.div>

        {/* Right Column: Stats & Activity */}
        <motion.div variants={itemVariants} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
              style={{
                background: 'var(--surface-bg)',
                padding: '24px',
                borderRadius: '20px',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.3s'
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#F2F4F3', color: '#5E503F', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Briefcase size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {loading ? '-' : stats.applications}
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Total Applications</p>
            </motion.div>

            <motion.div 
              whileHover={{ y: -5, boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}
              style={{
                background: 'var(--surface-bg)',
                padding: '24px',
                borderRadius: '20px',
                border: '1px solid var(--border-light)',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all 0.3s'
              }}
            >
              <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: '#F2F4F3', color: '#5E503F', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
                <Award size={20} />
              </div>
              <h3 style={{ margin: 0, fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                {loading ? '-' : `${stats.successRate}%`}
              </h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Interview Rate</p>
            </motion.div>
          </div>

          <motion.div 
            variants={itemVariants}
            style={{
              background: 'var(--surface-bg)',
              padding: '32px',
              borderRadius: '20px',
              border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', color: 'var(--text-primary)' }}>Resume Vault Status</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)' }}>You have <strong>{stats.resumes}</strong> optimized resumes ready to go.</p>
            </div>
            <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#F2F4F3', color: '#5E503F', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FileText size={24} />
            </div>
          </motion.div>

        </motion.div>
      </motion.div>
    </div>
  );
};

export default ProfilePage;
