import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { getApplications, updateApplicationStatus, deleteApplication } from '../api/applications';
import ApplicationCard from '../components/ApplicationCard';
import AddApplicationModal from '../components/AddApplicationModal';
import { ArrowLeft, Plus, LayoutGrid, List } from 'lucide-react';

export default function ApplicationList() {
  const { status } = useParams();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'stacked'

  // Capitalize status for display and matching
  const statusFormatted = status.charAt(0).toUpperCase() + status.slice(1);

  useEffect(() => {
    fetchApps();
  }, [status]);

  const fetchApps = async () => {
    try {
      const data = await getApplications();
      // Filter the applications to only show those matching the current status
      setApplications(data.filter(app => app.status === statusFormatted));
    } catch (err) {
      console.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    // If we change status, it should disappear from THIS list
    setApplications(prev => prev.filter(app => app.id !== id));
    try {
      await updateApplicationStatus(id, newStatus);
    } catch (err) {
      fetchApps();
    }
  };

  const handleDelete = async (id) => {
    setApplications(prev => prev.filter(app => app.id !== id));
    try {
      await deleteApplication(id);
    } catch (err) {
      fetchApps();
    }
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
  }

  const getStatusColor = () => {
    switch(statusFormatted) {
      case 'Applied': return 'var(--text-primary)';
      case 'Interviewing': return 'var(--warning)';
      case 'Offered': return 'var(--success)';
      case 'Rejected': return 'var(--danger)';
      default: return 'var(--text-primary)';
    }
  };

  return (
    <div style={{ padding: '60px 40px', maxWidth: '1400px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '40px' }}>
        <Link to="/dashboard" style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
          <ArrowLeft size={20} /> Back to Summary
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: getStatusColor() }}></div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px' }}>
            {statusFormatted} Applications
          </h1>
          <span style={{ background: 'var(--surface-bg)', padding: '6px 16px', borderRadius: '100px', fontSize: '1rem', fontWeight: 700, border: '1px solid var(--border-light)', marginLeft: '12px' }}>
            {applications.length} total
          </span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {/* View Toggle */}
          <div style={{ display: 'flex', background: 'var(--surface-bg)', border: '1px solid var(--border-light)', borderRadius: '12px', padding: '4px' }}>
            <button 
              onClick={() => setViewMode('grid')}
              style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', background: viewMode === 'grid' ? 'var(--text-primary)' : 'transparent', color: viewMode === 'grid' ? '#fff' : 'var(--text-secondary)' }}
              title="Grid View"
            >
              <LayoutGrid size={18} />
            </button>
            <button 
              onClick={() => setViewMode('stacked')}
              style={{ padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', background: viewMode === 'stacked' ? 'var(--text-primary)' : 'transparent', color: viewMode === 'stacked' ? '#fff' : 'var(--text-secondary)' }}
              title="Stacked View"
            >
              <List size={18} />
            </button>
          </div>

          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Add Application
          </button>
        </div>
      </div>

      <div style={
        viewMode === 'grid' 
          ? { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }
          : { display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '800px' }
      }>
        <AnimatePresence>
          {applications.map((app, i) => (
            <ApplicationCard 
              key={app.id}
              app={app} 
              onStatusChange={handleStatusChange}
              onDelete={handleDelete}
              index={i}
            />
          ))}

          {applications.length === 0 && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              style={{ gridColumn: '1 / -1', padding: '100px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}
            >
              <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No applications in this stage</h3>
              <p>Applications moved to "{statusFormatted}" will appear here.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AddApplicationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={(newApp) => setApplications(prev => [newApp, ...prev])}
        initialStatus={statusFormatted}
      />
    </div>
  );
}
