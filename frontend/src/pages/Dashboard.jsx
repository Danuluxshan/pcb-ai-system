
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory, healthCheck } from '../services/api';

const StatCard = ({ label, value, sub, color }) => (
  <div style={{ background:'#fff', border:'0.5px solid var(--border)',
    borderRadius:12, padding:'14px 16px' }}>
    <div style={{ fontSize:11, color:'var(--text-muted)',
      textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{label}</div>
    <div style={{ fontSize:24, fontWeight:500, color: color||'var(--text-primary)' }}>{value}</div>
    <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:2 }}>{sub}</div>
  </div>
);

const HealthRing = ({ score }) => {
  const r = 28, circ = 2 * Math.PI * r;
  const fill = (score / 100) * circ;
  const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const band  = score >= 80 ? 'Good' : score >= 50 ? 'Needs Maintenance' : 'Critical';
  return (
    <div style={{ display:'flex', alignItems:'center', gap:16 }}>
      <svg width={72} height={72} viewBox="0 0 72 72">
        <circle cx={36} cy={36} r={r} fill="none" stroke="var(--border)" strokeWidth={6}/>
        <circle cx={36} cy={36} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeDasharray={`${fill} ${circ}`} strokeDashoffset={circ * 0.25}
          strokeLinecap="round"/>
      </svg>
      <div>
        <div style={{ fontSize:28, fontWeight:500 }}>{score}%</div>
        <div style={{ fontSize:12, color, marginTop:2 }}>✓ {band}</div>
      </div>
    </div>
  );
};

const getBand = (score) =>
  score >= 80 ? { label:'Good', color:'#15803d', bg:'#f0fdf4' }
  : score >= 50 ? { label:'Needs Maintenance', color:'#b45309', bg:'#fffbeb' }
  : { label:'Critical', color:'#b91c1c', bg:'#fef2f2' };

export default function Dashboard() {
  const [history, setHistory] = useState([]);
  const [apiOk,   setApiOk]   = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    healthCheck().then(() => setApiOk(true)).catch(() => setApiOk(false));
    getHistory(1, 5).then(d => setHistory(d.inspections || [])).catch(() => {});
  }, []);

  const totalComps  = history.reduce((s, i) => s + (i.total_components || 0), 0);
  const avgHealth   = history.length
    ? Math.round(history.reduce((s, i) => s + (i.health_score || 0), 0) / history.length)
    : 0;
  const faults = history.filter(i => (i.health_score || 100) < 50).length;
  const latest = history[0];

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
        <StatCard label="Total Inspections" value={history.length}    sub="All time" />
        <StatCard label="Components Found"  value={totalComps.toLocaleString()} sub="Across all boards" />
        <StatCard label="Faults Detected"   value={faults}
          sub="Health < 50%" color={faults > 0 ? 'var(--danger)' : 'var(--success)'} />
        <StatCard label="Avg Health Score"  value={`${avgHealth}%`}
          sub="All inspections" color={avgHealth >= 80 ? 'var(--success-text)' : avgHealth >= 50 ? 'var(--warning-text)' : 'var(--danger-text)'} />
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {/* Health Ring */}
        <div style={{ background:'#fff', border:'0.5px solid var(--border)',
          borderRadius:12, padding:16 }}>
          <div style={{ fontSize:11, fontWeight:500, color:'var(--text-muted)',
            textTransform:'uppercase', letterSpacing:0.5, marginBottom:14 }}>
            Last Inspection Health
          </div>
          {latest
            ? <>
                <HealthRing score={Math.round(latest.health_score || 0)} />
                <div style={{ fontSize:11, color:'var(--text-muted)', marginTop:10 }}>
                  {latest.total_components} components detected
                </div>
              </>
            : <div style={{ color:'var(--text-muted)', fontSize:12, padding:'20px 0' }}>
                No inspections yet —{' '}
                <span style={{ color:'#185fa5', cursor:'pointer' }}
                  onClick={() => navigate('/inspect')}>start one</span>
              </div>
          }
        </div>

        {/* Recent Inspections */}
        <div style={{ background:'#fff', border:'0.5px solid var(--border)',
          borderRadius:12, padding:16 }}>
          <div style={{ fontSize:11, fontWeight:500, color:'var(--text-muted)',
            textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>
            Recent Inspections
          </div>
          {history.length === 0
            ? <div style={{ color:'var(--text-muted)', fontSize:12, padding:'20px 0' }}>
                No inspections yet
              </div>
            : history.slice(0,4).map(item => {
                const band = getBand(item.health_score || 0);
                return (
                  <div key={item.id}
                    onClick={() => navigate(`/results/${item.id}`)}
                    style={{ display:'flex', alignItems:'center', gap:10,
                      padding:'8px 0', borderBottom:'0.5px solid var(--border)',
                      cursor:'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                    <div style={{ width:36, height:36, borderRadius:6,
                      background:'#e6f1fb', display:'flex', alignItems:'center',
                      justifyContent:'center', fontSize:18, flexShrink:0 }}>◈</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontSize:12, fontWeight:500,
                        overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {item.id.slice(0,8)}...
                      </div>
                      <div style={{ fontSize:11, color:'var(--text-muted)' }}>
                        {new Date(item.created_at).toLocaleDateString()} ·{' '}
                        {item.total_components} components
                      </div>
                    </div>
                    <span style={{ fontSize:10, padding:'2px 8px', borderRadius:10,
                      background: band.bg, color: band.color, flexShrink:0 }}>
                      {band.label}
                    </span>
                  </div>
                );
              })
          }
          {history.length > 0 && (
            <div style={{ marginTop:10, textAlign:'center' }}>
              <span onClick={() => navigate('/history')}
                style={{ fontSize:11, color:'#185fa5', cursor:'pointer' }}>
                View all →
              </span>
            </div>
          )}
        </div>
      </div>

      {/* API Status */}
      <div style={{ marginTop:16, padding:'10px 14px', background:'#fff',
        border:'0.5px solid var(--border)', borderRadius:10,
        display:'flex', alignItems:'center', gap:8, fontSize:12 }}>
        <span style={{ width:8, height:8, borderRadius:'50%',
          background: apiOk ? '#22c55e' : '#ef4444', display:'inline-block' }}/>
        <span style={{ color:'var(--text-secondary)' }}>
          {apiOk ? 'Backend API connected — http://localhost:8000' : 'Backend API not reachable — start FastAPI server'}
        </span>
        {!apiOk && (
          <button onClick={() => window.open('http://localhost:8000/docs')}
            style={{ marginLeft:'auto', padding:'4px 10px', borderRadius:6,
              border:'0.5px solid var(--border)', fontSize:11,
              background:'transparent', cursor:'pointer' }}>
            Open API docs
          </button>
        )}
      </div>
    </div>
  );
}