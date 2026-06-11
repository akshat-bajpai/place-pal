import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Trash2, Download, Plus, X, Star } from 'lucide-react';
import DashboardNavbar from '../components/DashboardNavbar';
import { getResumes, uploadResume, deleteResume, starResume } from '../api/resumes';

export default function Resumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Upload State
  const [file, setFile] = useState(null);
  const [versionName, setVersionName] = useState('');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      const data = await getResumes();
      setResumes(data);
    } catch (err) {
      console.error('Failed to fetch resumes');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteResume(id);
      setResumes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error('Failed to delete resume');
    }
  };

  const handleStar = async (id) => {
    try {
      // Optimistically update UI and sort
      setResumes(prev => {
        const updated = prev.map(r => ({ ...r, is_starred: r.id === id }));
        return updated.sort((a, b) => {
          if (a.is_starred && !b.is_starred) return -1;
          if (!a.is_starred && b.is_starred) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });
      });
      await starResume(id);
    } catch (err) {
      console.error('Failed to star resume');
      fetchResumes(); // Revert on failure
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected && selected.type === 'application/pdf') {
      setFile(selected);
      setError('');
      // Auto-suggest version name based on filename if empty
      if (!versionName) {
        setVersionName(selected.name.replace('.pdf', ''));
      }
    } else {
      setError('Please select a valid PDF file.');
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!file || !versionName) {
      setError('Please provide a version name and select a file.');
      return;
    }

    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('version_name', versionName);
    formData.append('resume', file);

    try {
      const newResume = await uploadResume(formData);
      setResumes(prev => [newResume, ...prev]);
      setIsModalOpen(false);
      setFile(null);
      setVersionName('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload resume.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <div style={{ padding: '40px 40px 80px 40px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: '8px' }}>
              Resume Vault
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '600px' }}>
              Manage and organize different versions of your resume for specific roles.
            </p>
          </div>
          <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
            <Upload size={18} /> Upload Version
          </button>
        </div>

        {/* Loading State */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>Loading vault...</div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', 
            gap: '24px' 
          }}>
            <AnimatePresence>
              {resumes.map((resume, index) => (
                <motion.div
                  key={resume.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  className="card"
                  style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}
                >
                  {/* PDF Icon Background Graphic */}
                  <div style={{ position: 'absolute', top: '-20px', right: '-20px', color: 'var(--accent-primary)', opacity: 0.05 }}>
                    <FileText size={140} />
                  </div>

                  {/* Star Toggle */}
                  <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 10 }}>
                    <button 
                      onClick={() => handleStar(resume.id)}
                      style={{ 
                        background: 'none', border: 'none', cursor: 'pointer',
                        color: resume.is_starred ? '#f59e0b' : 'var(--border-light)',
                        transition: 'all 0.2s transform 0.2s',
                        transform: resume.is_starred ? 'scale(1.1)' : 'scale(1)'
                      }}
                      title={resume.is_starred ? "Primary Resume" : "Mark as Primary"}
                    >
                      <Star size={24} fill={resume.is_starred ? "#f59e0b" : "none"} />
                    </button>
                  </div>

                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                      <FileText size={24} />
                    </div>
                    
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)', paddingRight: '32px' }}>
                      {resume.version_name}
                    </h3>
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500, marginBottom: '24px' }}>
                      Uploaded: {new Date(resume.created_at).toLocaleDateString()}
                    </p>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <a 
                        href={`http://localhost:8000${resume.file_path}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn-secondary" 
                        style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', padding: '8px', fontSize: '0.9rem' }}
                      >
                        <Download size={16} /> View
                      </a>
                      <button 
                        onClick={() => handleDelete(resume.id)}
                        style={{ background: '#fef2f2', border: '1px solid #fee2e2', color: '#ef4444', borderRadius: '8px', padding: '8px 12px', cursor: 'pointer', transition: 'background 0.2s' }}
                        onMouseOver={(e) => e.currentTarget.style.background = '#fee2e2'}
                        onMouseOut={(e) => e.currentTarget.style.background = '#fef2f2'}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}

              {/* Empty State */}
              {resumes.length === 0 && (
                <motion.div 
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="card"
                  style={{ gridColumn: '1 / -1', padding: '80px 20px', textAlign: 'center', border: '2px dashed var(--border-light)', background: 'transparent', boxShadow: 'none' }}
                >
                  <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--surface-bg)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: 'var(--text-secondary)' }}>
                    <FileText size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No resumes uploaded</h3>
                  <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Upload your first resume to start managing versions.</p>
                  <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
                    <Upload size={18} /> Upload Resume
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}
            onClick={() => setIsModalOpen(false)}
          >
            <motion.div
              initial={{ y: 50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="card"
              style={{ width: '100%', maxWidth: '440px', padding: '32px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }}>Upload Resume</h2>
                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUploadSubmit}>
                {error && (
                  <div style={{ color: '#ef4444', background: '#fef2f2', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '0.9rem' }}>
                    {error}
                  </div>
                )}

                <div style={{ marginBottom: '20px' }}>
                  <label className="label">Version Name *</label>
                  <input 
                    type="text" 
                    className="input-field" 
                    placeholder="e.g. Fullstack Engineer 2026" 
                    value={versionName} 
                    onChange={(e) => setVersionName(e.target.value)} 
                    required 
                    autoFocus 
                  />
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label className="label">PDF File *</label>
                  <div 
                    onClick={() => fileInputRef.current?.click()}
                    style={{ 
                      border: '2px dashed var(--border-light)', borderRadius: '12px', padding: '32px', textAlign: 'center', 
                      cursor: 'pointer', background: file ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                      transition: 'all 0.2s', borderColor: file ? 'var(--accent-primary)' : 'var(--border-light)'
                    }}
                  >
                    {file ? (
                      <div>
                        <FileText size={32} color="var(--accent-primary)" style={{ marginBottom: '12px' }} />
                        <p style={{ fontWeight: 600, color: 'var(--accent-primary)', margin: 0 }}>{file.name}</p>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                    ) : (
                      <div>
                        <Upload size={32} color="var(--text-secondary)" style={{ marginBottom: '12px' }} />
                        <p style={{ fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Click to browse</p>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>PDF files only (max 5MB)</p>
                      </div>
                    )}
                  </div>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange} 
                    accept="application/pdf" 
                    style={{ display: 'none' }} 
                  />
                </div>

                <button type="submit" className="btn-primary" style={{ width: '100%', opacity: uploading ? 0.7 : 1 }} disabled={uploading}>
                  {uploading ? 'Uploading...' : 'Save Version'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
