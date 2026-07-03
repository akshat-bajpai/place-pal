import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Radar, Sparkles, ExternalLink, MapPin, Building2, X, Copy, Download,
  Loader2, Wand2, FileText, CheckCircle2, Search, PlusCircle
} from 'lucide-react';
import { getResumes } from '../api/resumes';
import {
  startJobSearch, getLatestSearch, getJobMatches,
  dismissJobMatch, generateCoverLetter, generateSuggestions, trackJobMatch
} from '../api/jobs';

const scoreColor = (score) => {
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#f59e0b';
  return '#ef4444';
};

const TONES = ['Professional', 'Enthusiastic', 'Confident', 'Warm & Personable'];

export default function JobFinder() {
  const [resumes, setResumes] = useState([]);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [interests, setInterests] = useState('');
  const [targetCompanies, setTargetCompanies] = useState('');
  const [search, setSearch] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cover letter modal
  const [clMatch, setClMatch] = useState(null);
  const [clForm, setClForm] = useState({ tone: 'Professional', key_points: '', motivation: '', extra: '' });
  const [clGenerating, setClGenerating] = useState(false);
  const [clTex, setClTex] = useState('');
  const [copied, setCopied] = useState(false);

  // Suggestions modal
  const [sgMatch, setSgMatch] = useState(null);
  const [sgGenerating, setSgGenerating] = useState(false);

  const isRunning = search?.status === 'running';

  const refreshAll = useCallback(async () => {
    try {
      const [resumeData, latest, matchData] = await Promise.all([
        getResumes(), getLatestSearch(), getJobMatches()
      ]);
      setResumes(resumeData);
      setSearch(latest);
      setMatches(matchData);
      setSelectedResumeId(prev => {
        if (prev) return prev;
        const starred = resumeData.find(r => r.is_starred);
        return String(starred?.id || resumeData[0]?.id || '');
      });
      if (latest?.interests) setInterests(prev => prev || latest.interests);
      if (latest?.target_companies) setTargetCompanies(prev => prev || latest.target_companies);
    } catch (err) {
      console.error('Failed to load job finder data', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshAll(); }, [refreshAll]);

  // Poll while a discovery run is in progress (same pattern as ATS scoring)
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(async () => {
      try {
        const latest = await getLatestSearch();
        setSearch(latest);
        if (latest?.status !== 'running') {
          setMatches(await getJobMatches());
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [isRunning]);

  const handleStartSearch = async () => {
    if (!selectedResumeId) {
      setError('Select a resume from your vault first.');
      return;
    }
    setError('');
    try {
      const started = await startJobSearch(Number(selectedResumeId), interests.trim(), targetCompanies.trim());
      setSearch(started);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start the search.');
    }
  };

  const handleDismiss = async (id) => {
    setMatches(prev => prev.filter(m => m.id !== id));
    try { await dismissJobMatch(id); } catch { getJobMatches().then(setMatches); }
  };

  const handleTrack = async (id) => {
    try {
      await trackJobMatch(id);
      setMatches(prev => prev.map(m => m.id === id ? { ...m, status: 'tracked' } : m));
    } catch (err) {
      console.error('Failed to track match', err);
    }
  };

  const openCoverLetter = (match) => {
    setClMatch(match);
    setClTex(match.cover_letter || '');
    setCopied(false);
  };

  const handleGenerateCoverLetter = async () => {
    setClGenerating(true);
    try {
      const data = await generateCoverLetter(clMatch.id, clForm);
      setClTex(data.cover_letter);
      setMatches(prev => prev.map(m => m.id === clMatch.id ? { ...m, cover_letter: data.cover_letter } : m));
    } catch (err) {
      setError(err.response?.data?.message || 'Cover letter generation failed.');
    } finally {
      setClGenerating(false);
    }
  };

  const handleCopyTex = () => {
    navigator.clipboard.writeText(clTex);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTex = () => {
    const blob = new Blob([clTex], { type: 'application/x-tex' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-letter-${(clMatch.company || 'company').toLowerCase().replace(/\s+/g, '-')}.tex`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const openSuggestions = async (match) => {
    setSgMatch(match);
    if (match.resume_suggestions) return;
    setSgGenerating(true);
    try {
      const data = await generateSuggestions(match.id);
      setSgMatch({ ...match, resume_suggestions: data.resume_suggestions });
      setMatches(prev => prev.map(m => m.id === match.id ? { ...m, resume_suggestions: data.resume_suggestions } : m));
    } catch (err) {
      setError(err.response?.data?.message || 'Suggestion generation failed.');
      setSgMatch(null);
    } finally {
      setSgGenerating(false);
    }
  };

  const selectedResume = resumes.find(r => String(r.id) === String(selectedResumeId));
  const stats = search?.stats;

  return (
    <>
      <div style={{ padding: '40px 40px 80px 40px', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '32px' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-1px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <span style={{ width: '52px', height: '52px', borderRadius: '14px', background: 'rgba(79, 70, 229, 0.1)', color: 'var(--accent-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <Radar size={28} />
              </span>
              Job Finder
            </h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', maxWidth: '640px' }}>
              AI scans job boards everywhere for openings that match your resume and interests, then helps you apply with tailored cover letters.
            </p>
          </div>
        </div>

        {error && (
          <div style={{ color: '#ef4444', background: '#fef2f2', padding: '12px 16px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {error}
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}><X size={16} /></button>
          </div>
        )}

        {/* Search Setup */}
        <div className="card" style={{ padding: '28px', marginBottom: '36px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr 1fr auto', gap: '20px', alignItems: 'end' }}>
            <div>
              <label className="label">Resume (from vault)</label>
              <select
                className="input-field"
                style={{ marginBottom: 0 }}
                value={selectedResumeId}
                onChange={(e) => setSelectedResumeId(e.target.value)}
                disabled={isRunning}
              >
                {resumes.length === 0 && <option value="">No resumes uploaded yet</option>}
                {resumes.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.is_starred ? '★ ' : ''}{r.version_name} — {r.target_role || 'General'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Your interests & preferences</label>
              <input
                type="text"
                className="input-field"
                style={{ marginBottom: 0 }}
                placeholder="e.g. remote-first fintech, ML infrastructure, early-stage startups, Bengaluru or remote"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                disabled={isRunning}
              />
            </div>
            <div>
              <label className="label">Dream companies (optional)</label>
              <input
                type="text"
                className="input-field"
                style={{ marginBottom: 0 }}
                placeholder="e.g. Microsoft, Stripe, NVIDIA"
                value={targetCompanies}
                onChange={(e) => setTargetCompanies(e.target.value)}
                disabled={isRunning}
              />
            </div>
            <button
              className="btn-primary"
              onClick={handleStartSearch}
              disabled={isRunning || resumes.length === 0}
              style={{ opacity: isRunning || resumes.length === 0 ? 0.6 : 1, whiteSpace: 'nowrap', height: '46px' }}
            >
              {isRunning ? (
                <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Loader2 size={18} /></motion.span> Scanning…</>
              ) : (
                <><Search size={18} /> Find Openings</>
              )}
            </button>
          </div>

          {/* Live scan status */}
          <AnimatePresence>
            {isRunning && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <div style={{ marginTop: '24px', padding: '16px 20px', borderRadius: '12px', background: 'rgba(79, 70, 229, 0.06)', border: '1px solid rgba(79, 70, 229, 0.2)', display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: 'linear' }} style={{ color: 'var(--accent-primary)', display: 'flex' }}>
                    <Radar size={22} />
                  </motion.div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem' }}>Scanning job boards for you…</p>
                    <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Reading {selectedResume?.version_name || 'your resume'}, extracting your profile, sweeping aggregator boards (Remotive, Arbeitnow, RemoteOK, Jobicy, The Muse) plus company career pages directly — Microsoft, Amazon, NVIDIA and dozens of Greenhouse / Lever / Ashby / Workday boards{targetCompanies.trim() ? `, including ${targetCompanies.trim()}` : ''} — then ranking every opening with AI. This takes about a minute.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Last run stats */}
          {!isRunning && search?.status === 'done' && stats && (
            <div style={{ marginTop: '20px', display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
              <CheckCircle2 size={16} color="var(--success)" />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                Last scan: <strong style={{ color: 'var(--text-primary)' }}>{stats.total_found}</strong> openings found across{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{Object.keys(stats.sources || {}).length}</strong> sources ·{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{stats.matched}</strong> top matches picked for you
              </span>
              {(stats.queries || []).map((q, i) => (
                <span key={i} style={{ fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg-color)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)', padding: '3px 10px', borderRadius: '100px' }}>{q}</span>
              ))}
            </div>
          )}
          {!isRunning && search?.status === 'error' && (
            <p style={{ marginTop: '16px', fontSize: '0.9rem', color: '#ef4444' }}>
              Last scan failed{stats?.error ? `: ${stats.error}` : ''}. Try again.
            </p>
          )}
        </div>

        {/* Results */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '100px', color: 'var(--text-secondary)' }}>Loading…</div>
        ) : matches.length === 0 && !isRunning ? (
          <div className="card" style={{ padding: '80px 20px', textAlign: 'center', border: '2px dashed var(--border-light)', background: 'transparent', boxShadow: 'none' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'var(--surface-bg)', border: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto', color: 'var(--text-secondary)' }}>
              <Sparkles size={30} />
            </div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '8px' }}>No matches yet</h3>
            <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Pick a resume, describe your interests and hit <strong>Find Openings</strong>.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
            <AnimatePresence>
              {matches.map((m, index) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.04 }}
                  className="card"
                  style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: '6px',
                      background: `${scoreColor(m.match_score)}15`, color: scoreColor(m.match_score),
                      padding: '4px 12px', borderRadius: '100px', border: `1px solid ${scoreColor(m.match_score)}40`
                    }}>
                      <Sparkles size={13} />
                      <span style={{ fontSize: '0.85rem', fontWeight: 800 }}>{m.match_score}% match</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-secondary)', background: 'var(--bg-color)', border: '1px solid var(--border-light)', padding: '3px 8px', borderRadius: '6px' }}>{m.source}</span>
                      <button onClick={() => handleDismiss(m.id)} title="Dismiss" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', padding: '2px' }}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 6px 0', lineHeight: 1.35 }}>{m.title}</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><Building2 size={14} /> {m.company}</span>
                    {m.location && <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}><MapPin size={14} /> {m.location}</span>}
                  </div>

                  {m.match_summary && (
                    <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 18px 0', background: 'var(--bg-color)', border: '1px solid var(--border-light)', padding: '10px 12px', borderRadius: '10px' }}>
                      {m.match_summary}
                    </p>
                  )}

                  <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <a href={m.url} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '8px', padding: '9px', fontSize: '0.88rem', textDecoration: 'none' }}>
                        <ExternalLink size={15} /> Apply
                      </a>
                      {m.status === 'tracked' ? (
                        <span className="btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', padding: '9px', fontSize: '0.88rem', color: 'var(--success)', cursor: 'default' }}>
                          <CheckCircle2 size={15} /> Tracked
                        </span>
                      ) : (
                        <button onClick={() => handleTrack(m.id)} className="btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '6px', padding: '9px', fontSize: '0.88rem' }} title="Add to your Applied board">
                          <PlusCircle size={15} /> Track
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => openCoverLetter(m)} className="btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '6px', padding: '9px', fontSize: '0.88rem' }}>
                        <FileText size={15} /> Cover Letter
                      </button>
                      <button onClick={() => openSuggestions(m)} className="btn-secondary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: '6px', padding: '9px', fontSize: '0.88rem' }}>
                        <Wand2 size={15} /> Improve Resume
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ---------- Cover Letter Modal ---------- */}
      <AnimatePresence>
        {clMatch && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}
            onClick={() => !clGenerating && setClMatch(null)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="card"
              style={{ width: '100%', maxWidth: clTex ? '860px' : '560px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px' }}>LaTeX Cover Letter</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{clMatch.title} · {clMatch.company}</p>
                </div>
                <button onClick={() => setClMatch(null)} disabled={clGenerating} style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-light)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={18} />
                </button>
              </div>

              {!clTex ? (
                <>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                    Tell us what you want in this letter. We combine your answers with your resume and this job's description to write a letter that's personal to you — as a ready-to-compile LaTeX document.
                  </p>
                  <div style={{ marginBottom: '16px' }}>
                    <label className="label">Tone</label>
                    <select className="input-field" style={{ marginBottom: 0 }} value={clForm.tone} onChange={(e) => setClForm(f => ({ ...f, tone: e.target.value }))}>
                      {TONES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label className="label">Points you want highlighted</label>
                    <textarea
                      className="input-field" rows={3} style={{ marginBottom: 0, resize: 'vertical', fontFamily: 'inherit' }}
                      placeholder="e.g. my internship at X, the hackathon win, my open-source work on Y…"
                      value={clForm.key_points} onChange={(e) => setClForm(f => ({ ...f, key_points: e.target.value }))}
                    />
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label className="label">Why this company?</label>
                    <textarea
                      className="input-field" rows={2} style={{ marginBottom: 0, resize: 'vertical', fontFamily: 'inherit' }}
                      placeholder="What draws you to them? (optional — we'll infer if empty)"
                      value={clForm.motivation} onChange={(e) => setClForm(f => ({ ...f, motivation: e.target.value }))}
                    />
                  </div>
                  <div style={{ marginBottom: '24px' }}>
                    <label className="label">Anything else?</label>
                    <input
                      type="text" className="input-field" style={{ marginBottom: 0 }}
                      placeholder="e.g. available from July, willing to relocate… (optional)"
                      value={clForm.extra} onChange={(e) => setClForm(f => ({ ...f, extra: e.target.value }))}
                    />
                  </div>
                  <button className="btn-primary" style={{ width: '100%', opacity: clGenerating ? 0.7 : 1 }} disabled={clGenerating} onClick={handleGenerateCoverLetter}>
                    {clGenerating ? (
                      <><motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }} style={{ display: 'inline-flex' }}><Loader2 size={18} /></motion.span> Writing your letter…</>
                    ) : (
                      <><Sparkles size={18} /> Generate Cover Letter</>
                    )}
                  </button>
                </>
              ) : (
                <>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                    <button className="btn-secondary" onClick={handleCopyTex} style={{ display: 'flex', gap: '6px', padding: '8px 14px', fontSize: '0.85rem' }}>
                      {copied ? <><CheckCircle2 size={15} color="var(--success)" /> Copied!</> : <><Copy size={15} /> Copy .tex</>}
                    </button>
                    <button className="btn-secondary" onClick={handleDownloadTex} style={{ display: 'flex', gap: '6px', padding: '8px 14px', fontSize: '0.85rem' }}>
                      <Download size={15} /> Download .tex
                    </button>
                    <button className="btn-secondary" onClick={() => setClTex('')} style={{ display: 'flex', gap: '6px', padding: '8px 14px', fontSize: '0.85rem' }}>
                      <Wand2 size={15} /> Regenerate
                    </button>
                  </div>
                  <pre style={{
                    background: '#111827', color: '#e5e7eb', padding: '20px', borderRadius: '12px',
                    fontSize: '0.8rem', lineHeight: 1.6, overflowX: 'auto', whiteSpace: 'pre-wrap',
                    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', maxHeight: '55vh', overflowY: 'auto', margin: 0
                  }}>{clTex}</pre>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '12px', marginBottom: 0 }}>
                    Paste into <a href="https://www.overleaf.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-primary)' }}>Overleaf</a> (or run <code>pdflatex</code>) to get a polished PDF.
                  </p>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---------- Resume Suggestions Modal ---------- */}
      <AnimatePresence>
        {sgMatch && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(8px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px' }}
            onClick={() => !sgGenerating && setSgMatch(null)}
          >
            <motion.div
              initial={{ y: 30, opacity: 0, scale: 0.97 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 20, opacity: 0, scale: 0.97 }}
              onClick={(e) => e.stopPropagation()}
              className="card"
              style={{ width: '100%', maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto', padding: '32px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '4px' }}>Tailor Your Resume</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>{sgMatch.title} · {sgMatch.company}</p>
                </div>
                <button onClick={() => setSgMatch(null)} disabled={sgGenerating} style={{ background: 'var(--surface-bg)', border: '1px solid var(--border-light)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                  <X size={18} />
                </button>
              </div>

              {sgGenerating || !sgMatch.resume_suggestions ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }} style={{ display: 'inline-flex', marginBottom: '16px', color: 'var(--accent-primary)' }}>
                    <Loader2 size={28} />
                  </motion.div>
                  <p style={{ margin: 0, fontWeight: 600 }}>Comparing your resume against this job…</p>
                </div>
              ) : (
                <>
                  {sgMatch.resume_suggestions.fit_summary && (
                    <p style={{ fontSize: '0.95rem', lineHeight: 1.6, background: 'rgba(79, 70, 229, 0.06)', border: '1px solid rgba(79, 70, 229, 0.2)', padding: '14px 16px', borderRadius: '12px', marginBottom: '24px' }}>
                      {sgMatch.resume_suggestions.fit_summary}
                    </p>
                  )}

                  {sgMatch.resume_suggestions.missing_keywords?.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: '#ef4444' }}>Missing Keywords</h4>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {sgMatch.resume_suggestions.missing_keywords.map((kw, i) => (
                          <span key={i} style={{ background: '#fef2f2', color: '#b91c1c', padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem', border: '1px solid #fecaca' }}>{kw}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {sgMatch.resume_suggestions.improvements?.length > 0 && (
                    <div style={{ marginBottom: '24px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: 'var(--accent-primary)' }}>Targeted Improvements</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {sgMatch.resume_suggestions.improvements.map((imp, i) => (
                          <div key={i} style={{ background: 'var(--bg-color)', border: '1px solid var(--border-light)', padding: '12px 14px', borderRadius: '10px', fontSize: '0.9rem' }}>
                            <strong style={{ display: 'block', marginBottom: '4px' }}>{imp.area}</strong>
                            <span style={{ color: 'var(--text-secondary)' }}>{imp.suggestion}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sgMatch.resume_suggestions.bullet_rewrites?.length > 0 && (
                    <div>
                      <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px' }}>Bullet Rewrites</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {sgMatch.resume_suggestions.bullet_rewrites.map((b, i) => (
                          <div key={i} style={{ background: 'var(--surface-bg)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.9rem' }}>
                            <div style={{ color: '#ef4444', textDecoration: 'line-through', marginBottom: '4px' }}>{b.original}</div>
                            <div style={{ color: '#10b981', fontWeight: 500, marginBottom: '6px' }}>{b.improved}</div>
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>Why: {b.reason}</div>
                          </div>
                        ))}
                      </div>
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
