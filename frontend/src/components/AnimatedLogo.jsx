import { Briefcase } from 'lucide-react';

export default function AnimatedLogo({ showText = true }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'var(--text-primary)', borderRadius: '8px', flexShrink: 0 }}>
        <Briefcase size={16} color="#ffffff" />
      </div>
      {showText && (
        <span style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.5px', color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
          PlacePal
        </span>
      )}
    </div>
  );
}
