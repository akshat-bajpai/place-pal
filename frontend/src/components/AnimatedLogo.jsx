import { Briefcase } from 'lucide-react';

export default function AnimatedLogo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', background: 'var(--text-primary)', borderRadius: '8px' }}>
        <Briefcase size={16} color="#ffffff" />
      </div>
      <span style={{ fontSize: '1.25rem', fontWeight: '700', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>
        PlacePal
      </span>
    </div>
  );
}
