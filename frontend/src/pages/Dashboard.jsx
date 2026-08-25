import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList, Cpu, AlertTriangle, HeartPulse, Clock, ArrowUpRight,
  BookOpen, History as HistoryIcon, Upload, Wifi, WifiOff, Sparkles,
} from 'lucide-react';
import { getHistory, healthCheck } from '../services/api';

const StatCard = ({ label, value, sub, color, Icon, delay }) => (
  <div className={`card card-hover fade-in-up stagger-${delay}`} style={{
    padding: '20px 22px', position: 'relative', overflow: 'hidden',
    borderTop: `3px solid ${color}`,
  }}>
    <div style={{
      position: 'absolute', top: -30, right: -30, width: 100, height: 100,
      borderRadius: '50%', background: `${color}10`,
    }} />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', position: 'relative' }}>
      <div>
        <div style={{
          fontSize: 10.5, color: 'var(--text-muted)', fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: 0.7, marginBottom: 12,
        }}>{label}</div>
        <div style={{
          fontSize: 32, fontWeight: 800, letterSpacing: -0.8,
          color: 'var(--text-primary)', lineHeight: 1,
        }}>{value}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 9 }}>{sub}</div>
      </div>
      <div style={{
        width: 42, height: 42, borderRadius: 12, flexShrink: 0,
        background: `${color}18`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={20} strokeWidth={2.2} />
      </div>
    </div>
  </div>
);

const HealthRing = ({ score }) => {
  const r = 46, circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const band = score >= 80 ? 'Good' : score >= 50 ? 'Needs Maintenance' : 'Critical';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
      <div style={{ position: 'relative', width: 116, height: 116, flexShrink: 0 }}>
        <div style={{
          position: 'absolute', inset: 6, borderRadius: '50%',
          background: `radial-gradient(circle, ${color}14 0%, transparent 70%)`,
        }} />
        <svg width={116} height={116} viewBox="0 0 116 116" style={{ transform: 'rotate(-90deg)', position: 'relative' }}>
          <circle cx={58} cy={58} r={r} fill="none" stroke="var(--page-bg)" strokeWidth={10} />
          <circle cx={58} cy={58} r={r} fill="none" stroke={color} strokeWidth={10}
            strokeDasharray={`${fill} ${circ}`} strokeLinecap="round"
            style={{
              transition: 'stroke-dasharray 900ms cubic-bezier(0.4,0,0.2,1)',
              filter: `drop-shadow(0 0 6px ${color}66)`
            }} />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.6 }}>
            {score}%
          </div>
        </div>
      </div>
      <div>
        <span className={`badge ${score >= 80 ? 'badge-success' : score >= 50 ? 'badge-warning' : 'badge-danger'}`}>
          ● {band}
        </span>
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 11, lineHeight: 1.65, maxWidth: 220 }}>
          Overall board condition based on the most recent inspection.
        </div>
      </div>
    </div>
  );
};

const getBand = (score) =>
  score >= 80 ? { label: 'Good', color: '#15803d', bg: '#eefcf3', dot: '#22c55e' }
    : score >= 50 ? { label: 'Needs Maintenance', color: '#b45309', bg: '#fffaeb', dot: '#f59e0b' }
      : { label: 'Critical', color: '#b91c1c', bg: '#fef2f2', dot: '#ef4444' };

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [apiOk, setApiOk] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const checkApi = () => healthCheck().then(() => setApiOk(true)).catch(() => setApiOk(false));
    checkApi();
    const interval = setInterval(checkApi, 10000); // re-check every 10s

    getHistory(1, 5)
      .then(d => setHistory(d.inspections || []))
      .catch(() => { })
      .finally(() => setLoading(false));

    return () => clearInterval(interval);
  }, []);

  const totalComps = history.reduce((s, i) => s + (i.total_components || 0), 0);
  const avgHealth = history.length
    ? Math.round(history.reduce((s, i) => s + (i.health_score || 0), 0) / history.length)
    : 0;
  const faults = history.filter(i => (i.health_score || 100) < 50).length;
  const latest = history[0];

  return (
    <div className="fade-in">

      {/* ── Gradient hero banner ─────────────────────────────────── */}
      <div className="fade-in-up" style={{
        position: 'relative', overflow: 'hidden', borderRadius: 20,
        background: 'linear-gradient(120deg, #0d1520 0%, #1e3a5f 55%, #16496b 100%)',
        padding: '28px 30px', marginBottom: 20, color: '#fff',
      }}>
        <div style={{
          position: 'absolute', top: -60, right: -40, width: 220, height: 220,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(125,211,252,0.18) 0%, transparent 70%)',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, right: 120, width: 180, height: 180,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%)',
        }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
              color: '#7dd3fc', fontWeight: 600, marginBottom: 10,
              background: 'rgba(125,211,252,0.12)', padding: '4px 12px', borderRadius: 999,
            }}>
              <Sparkles size={12} /> AI-Powered PCB Inspection
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, marginBottom: 6 }}>
              Welcome back 👋
            </div>
            <div style={{ fontSize: 13, color: '#b8cfe6' }}>
              Here's what's happening with your PCB inspections
            </div>
          </div>
          <button className="btn" onClick={() => navigate('/inspect')} style={{
            padding: '12px 22px', background: '#fff', color: '#0d1520',
            fontSize: 13, fontWeight: 700, boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
          }}>
            <Upload size={15} /> New Inspection
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 16,
      }}>
        <StatCard label="Total Inspections" value={history.length} sub="All time"
          Icon={ClipboardList} color="#1e3a5f" delay={1} />
        <StatCard label="Components Found" value={totalComps.toLocaleString()} sub="Across all boards"
          Icon={Cpu} color="#38bdf8" delay={2} />
        <StatCard label="Faults Detected" value={faults} sub="Health below 50%"
          Icon={AlertTriangle} color={faults > 0 ? '#ef4444' : '#22c55e'} delay={3} />
        <StatCard label="Avg Health Score" value={`${avgHealth}%`} sub="All inspections"
          Icon={HeartPulse} color={avgHealth >= 80 ? '#22c55e' : avgHealth >= 50 ? '#f59e0b' : '#ef4444'} delay={4} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>

        {/* Health Ring */}
        <div className="card fade-in-up stagger-2" style={{ padding: 24 }}>
          <div style={{
            fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 7,
          }}>
            <HeartPulse size={14} /> Last Inspection Health
          </div>
          {loading ? (
            <div className="skeleton" style={{ height: 116, width: 280, borderRadius: 16 }} />
          ) : latest ? (
            <>
              <HealthRing score={Math.round(latest.health_score || 0)} />
              <div style={{
                fontSize: 11.5, color: 'var(--text-muted)', marginTop: 18,
                paddingTop: 16, borderTop: '0.5px solid var(--border)',
              }}>
                {latest.total_components} components detected in this scan
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{
                width: 56, height: 56, borderRadius: 16, background: 'var(--page-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px', color: 'var(--text-muted)',
              }}>
                <ClipboardList size={24} />
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>
                No inspections yet
              </div>
              <button className="btn btn-primary" onClick={() => navigate('/inspect')}
                style={{ padding: '9px 20px', margin: '0 auto' }}>
                <Upload size={14} /> Start your first inspection
              </button>
            </div>
          )}
        </div>

        {/* Recent Inspections */}
        <div className="card fade-in-up stagger-3" style={{ padding: 24 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16,
          }}>
            <div style={{
              fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)',
              textTransform: 'uppercase', letterSpacing: 0.6,
              display: 'flex', alignItems: 'center', gap: 7,
            }}>
              <Clock size={14} /> Recent Inspections
            </div>
            {history.length > 0 && (
              <span onClick={() => navigate('/history')}
                style={{
                  fontSize: 11, color: 'var(--accent-strong)', cursor: 'pointer',
                  fontWeight: 700, display: 'flex', alignItems: 'center', gap: 3,
                }}>
                View all <ArrowUpRight size={12} />
              </span>
            )}
          </div>

          {loading ? (
            [1, 2, 3].map(i => (
              <div key={i} className="skeleton" style={{ height: 50, borderRadius: 12, marginBottom: 8 }} />
            ))
          ) : history.length === 0 ? (
            <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '30px 0', textAlign: 'center' }}>
              No inspections yet
            </div>
          ) : (
            history.slice(0, 4).map((item, i) => {
              const band = getBand(item.health_score || 0);
              return (
                <div key={item.id}
                  onClick={() => navigate(`/results/${item.id}`)}
                  className={`fade-in-up stagger-${i + 1}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 12,
                    padding: '10px 10px', borderRadius: 12, cursor: 'pointer',
                    transition: 'background 150ms ease', marginBottom: 3,
                    borderLeft: `3px solid ${band.dot}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--page-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                    background: 'var(--info-bg)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', color: 'var(--info-text)',
                  }}>
                    <Cpu size={16} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {item.id.slice(0, 8)}...
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(item.created_at).toLocaleDateString()} · {item.total_components} components
                    </div>
                  </div>
                  <span className="badge" style={{ background: band.bg, color: band.color, flexShrink: 0 }}>
                    {band.label}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Quick actions row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 14 }}>
        {[
          { Icon: Upload, label: 'New Inspection', sub: 'Upload a PCB photo', to: '/inspect', color: '#38bdf8' },
          { Icon: BookOpen, label: 'Learn Components', sub: 'Browse the library', to: '/learn', color: '#22c55e' },
          { Icon: HistoryIcon, label: 'View History', sub: 'Past inspections', to: '/history', color: '#f59e0b' },
        ].map((a, i) => (
          <div key={a.label} onClick={() => navigate(a.to)}
            className={`card card-hover card-interactive fade-in-up stagger-${i + 4}`}
            style={{ padding: '20px 22px', display: 'flex', alignItems: 'center', gap: 15 }}>
            <div className="icon-lift" style={{
              width: 46, height: 46, borderRadius: 13, flexShrink: 0,
              background: `linear-gradient(135deg, ${a.color}22, ${a.color}10)`, color: a.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <a.Icon size={21} strokeWidth={2} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{a.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.sub}</div>
            </div>
            <ArrowUpRight size={16} color="var(--text-muted)" />
          </div>
        ))}
      </div>

      {/* API Status */}
      <div className="card fade-in-up stagger-6" style={{
        padding: '13px 20px', display: 'flex', alignItems: 'center', gap: 10,
      }}>
        {apiOk ? <Wifi size={15} color="var(--success)" /> : <WifiOff size={15} color="var(--danger)" className="pulse" />}
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
          {apiOk ? 'Backend API connected' : 'Backend API not reachable — start the FastAPI server'}
        </span>
        {!apiOk && (
          <button className="btn btn-ghost" onClick={() => window.open('http://localhost:8000/docs')}
            style={{ marginLeft: 'auto', padding: '5px 14px', fontSize: 11 }}>
            Open API docs
          </button>
        )}
      </div>
    </div>
  );
}
