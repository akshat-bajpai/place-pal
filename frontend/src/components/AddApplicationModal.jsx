import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createApplication } from '../api/applications';

export default function AddApplicationModal({ isOpen, onClose, onAdd }) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [link, setLink] = useState('');
  const [dateApplied, setDateApplied] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = { company, role };
      if (link) payload.link = link;
      if (dateApplied) payload.created_at = new Date(dateApplied).toISOString();

      const newApp = await createApplication(payload);
      onAdd(newApp);
      setCompany('');
      setRole('');
      setLink('');
      setDateApplied('');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 50, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="card"
          style={{ width: '100%', maxWidth: '440px', padding: '32px' }}
        >
          <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '8px' }}>Add Application</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px' }}>
            Fill in the details below. We'll automatically search for the link if left blank.
          </p>

          <form onSubmit={handleSubmit}>
            {error && (
              <div style={{ color: '#ef4444', background: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
              <div style={{ flex: 1 }}>
                <label className="label">Company *</label>
                <input type="text" className="input-field" style={{ marginBottom: 0 }} placeholder="e.g. Google" value={company} onChange={(e) => setCompany(e.target.value)} required autoFocus />
              </div>
              <div style={{ flex: 1 }}>
                <label className="label">Role *</label>
                <input type="text" className="input-field" style={{ marginBottom: 0 }} placeholder="e.g. Engineer" value={role} onChange={(e) => setRole(e.target.value)} required />
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label className="label">Date Applied (Optional)</label>
              <input type="datetime-local" className="input-field" style={{ marginBottom: 0 }} value={dateApplied} onChange={(e) => setDateApplied(e.target.value)} />
            </div>

            <div style={{ marginBottom: '32px' }}>
              <label className="label">Application Link (Optional)</label>
              <input type="url" className="input-field" style={{ marginBottom: 0 }} placeholder="https://careers.company.com/..." value={link} onChange={(e) => setLink(e.target.value)} />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" onClick={onClose} style={{ flex: 1, padding: '12px', borderRadius: '12px', border: '1px solid var(--border-light)', background: 'transparent', fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="submit" className="btn-primary" style={{ flex: 1, opacity: loading ? 0.7 : 1 }} disabled={loading}>
                {loading ? 'Processing...' : 'Add Application'}
              </button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
