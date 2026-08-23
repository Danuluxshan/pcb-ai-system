import { useState, useEffect, useMemo } from 'react';
import { PlayCircle, Play, Film } from 'lucide-react';
import api from '../services/api';

const LEVEL_COLOR = { Basic: { bg: 'var(--success-bg)', color: 'var(--success-text)' }, Intermediate: { bg: 'var(--warning-bg)', color: 'var(--warning-text)' } };

export default function LearnVideos() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [level, setLevel] = useState('All');
  const [category, setCategory] = useState('All');
  const [playing, setPlaying] = useState(null);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/learning/videos')
      .then(res => { setVideos(res.data.videos || []); setCategories(res.data.categories || []); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => videos.filter(v => (level === 'All' || v.level === level) && (category === 'All' || v.category === category)), [videos, level, category]);
  const grouped = useMemo(() => { const g = {}; filtered.forEach(v => { (g[v.level] ??= []).push(v); }); return g; }, [filtered]);

  if (loading) return <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 300, borderRadius: 18 }} /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, height: '100%', overflow: 'hidden', minHeight: 0 }}>

      <div className="fade-in-up" style={{
        position: 'relative', overflow: 'hidden', borderRadius: 18, flexShrink: 0,
        background: 'linear-gradient(120deg, #0d1520 0%, #1e3a5f 60%, #16496b 100%)', padding: '18px 20px', color: '#fff',
      }}>
        <div style={{ position: 'absolute', top: -40, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(125,211,252,0.16) 0%, transparent 70%)' }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(125,211,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <PlayCircle size={19} color="#7dd3fc" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800 }}>Video Lessons</div>
            <div style={{ fontSize: 11.5, color: '#b8cfe6' }}>Basic to intermediate tutorials — components, soldering, tools & more</div>
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
            <div style={{ width: 52, height: 52, borderRadius: 15, background: 'var(--page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--text-muted)' }}><Film size={22} /></div>
            <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 4 }}>No videos yet</div>
            <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>An administrator can add video lessons from the admin panel.</div>
          </div>
        ) : Object.entries(grouped).map(([lvl, vids]) => (
          <div key={lvl} style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="badge" style={{ background: LEVEL_COLOR[lvl]?.bg, color: LEVEL_COLOR[lvl]?.color }}>{lvl}</span>
              {vids.length} lesson{vids.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px,1fr))', gap: 14 }}>
              {vids.map((v, i) => (
                <div key={v.id} onClick={() => setPlaying(v)} className={`card card-hover card-interactive fade-in-up stagger-${Math.min(i + 1, 6)}`} style={{ overflow: 'hidden' }}>
                  <div style={{ position: 'relative', paddingTop: '56.25%', background: '#0d1520' }}>
                    <img src={v.thumbnail} alt={v.title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(13,21,32,0.3)' }}>
                      <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: 'var(--shadow-md)' }}>
                        <Play size={18} color="#1e3a5f" fill="#1e3a5f" />
                      </div>
                    </div>
                  </div>
                  <div style={{ padding: '11px 13px' }}>
                    <div className="badge badge-info" style={{ marginBottom: 6 }}>{v.category}</div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.4, marginBottom: 4 }}>{v.title}</div>
                    <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {playing && (
        <div onClick={() => setPlaying(null)} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(13,21,32,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 24 }}>
          <div onClick={e => e.stopPropagation()} className="scale-in card" style={{ overflow: 'hidden', maxWidth: 760, width: '100%' }}>
            <div style={{ position: 'relative', paddingTop: '56.25%', background: '#000' }}>
              <iframe src={`https://www.youtube.com/embed/${playing.youtube_id}?autoplay=1`} title={playing.title}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} />
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>{playing.title}</div>
              <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{playing.description}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
