const companies = [
  { name: 'Google', domain: 'google.com' },
  { name: 'Meta', domain: 'meta.com' },
  { name: 'Apple', domain: 'apple.com' },
  { name: 'Amazon', domain: 'amazon.com' },
  { name: 'Microsoft', domain: 'microsoft.com' },
  { name: 'Netflix', domain: 'netflix.com' },
  { name: 'PayPal', domain: 'paypal.com' },
  { name: 'Salesforce', domain: 'salesforce.com' },
  { name: 'Deloitte', domain: 'deloitte.com' },
  { name: 'Uber', domain: 'uber.com' },
  { name: 'Myntra', domain: 'myntra.com' },
  { name: 'Goldman Sachs', domain: 'goldmansachs.com' },
  { name: 'Blinkit', domain: 'blinkit.com' },
];

export default function WorkflowAnimation() {
  return (
    <div className="marquee-container">
      <div className="marquee-content">
        {companies.map((company, i) => (
          <div key={`a-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.8 }}>
            <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={`https://www.google.com/s2/favicons?domain=${company.domain}&sz=128`} alt={company.name} style={{ width: '20px', height: '20px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
            </div>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{company.name}</span>
          </div>
        ))}
      </div>
      <div className="marquee-content" aria-hidden="true">
        {companies.map((company, i) => (
          <div key={`b-${i}`} style={{ display: 'flex', alignItems: 'center', gap: '12px', opacity: 0.8 }}>
            <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <img src={`https://www.google.com/s2/favicons?domain=${company.domain}&sz=128`} alt={company.name} style={{ width: '20px', height: '20px', objectFit: 'contain' }} onError={(e) => e.target.style.display = 'none'} />
            </div>
            <span style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{company.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
