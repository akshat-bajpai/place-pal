import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Trash2, Download, Plus, X, Star, Loader2 } from 'lucide-react';
import DashboardNavbar from '../components/DashboardNavbar';
import { getResumes, uploadResume, deleteResume, starResume } from '../api/resumes';

export default function Resumes() {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);

  const getAtsColor = (score) => {
    if (score === -1) return '#3b82f6'; // Blue
    if (!score && score !== 0) return '#9ca3af'; // Gray
    if (score >= 80) return '#10b981'; // Green
    if (score >= 50) return '#f59e0b'; // Yellow
    return '#ef4444'; // Red
  };

  // Upload State
  const [versionName, setVersionName] = useState('');
  const [targetRole, setTargetRole] = useState('');
  const [academicYear, setAcademicYear] = useState('3rd Year');
  const [file, setFile] = useState(null);
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

  // Smart Polling Mechanism: If any resume is still calculating (-1), poll every 3 seconds
  useEffect(() => {
    const isCalculating = resumes.some(r => r.ats_score === -1);
    if (!isCalculating) return;

    const interval = setInterval(() => {
      getResumes().then(data => setResumes(data)).catch(console.error);
    }, 3000);

    return () => clearInterval(interval);
  }, [resumes]);

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
    formData.append('target_role', targetRole || 'General');
    formData.append('academic_year', academicYear);
    formData.append('resume', file);

    try {
      const newResume = await uploadResume(formData);
      setResumes(prev => [newResume, ...prev]);
      setIsModalOpen(false);
      setFile(null);
      setVersionName('');
      setTargetRole('');
      setAcademicYear('3rd Year');
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
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FileText size={24} />
                      </div>

                      {resume.ats_score !== null && (
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          background: `${getAtsColor(resume.ats_score)}15`,
                          color: getAtsColor(resume.ats_score),
                          padding: '4px 10px', borderRadius: '100px',
                          border: `1px solid ${getAtsColor(resume.ats_score)}40`,
                          marginRight: '32px'
                        }}>
                          {resume.ats_score === -1 ? (
                            <>
                              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                                <Loader2 size={12} />
                              </motion.div>
                              <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Calc</span>
                            </>
                          ) : (
                            <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>ATS {resume.ats_score}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 4px 0' }}>{resume.version_name}</h3>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                        Uploaded {new Date(resume.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '20px' }}>
                      <a
                        href={`http://localhost:8000${resume.file_path}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary"
                        style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', padding: '8px', fontSize: '0.9rem', minWidth: '80px' }}
                      >
                        <Download size={16} /> View
                      </a>
                      <button
                        onClick={() => setSelectedFeedback(resume)}
                        className="btn-secondary"
                        disabled={resume.ats_score === -1}
                        style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', padding: '8px', fontSize: '0.9rem', minWidth: '100px', background: resume.ats_score === -1 ? 'var(--bg-secondary)' : 'var(--text-primary)', color: resume.ats_score === -1 ? 'var(--text-secondary)' : '#fff', cursor: resume.ats_score === -1 ? 'not-allowed' : 'pointer' }}
                      >
                        {resume.ats_score === -1 ? 'Waiting...' : 'Details'}
                      </button>
                      <button
                        onClick={() => handleDelete(resume.id)}
                        style={{ background: 'none', border: 'none', color: '#ef4444', padding: '8px', cursor: 'pointer', transition: 'transform 0.2s, opacity 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onMouseOver={(e) => { e.currentTarget.style.opacity = '0.7'; e.currentTarget.style.transform = 'scale(1.1)'; }}
                        onMouseOut={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'scale(1)'; }}
                        title="Delete Resume"
                      >
                        <Trash2 size={18} />
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

                <div style={{ marginBottom: '16px' }}>
                  <label className="label">Version Name *</label>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="e.g. Frontend Dev - Google"
                    value={versionName}
                    onChange={(e) => setVersionName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ flex: 1 }}>
                    <label className="label">Target Role *</label>
                    <input
                      type="text"
                      className="input-field"
                      style={{ marginBottom: 0 }}
                      placeholder="e.g. Backend Engineer"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                      required
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label className="label">Academic Year *</label>
                    <select
                      className="input-field"
                      style={{ marginBottom: 0 }}
                      value={academicYear}
                      onChange={(e) => setAcademicYear(e.target.value)}
                      required
                    >
                      <option value="1st Year">1st Year</option>
                      <option value="2nd Year">2nd Year</option>
                      <option value="3rd Year">3rd Year</option>
                      <option value="4th Year">4th Year</option>
                      <option value="Grad / Experienced">Grad / Experienced</option>
                    </select>
                  </div>
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
      {/* Feedback Modal */}
      <AnimatePresence>
        {selectedFeedback && selectedFeedback.ats_feedback && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}
            onClick={() => setSelectedFeedback(null)}
          >
            <motion.div
              initial={{ y: 20, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 20, opacity: 0, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="card"
              style={{ width: '100%', maxWidth: '900px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '4px' }}>ATS Feedback</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', margin: '0 0 4px 0' }}>{selectedFeedback.version_name}</p>
                  <p style={{ fontSize: '0.85rem', color: 'var(--accent-primary)', margin: 0, fontWeight: 600 }}>
                    Target: {selectedFeedback.target_role || 'General'} | {selectedFeedback.academic_year || '3rd Year'}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', background: `${getAtsColor(selectedFeedback.ats_score)}15`, padding: '8px 16px', borderRadius: '12px', border: `1px solid ${getAtsColor(selectedFeedback.ats_score)}40` }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 800, color: getAtsColor(selectedFeedback.ats_score), lineHeight: 1 }}>{selectedFeedback.ats_score}</span>
                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: getAtsColor(selectedFeedback.ats_score), textTransform: 'uppercase', letterSpacing: '0.5px', marginTop: '4px' }}>/ 100</span>
                  </div>
                  <button onClick={() => setSelectedFeedback(null)} style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-light)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                    <X size={18} />
                  </button>
                </div>
              </div>

              {selectedFeedback.ats_feedback.parsing_flag && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.9rem', fontWeight: 500 }}>
                  ⚠️ Parsing Issues Detected: The document could not be read clearly, or structural issues (like tables/images in Word docs) were detected. This may lower your rule-based ATS score.
                </div>
              )}

              {selectedFeedback.ats_feedback.mode === 'error' ? (
                 <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
                    <h4 style={{ margin: '0 0 8px 0' }}>Evaluation Error</h4>
                    <p style={{ margin: 0, fontSize: '0.9rem' }}>{selectedFeedback.ats_feedback.error_message}</p>
                    {selectedFeedback.ats_feedback.suggestions && (
                      <ul style={{ marginTop: '8px', paddingLeft: '20px', fontSize: '0.85rem' }}>
                        {selectedFeedback.ats_feedback.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    )}
                 </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                    <div style={{ background: 'var(--bg-color)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                      <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--text-secondary)', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.5px' }}>Rule-Based Analysis</h4>
                      <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.95rem' }}>
                        <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                           <span>Formatting Score</span> <strong>{selectedFeedback.ats_feedback.rule_based?.score || 0}/100</strong>
                        </li>
                        {selectedFeedback.ats_feedback.rule_based?.keyword_coverage_pct !== undefined && (
                          <>
                            <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                               <span>Keyword Coverage</span> <strong>{selectedFeedback.ats_feedback.rule_based.keyword_coverage_pct}%</strong>
                            </li>
                            {selectedFeedback.ats_feedback.rule_based.similarity_pct !== null && (
                                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                                   <span>TF-IDF Similarity</span> <strong>{selectedFeedback.ats_feedback.rule_based.similarity_pct}%</strong>
                                </li>
                            )}
                          </>
                        )}
                        {/* Fallback for general mode checks */}
                        {selectedFeedback.ats_feedback.rule_based?.checks && (
                           <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                             {selectedFeedback.ats_feedback.rule_based.checks.slice(0, 3).map((check, idx) => (
                               <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                 <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>{check.name}</span>
                                 <span>{check.points}/{check.max}</span>
                               </div>
                             ))}
                           </div>
                        )}
                      </ul>
                    </div>
                    
                    <div style={{ background: 'var(--bg-color)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                      <h4 style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: 'var(--accent-primary)', fontWeight: 700, marginBottom: '12px', letterSpacing: '0.5px' }}>Gemini AI Analysis</h4>
                      {selectedFeedback.ats_feedback.ai ? (
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, fontSize: '0.95rem' }}>
                          <li style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span>Semantic Match</span> <strong>{selectedFeedback.ats_feedback.ai.semantic_match_score || selectedFeedback.ats_feedback.ai.content_quality_score || 0}/100</strong>
                          </li>
                          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '12px', lineHeight: 1.4 }}>
                            {selectedFeedback.ats_feedback.ai.summary}
                          </p>
                        </ul>
                      ) : (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: 0 }}>
                          AI analysis was unavailable or disabled. Only rule-based metrics are shown.
                        </p>
                      )}
                    </div>
                  </div>

                  {selectedFeedback.ats_feedback.ai?.bullet_improvements?.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--text-primary)' }}>Bullet Point Improvements (AI)</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {selectedFeedback.ats_feedback.ai.bullet_improvements.map((bullet, i) => (
                          <div key={i} style={{ background: 'var(--surface-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.9rem' }}>
                            <div style={{ color: '#ef4444', textDecoration: 'line-through', marginBottom: '4px' }}>{bullet.original}</div>
                            <div style={{ color: '#10b981', fontWeight: 500, marginBottom: '6px' }}>{bullet.improved}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>Why: {bullet.reason}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedFeedback.ats_feedback.rule_based?.missing_keywords?.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: '#ef4444' }}>Missing Keywords</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {selectedFeedback.ats_feedback.rule_based.missing_keywords.slice(0, 15).map((kw, i) => (
                          <span key={i} style={{ background: '#fef2f2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid #fecaca' }}>{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedFeedback.ats_feedback.ai?.tailoring_suggestions?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--accent-primary)' }}>Tailoring Suggestions</h4>
                      <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {selectedFeedback.ats_feedback.ai.tailoring_suggestions.map((s, i) => <li key={i} style={{ marginBottom: '8px' }}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                  
                  {(!selectedFeedback.ats_feedback.ai?.tailoring_suggestions || selectedFeedback.ats_feedback.ai.tailoring_suggestions.length === 0) && selectedFeedback.ats_feedback.rule_based?.suggestions?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--accent-primary)' }}>Suggestions</h4>
                      <ul style={{ paddingLeft: '20px', margin: 0, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {selectedFeedback.ats_feedback.rule_based.suggestions.map((s, i) => <li key={i} style={{ marginBottom: '8px' }}>{s}</li>)}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
