import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import { ExternalLink, Trash2, Calendar, GripVertical, ChevronDown } from 'lucide-react';

export default function ApplicationCard({ app, onStatusChange, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: app.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : 1,
  };

  const domain = app.company.replace(/\s+/g, '').toLowerCase() + '.com';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="card"
    >
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        whileHover={{ y: -4, boxShadow: 'var(--shadow-hover)' }}
        style={{ padding: '20px', background: 'var(--surface-bg)', borderRadius: '12px', position: 'relative' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Drag Handle */}
            <div {...attributes} {...listeners} style={{ cursor: 'grab', color: 'var(--border-light)', marginLeft: '-8px' }}>
              <GripVertical size={20} />
            </div>
            
            {/* Company Logo */}
            <img 
              src={`https://logo.clearbit.com/${domain}`} 
              alt={app.company}
              onError={(e) => { 
                e.target.onerror = null; 
                e.target.src = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=http://${domain}&size=128`;
              }}
              style={{ width: '40px', height: '40px', borderRadius: '50%', border: '1px solid var(--border-light)', objectFit: 'cover', background: '#fff' }}
            />
            
            <div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                {app.company}
              </h4>
              <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: 0, fontWeight: 500 }}>
                {app.role}
              </p>
            </div>
          </div>
          
          <button 
            onClick={() => onDelete(app.id)}
            style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', opacity: 0.6, transition: 'opacity 0.2s' }}
            onMouseOver={(e) => e.target.style.opacity = 1}
            onMouseOut={(e) => e.target.style.opacity = 0.6}
            title="Delete Application"
          >
            <Trash2 size={16} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px', fontWeight: 500 }}>
          <Calendar size={14} />
          {new Date(app.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '16px', borderTop: '1px solid var(--border-light)' }}>
          <div style={{ position: 'relative' }}>
            <select 
              value={app.status}
              onChange={(e) => onStatusChange(app.id, e.target.value)}
              style={{
                padding: '6px 28px 6px 12px',
                borderRadius: '100px',
                border: '1px solid var(--border-light)',
                background: 'var(--bg-color)',
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-primary)',
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
              }}
            >
              <option value="Applied">Applied</option>
              <option value="Interviewing">Interviewing</option>
              <option value="Offered">Offered</option>
              <option value="Rejected">Rejected</option>
            </select>
            <ChevronDown size={14} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: 'var(--text-secondary)' }} />
          </div>

          {app.link && (
            <a 
              href={app.link} 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--accent-primary)', textDecoration: 'none', fontWeight: 600, padding: '6px 12px', background: 'rgba(79, 70, 229, 0.1)', borderRadius: '100px', transition: 'all 0.2s' }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(79, 70, 229, 0.2)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(79, 70, 229, 0.1)'}
            >
              Link <ExternalLink size={12} />
            </a>
          )}
        </div>
      </motion.div>
    </div>
  );
}
