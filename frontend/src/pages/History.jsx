import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search, RefreshCw, Plus, Eye, FileText, Trash2, Cpu, History as HistoryIcon,
  TrendingUp, ClipboardList, Activity,
} from 'lucide-react';
import { getHistory, deleteInspection, downloadReport } from '../services/api';

const getBand = (score) =>
  score >= 80 ? { label: 'Good', color: 'var(--success-text)', bg: 'var(--success-bg)' }
  : score >= 50 ? { label: 'Maintenance', color: 'var(--warning-text)', bg: 'var(--warning-bg)' }
  : { label: 'Critical', color: 'var(--danger-text)', bg: 'var(--danger-bg)' };

export default function History() {
  const [data,    setData]    = useState({ inspections: [], total: 0 });
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);
  const navigate = useNavigate();
  const LIMIT = 10;

  const load = (p = 1) => {
    setLoading(true);
    getHistory(p, LIMIT)
      .then(d => { setData(d); setPage(p); })
      .catch(() => setData({ inspections: [], total: 0 }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const filtered = data.inspections.filter(i => !search || i.id.toLowerCase().includes(search.toLowerCase()));
  const totalPages = Math.ceil(data.total / LIMIT);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this inspection?')) return;
    setDeleting(id);
    try { await deleteInspection(id); load(page); }
    catch { alert('Delete failed'); }
    finally { setDeleting(null); }
  };

  const avgHealth = filtered.length
    ? Math.round(filtered.reduce((s, i) => s + (i.health_score || 0), 0) / filtered.length) : 0;
  const passRate = filtered.length
    ? Math.round(filtered.filter(i => (i.health_score || 0) >= 80).length / filtered.length * 100) : 0;
  const totalComps = filtered.reduce((s, i) => s + (i.total_components || 0), 0);

  return (
    <div className="fade-in" style={{
      display: 'flex', flexDirection: 'column', gap: 14,
      height: 'calc(100vh - 88px)', minHeight: 0,
    }}>

      {/* Hero */}
      <div className="fade-in-up" style={{
        position: 'relative', overflow: 'hidden', borderRadius: 18,
        background: 'linear-gradient(120deg, #0d1520 0%, #1e3a5f 60%, #16496b 100%)',
        padding: '20px 26px', color: '#fff', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{
          position: 'absolute', top: -50, right: -20, width: 160, height: 160,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(125,211,252,0.16) 0%, transparent 70%)',
        }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 13 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, background: 'rgba(125,211,252,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}><HistoryIcon size={19} color="#7dd3fc" /></div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: -0.3 }}>Inspection History</div>
            <div style={{ fontSize: 11.5, color: '#b8cfe6' }}>{data.total} total inspections recorded</div>
          </div>
        </div>
        <button className="btn" onClick={() => navigate('/inspect')} style={{
          position: 'relative', padding: '9px 18px', background: '#fff', color: '#0d1520',
          fontSize: 12, fontWeight: 700,
        }}><Plus size={14} /> New Inspection</button>
      </div>

      {/* Search + actions */}
      <div className="fade-in-up stagger-1" style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by inspection ID..."
            className="input-modern" style={{ width: '100%', paddingLeft: 34 }} />
        </div>
        <button className="btn btn-ghost" onClick={() => load(page)} style={{ padding: '10px 16px' }}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Table */}
      <div className="card fade-in-up stagger-2" style={{
        flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0,
      }}>
        <div style={{
          display: 'grid', gridTemplateColumns: '2fr 1fr 90px 80px 140px 130px',
          padding: '11px 18px', borderBottom: '0.5px solid var(--border)', background: 'var(--page-bg)', flexShrink: 0,
        }}>
          {['Board', 'Date Inspected', 'Components', 'Health %', 'Classification', 'Actions'].map(h => (
            <div key={h} style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</div>
          ))}
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 20 }}>
              {[1, 2, 3, 4].map(i => <div key={i} className="skeleton" style={{ height: 50, borderRadius: 10, marginBottom: 8 }} />)}
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 50, textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, borderRadius: 15, background: 'var(--page-bg)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px', color: 'var(--text-muted)',
              }}><ClipboardList size={22} /></div>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: 'var(--text-primary)' }}>No inspections yet</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
                Upload a PCB image to start your first inspection
              </div>
              <button className="btn btn-primary" onClick={() => navigate('/inspect')} style={{ margin: '0 auto', padding: '9px 20px' }}>
                Start Inspection
              </button>
            </div>
          ) : (
            filtered.map((item, idx) => {
              const band = getBand(item.health_score || 0);
              const dateStr = new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
              return (
                <div key={item.id}
                  className={`fade-in-up stagger-${Math.min(idx + 1, 6)}`}
                  style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 90px 80px 140px 130px',
                    padding: '12px 18px', borderBottom: '0.5px solid var(--border)',
                    alignItems: 'center', transition: 'background 150ms ease',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--page-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <div style={{
                      width: 34, height: 34, borderRadius: 10, background: 'var(--info-bg)', color: 'var(--info-text)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}><Cpu size={15} /></div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>PCB_{item.id.slice(0, 8)}</div>
                      <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{item.id.slice(0, 16)}...</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{dateStr}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600 }}>{item.total_components}</div>
                  <div style={{
                    fontSize: 13.5, fontWeight: 800,
                    color: (item.health_score || 0) >= 80 ? 'var(--success-text)' : (item.health_score || 0) >= 50 ? 'var(--warning-text)' : 'var(--danger-text)',
                  }}>{Math.round(item.health_score || 0)}%</div>

                  <div><span className="badge" style={{ background: band.bg, color: band.color }}>{band.label.toUpperCase()}</span></div>

                  <div style={{ display: 'flex', gap: 5 }}>
                    <button onClick={() => navigate(`/results/${item.id}`)}
                      style={{ padding: '5px 9px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', color: 'var(--text-secondary)', transition: 'all 150ms ease' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent-strong)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                      <Eye size={13} />
                    </button>
                    <button onClick={() => downloadReport(item.id)}
                      style={{ padding: '5px 9px', borderRadius: 8, border: '1px solid var(--border)', background: '#fff', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                      <FileText size={13} />
                    </button>
                    <button onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                      style={{ padding: '5px 9px', borderRadius: 8, border: '1px solid var(--danger-border)', background: deleting === item.id ? 'var(--page-bg)' : '#fff', cursor: 'pointer', color: 'var(--danger-text)' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {totalPages > 1 && (
          <div style={{
            padding: '10px 18px', borderTop: '0.5px solid var(--border)', display: 'flex',
            alignItems: 'center', gap: 8, background: 'var(--page-bg)', flexShrink: 0,
          }}>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              Showing {((page - 1) * LIMIT) + 1}–{Math.min(page * LIMIT, data.total)} of {data.total}
            </span>
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 4 }}>
              {[...Array(totalPages)].map((_, i) => (
                <button key={i} onClick={() => load(i + 1)} style={{
                  width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border)', fontSize: 11,
                  background: page === i + 1 ? 'var(--accent-bg)' : '#fff',
                  color: page === i + 1 ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer', fontWeight: 600, transition: 'all 150ms ease',
                }}>{i + 1}</button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div className="fade-in-up stagger-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, flexShrink: 0 }}>
        {[
          { label: 'Pass Rate', value: `${passRate}%`, color: 'var(--success-text)', Icon: TrendingUp },
          { label: 'Total Inspections', value: data.total, color: 'var(--text-primary)', Icon: ClipboardList },
          { label: 'Components Tested', value: totalComps.toLocaleString(), color: 'var(--text-primary)', Icon: Cpu },
          { label: 'Avg Health Score', value: `${avgHealth}%`, Icon: Activity,
            color: avgHealth >= 80 ? 'var(--success-text)' : avgHealth >= 50 ? 'var(--warning-text)' : 'var(--danger-text)' },
        ].map(({ label, value, color, Icon }) => (
          <div key={label} className="card" style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 34, height: 34, borderRadius: 10, background: `${color}18`, color,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}><Icon size={16} /></div>
            <div>
              <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
              <div style={{ fontSize: 17, fontWeight: 800, color }}>{value}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
