import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { Link } from 'react-router-dom';
import { getApplications, updateApplicationStatus, deleteApplication } from '../api/applications';
import ApplicationCard from '../components/ApplicationCard';
import AddApplicationModal from '../components/AddApplicationModal';
import DashboardNavbar from '../components/DashboardNavbar';
import DashboardHero from '../components/DashboardHero';

const COLUMNS = ['Applied', 'Interviewing', 'Offered', 'Rejected'];

// Create a Droppable Column component so we can drag into empty columns
function KanbanColumn({ column, applications, handleStatusChange, handleDelete }) {
  const { setNodeRef } = useDroppable({ id: column });
  const displayApps = applications.slice(0, 5);

  return (
    <div ref={setNodeRef} style={{ background: 'var(--surface-bg)', borderRadius: 'var(--radius-xl)', padding: '24px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: column === 'Applied' ? 'var(--text-primary)' : column === 'Interviewing' ? 'var(--warning)' : column === 'Offered' ? 'var(--success)' : 'var(--danger)' }}></div>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>{column}</h3>
        </div>
        <span style={{ background: 'var(--bg-color)', padding: '4px 10px', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
          {applications.length}
        </span>
      </div>
      
      <div style={{ minHeight: '200px', flex: 1, display: 'flex', flexDirection: 'column' }}>
        <SortableContext items={displayApps.map(a => a.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {displayApps.map(app => (
              <ApplicationCard 
                key={app.id} 
                app={app} 
                onStatusChange={handleStatusChange}
                onDelete={handleDelete}
              />
            ))}
          </AnimatePresence>
        </SortableContext>
        
        {applications.length === 0 && (
          <div style={{ height: '150px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', border: '2px dashed var(--border-light)', borderRadius: 'var(--radius-lg)', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: '0.9rem', fontWeight: 500 }}>Drop here</p>
          </div>
        )}

        {applications.length > 5 && (
          <div style={{ marginTop: 'auto', paddingTop: '16px', textAlign: 'center' }}>
            <Link to={`/applications/${column.toLowerCase()}`} style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-primary)', textDecoration: 'none' }}>
              View All {applications.length} {'->'}
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [applications, setApplications] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    fetchApps();
  }, []);

  const fetchApps = async () => {
    try {
      const data = await getApplications();
      setApplications(data);
    } catch (err) {
      console.error('Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id, newStatus) => {
    setApplications(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app));
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

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over) return;
    
    const activeApp = applications.find(app => app.id === active.id);
    const overId = String(over.id);
    
    let newStatus = activeApp.status;
    
    // If dropped over a column directly
    if (COLUMNS.includes(overId)) {
      newStatus = overId;
    } else {
      // If dropped over another item
      const overApp = applications.find(app => app.id === over.id);
      if (overApp) newStatus = overApp.status;
    }

    if (activeApp.status !== newStatus) {
      handleStatusChange(active.id, newStatus);
    }
  };

  if (loading) {
    return <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;
  }

  return (
    <>
      <div style={{ padding: '40px 40px 80px 40px', maxWidth: '1400px', margin: '0 auto' }}>
        <DashboardHero applications={applications} />

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>Application Board</h2>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            + New Application
          </button>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '24px',
            alignItems: 'stretch'
          }}>
            {COLUMNS.map(column => (
              <KanbanColumn 
                key={column} 
                column={column} 
                applications={applications.filter(app => app.status === column)}
                handleStatusChange={handleStatusChange}
                handleDelete={handleDelete}
              />
            ))}
          </div>
        </DndContext>
      </div>

      <AddApplicationModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={(newApp) => setApplications(prev => [newApp, ...prev])}
      />
    </>
  );
}
