import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getHistory, deleteInspection, downloadReport } from '../services/api';

const getBand = (score) =>
  score >= 80 ? { label:'Good',     color:'#15803d', bg:'#f0fdf4' }
: score >= 50 ? { label:'Maintenance', color:'#b45309', bg:'#fffbeb' }
:               { label:'Critical',  color:'#b91c1c', bg:'#fef2f2' };

export default function History() {
  const [data,    setData]    = useState({ inspections:[], total:0 });
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [loading, setLoading] = useState(true);
  const [deleting,setDeleting]= useState(null);
  const navigate = useNavigate();
  const LIMIT = 10;

  const load = (p = 1) => {
    setLoading(true);
    getHistory(p, LIMIT)
      .then(d => { setData(d); setPage(p); })
      .catch(() => setData({ inspections:[], total:0 }))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(1); }, []);

  const filtered = data.inspections.filter(i =>
    !search || i.id.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(data.total / LIMIT);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this inspection?')) return;
    setDeleting(id);
    try {
      await deleteInspection(id);
      load(page);
    } catch (e) {
      alert('Delete failed');
    } finally {
      setDeleting(null);
    }
  };

  // Summary stats
  const avgHealth = filtered.length
    ? Math.round(filtered.reduce((s,i) => s + (i.health_score||0), 0) / filtered.length)
    : 0;
  const passRate = filtered.length
    ? Math.round(filtered.filter(i => (i.health_score||0) >= 80).length / filtered.length * 100)
    : 0;
  const totalComps = filtered.reduce((s,i) => s + (i.total_components||0), 0);

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12,
      height:'calc(100vh - 88px)', overflow:'hidden' }}>

      {/* Search + actions */}
      <div style={{ display:'flex', gap:8, flexShrink:0 }}>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by inspection ID..."
          style={{ flex:1, padding:'8px 12px', borderRadius:8,
            border:'0.5px solid var(--border)', fontSize:12,
            background:'#fff', color:'var(--text-primary)' }}/>
        <button onClick={() => load(page)}
          style={{ padding:'8px 14px', borderRadius:8,
            border:'0.5px solid var(--border)', fontSize:12,
            background:'#fff', cursor:'pointer',
            color:'var(--text-secondary)' }}>
          ↺ Refresh
        </button>
        <button onClick={() => navigate('/inspect')}
          style={{ padding:'8px 14px', borderRadius:8,
            border:'none', background:'#1e3a5f',
            color:'#7dd3fc', fontSize:12,
            cursor:'pointer', fontWeight:500 }}>
          + New Inspection
        </button>
      </div>

      {/* Table */}
      <div style={{ background:'#fff', border:'0.5px solid var(--border)',
        borderRadius:12, overflow:'hidden', flex:1, display:'flex', flexDirection:'column' }}>

        {/* Table header */}
        <div style={{ display:'grid',
          gridTemplateColumns:'2fr 1fr 90px 80px 130px 120px',
          padding:'8px 16px', borderBottom:'0.5px solid var(--border)',
          background:'var(--page-bg)' }}>
          {['Board','Date Inspected','Components','Health %','Classification','Actions']
            .map(h => (
              <div key={h} style={{ fontSize:11, fontWeight:500,
                color:'var(--text-muted)', textTransform:'uppercase',
                letterSpacing:0.5 }}>{h}</div>
            ))}
        </div>

        {/* Rows */}
        <div style={{ flex:1, overflowY:'auto' }}>
          {loading
            ? <div style={{ padding:40, textAlign:'center',
                color:'var(--text-muted)', fontSize:12 }}>
                Loading...
              </div>
            : filtered.length === 0
            ? <div style={{ padding:40, textAlign:'center' }}>
                <div style={{ fontSize:32, marginBottom:10 }}>◈</div>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:6 }}>
                  No inspections yet
                </div>
                <div style={{ fontSize:12, color:'var(--text-muted)', marginBottom:16 }}>
                  Upload a PCB image to start your first inspection
                </div>
                <button onClick={() => navigate('/inspect')}
                  style={{ padding:'8px 20px', borderRadius:8, border:'none',
                    background:'#1e3a5f', color:'#7dd3fc',
                    cursor:'pointer', fontSize:12 }}>
                  Start Inspection
                </button>
              </div>
            : filtered.map((item, idx) => {
                const band = getBand(item.health_score || 0);
                const date = new Date(item.created_at);
                const dateStr = date.toLocaleDateString('en-GB',
                  { day:'2-digit', month:'short', year:'numeric' });

                return (
                  <div key={item.id}
                    style={{ display:'grid',
                      gridTemplateColumns:'2fr 1fr 90px 80px 130px 120px',
                      padding:'10px 16px',
                      borderBottom:'0.5px solid var(--border)',
                      background: idx%2===0 ? '#fff' : 'var(--page-bg)',
                      alignItems:'center' }}
                    onMouseEnter={e => e.currentTarget.style.background='#e6f1fb'}
                    onMouseLeave={e => e.currentTarget.style.background=idx%2===0?'#fff':'var(--page-bg)'}>

                    {/* Board */}
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:32, height:32, borderRadius:6,
                        background:'#e6f1fb', display:'flex', alignItems:'center',
                        justifyContent:'center', fontSize:16, flexShrink:0 }}>◈</div>
                      <div>
                        <div style={{ fontSize:12, fontWeight:500 }}>
                          PCB_{item.id.slice(0,8)}
                        </div>
                        <div style={{ fontSize:10, color:'var(--text-muted)',
                          fontFamily:'monospace' }}>
                          {item.id.slice(0,16)}...
                        </div>
                      </div>
                    </div>

                    {/* Date */}
                    <div style={{ fontSize:12, color:'var(--text-secondary)' }}>
                      {dateStr}
                    </div>

                    {/* Components */}
                    <div style={{ fontSize:12 }}>
                      {item.total_components}
                    </div>

                    {/* Health */}
                    <div style={{ fontSize:13, fontWeight:500,
                      color: (item.health_score||0) >= 80 ? 'var(--success-text)'
                           : (item.health_score||0) >= 50 ? 'var(--warning-text)'
                           : 'var(--danger-text)' }}>
                      {Math.round(item.health_score || 0)}%
                    </div>

                    {/* Band badge */}
                    <div>
                      <span style={{ fontSize:10, padding:'3px 9px',
                        borderRadius:10, fontWeight:500,
                        background: band.bg, color: band.color }}>
                        {band.label.toUpperCase()}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:5 }}>
                      <button
                        onClick={() => navigate(`/results/${item.id}`)}
                        style={{ padding:'4px 10px', borderRadius:5,
                          border:'0.5px solid var(--border)', fontSize:11,
                          background:'#fff', cursor:'pointer',
                          color:'var(--text-secondary)' }}>
                        👁 View
                      </button>
                      <button
                        onClick={() => downloadReport(item.id)}
                        style={{ padding:'4px 10px', borderRadius:5,
                          border:'0.5px solid var(--border)', fontSize:11,
                          background:'#fff', cursor:'pointer',
                          color:'var(--text-secondary)' }}>
                        PDF
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                        style={{ padding:'4px 8px', borderRadius:5,
                          border:'0.5px solid #fca5a5', fontSize:11,
                          background: deleting===item.id ? 'var(--page-bg)':'#fff',
                          cursor:'pointer', color:'#b91c1c' }}>
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })
          }
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ padding:'10px 16px', borderTop:'0.5px solid var(--border)',
            display:'flex', alignItems:'center', gap:8,
            background:'var(--page-bg)', flexShrink:0 }}>
            <span style={{ fontSize:11, color:'var(--text-muted)' }}>
              Showing {((page-1)*LIMIT)+1}–{Math.min(page*LIMIT, data.total)} of {data.total}
            </span>
            <div style={{ marginLeft:'auto', display:'flex', gap:4 }}>
              {[...Array(totalPages)].map((_,i) => (
                <button key={i} onClick={() => load(i+1)}
                  style={{ width:28, height:28, borderRadius:5,
                    border:'0.5px solid var(--border)', fontSize:11,
                    background: page===i+1 ? '#1e3a5f' : '#fff',
                    color:      page===i+1 ? '#7dd3fc' : 'var(--text-secondary)',
                    cursor:'pointer' }}>
                  {i+1}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Summary stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)',
        gap:10, flexShrink:0 }}>
        {[
          { label:'Pass Rate',       value:`${passRate}%`,          color:'var(--success-text)' },
          { label:'Total Inspections', value:data.total,           color:'var(--text-primary)' },
          { label:'Components Tested', value:totalComps.toLocaleString(), color:'var(--text-primary)' },
          { label:'Avg Health Score', value:`${avgHealth}%`,
            color: avgHealth>=80?'var(--success-text)':avgHealth>=50?'var(--warning-text)':'var(--danger-text)' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ background:'#fff',
            border:'0.5px solid var(--border)', borderRadius:10,
            padding:'10px 14px' }}>
            <div style={{ fontSize:10, color:'var(--text-muted)',
              textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>
              {label}
            </div>
            <div style={{ fontSize:20, fontWeight:500, color }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}