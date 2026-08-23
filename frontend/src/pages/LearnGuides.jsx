import { useState, useEffect, useMemo } from 'react';
import { NotebookText, FileQuestion, ArrowLeft } from 'lucide-react';
import api, { staticUrl } from '../services/api';

const LEVEL_COLOR = { Basic: { bg: 'var(--success-bg)', color: 'var(--success-text)' }, Intermediate: { bg: 'var(--warning-bg)', color: 'var(--warning-text)' } };

export default function LearnGuides() {
  const [guides, setGuides] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('All');
  const [category, setCategory] = useState('All');
  const [openGuide, setOpenGuide] = useState(null);
  const [loadingGuide, setLoadingGuide] = useState(false);

  useEffect(() => {
    api.get('/learning/guides')
      .then(res => { setGuides(res.data.guides || []); setCategories(res.data.categories || []); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => guides.filter(g => (level === 'All' || g.level === level) && (category === 'All' || g.category === category)), [guides, level, category]);

  const openFullGuide = async (guide) => {
    setLoadingGuide(true);
    try { const res = await api.get(`/learning/guides/${guide.id}`); setOpenGuide(res.data); }
    catch { setOpenGuide({ ...guide, sections: [] }); }
    finally { setLoadingGuide(false); }
  };

  if (loading) return <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 300, borderRadius: 18 }} /></div>;

  if (openGuide) {
    const lc = LEVEL_COLOR[openGuide.level] || LEVEL_COLOR.Basic;
    return (
      <div className="card fade-in" style={{ height: '100%', overflowY: 'auto' }}>
        <div onClick={() => setOpenGuide(null)} style={{
          padding: '14px 20px', borderBottom: '0.5px solid var(--border)', fontSize: 12.5,
          color: 'var(--accent-strong)', cursor: 'pointer', fontWeight: 700,
          display: 'flex', alignItems: 'center', gap: 6, position: 'sticky', top: 0, background: '#fff', zIndex: 1,
        }}><ArrowLeft size={14} /> Back to Guides</div>

        {openGuide.cover_image && (
          <div style={{ height: 240, background: '#0d1520' }}>
            <img src={staticUrl(openGuide.cover_image)} alt={openGuide.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
        )}

        <div style={{ maxWidth: 740, margin: '0 auto', padding: '30px 24px 60px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <span className="badge" style={{ background: lc.bg, color: lc.color }}>{openGuide.level}</span>
            <span className="badge badge-neutral">{openGuide.category}</span>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 12, lineHeight: 1.3, letterSpacing: -0.5 }}>{openGuide.title}</h1>
          <div style={{ fontSize: 14.5, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 30, paddingBottom: 22, borderBottom: '0.5px solid var(--border)' }}>{openGuide.summary}</div>

          {(!openGuide.sections || openGuide.sections.length === 0) ? (
            <div style={{ textAlign: 'center', padding: 30, color: 'var(--text-muted)', fontSize: 12.5 }}>This guide's content is being written — check back soon.</div>
          ) : openGuide.sections.map((s, i) => (
            <div key={s.id} className="fade-in-up" style={{ marginBottom: 34 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 13, display: 'flex', alignItems: 'center', gap: 11 }}>
                <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--accent-bg)', color: 'var(--accent)', fontSize: 12.5, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontWeight: 700 }}>{i + 1}</span>
                {s.heading}
              </h2>
              {s.image_path && (
                <div style={{ width: '100%', height: 320, background: 'var(--page-bg)', borderRadius: 14, marginBottom: 14, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-sm)' }}>
                  <img src={staticUrl(s.image_path)} alt={s.heading} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
              )}
              <div style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.85, whiteSpace: 'pre-line' }}>{s.text}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflow: 'hidden', minHeight: 0 }}>

      <div className="fade-in-up" style={{
        position: 'relative', overflow: 'hidden', borderRadius: 18, flexShrink: 0,
        background: 'linear-gradient(120deg, #0d1520 0%, #1e3a5f 60%, #16496b 100%)', padding: '18px 20px', color: '#fff',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(125,211,252,0.16) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(125,211,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <NotebookText size={19} color="#7dd3fc" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Guides & Articles</div>
            <div style={{ fontSize: 11.5, color: '#b8cfe6' }}>Step-by-step illustrated guides for hands-on learning</div>
          </div>
        </div>
      </div>

      <div className="fade-in-up stagger-1" style={{ display: 'flex', gap: 16, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {['All', 'Basic', 'Intermediate'].map(l => (
            <div key={l} onClick={() => setLevel(l)} className="badge" style={{
              cursor: 'pointer', padding: '6px 14px', fontSize: 11.5,
              background: level === l ? 'var(--accent-bg)' : 'var(--page-bg)',
              color: level === l ? 'var(--accent)' : 'var(--text-muted)',
            }}>{l}</div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <div onClick={() => setCategory('All')} className="badge badge-info" style={{ cursor: 'pointer', opacity: category === 'All' ? 1 : 0.5 }}>All Topics</div>
          {categories.map(c => (
            <div key={c} onClick={() => setCategory(c)} className="badge badge-info" style={{ cursor: 'pointer', opacity: category === c ? 1 : 0.5 }}>{c}</div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {filtered.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 50 }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: 'var(--page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--text-muted)' }}><FileQuestion size={22} /></div>
            <div style={{ fontSize: 13.5, fontWeight: 700 }}>No guides match this filter</div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px,1fr))', gap: 14 }}>
            {filtered.map((g, i) => {
              const lc = LEVEL_COLOR[g.level] || LEVEL_COLOR.Basic;
              return (
                <div key={g.id} onClick={() => openFullGuide(g)} className={`card card-hover card-interactive fade-in-up stagger-${Math.min(i + 1, 6)}`} style={{ overflow: 'hidden' }}>
                  <div style={{ height: 115, background: 'var(--info-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {g.cover_image
                      ? <img src={staticUrl(g.cover_image)} alt={g.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : <NotebookText size={28} color="var(--info-text)" />}
                  </div>
                  <div style={{ padding: '13px 15px' }}>
                    <div style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
                      <span className="badge" style={{ background: lc.bg, color: lc.color, fontSize: 9.5 }}>{g.level}</span>
                      <span className="badge badge-neutral" style={{ fontSize: 9.5 }}>{g.category}</span>
                    </div>
                    <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.35, marginBottom: 6 }}>{g.title}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{g.summary}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 9 }}>
                      {g.section_count > 0 ? `${g.section_count} section${g.section_count !== 1 ? 's' : ''}` : 'Coming soon'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {loadingGuide && (
        <div className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(13,21,32,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="card" style={{ padding: '14px 24px', fontSize: 12.5, color: 'var(--text-secondary)' }}>Loading guide...</div>
        </div>
      )}
    </div>
  );
}
