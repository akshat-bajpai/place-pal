import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

export default function Dashboard() {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      style={{ paddingTop: '100px', paddingBottom: '40px', maxWidth: '1000px', margin: '0 auto', paddingLeft: '20px', paddingRight: '20px', minHeight: '100vh' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', paddingBottom: '24px', borderBottom: '1px solid var(--border-light)' }}>
        <div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Dashboard</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>Manage and track your internship applications.</p>
        </div>
        <button className="btn-primary">
          <Plus size={16} /> New Application
        </button>
      </div>

      <div className="card" style={{ padding: '60px 20px', textAlign: 'center', background: 'var(--surface-bg)' }}>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '8px' }}>No applications yet</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginBottom: '24px' }}>
          Get started by adding your first internship application.
        </p>
        <button className="btn-secondary">
          Add application
        </button>
      </div>
    </motion.div>
  );
}
