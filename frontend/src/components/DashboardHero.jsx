import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Clock, CheckCircle2, XCircle } from 'lucide-react';

const useCountUp = (end, duration = 1500) => {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    let startTime = null;
    const animate = (currentTime) => {
      if (!startTime) startTime = currentTime;
      const progress = Math.min((currentTime - startTime) / duration, 1);
      // easeOutQuart
      const ease = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(ease * end));
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [end, duration]);
  
  return count;
};

const StatCard = ({ title, value, icon: Icon, color, delay }) => {
  const count = useCountUp(value);
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="card"
      style={{ padding: '24px', flex: 1, minWidth: '200px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
        <div style={{ 
          width: '48px', height: '48px', borderRadius: '12px', 
          background: `linear-gradient(135deg, ${color}22, ${color}44)`,
          color: color, display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={24} />
        </div>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          {title}
        </h3>
      </div>
      <div style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-1px' }}>
        {count}
      </div>
    </motion.div>
  );
};

export default function DashboardHero({ applications }) {
  const total = applications.length;
  const interviewing = applications.filter(a => a.status === 'Interviewing').length;
  const offered = applications.filter(a => a.status === 'Offered').length;
  const rejected = applications.filter(a => a.status === 'Rejected').length;
  
  return (
    <div style={{ marginBottom: '40px' }}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: '8px' }}>
          Track Your Career Journey
        </h1>
        <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '32px', maxWidth: '600px' }}>
          Organize applications, monitor progress, and land your dream role.
        </p>
      </motion.div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <StatCard title="Total Applications" value={total} icon={Briefcase} color="var(--accent-primary)" delay={0.1} />
        <StatCard title="Interviews" value={interviewing} icon={Clock} color="var(--warning)" delay={0.2} />
        <StatCard title="Offers" value={offered} icon={CheckCircle2} color="var(--success)" delay={0.3} />
        <StatCard title="Rejected" value={rejected} icon={XCircle} color="var(--danger)" delay={0.4} />
      </div>
    </div>
  );
}
