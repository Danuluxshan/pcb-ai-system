import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAdminStats, adminLogout, getAdminUser } from '../../services/adminApi';

const CLASSES_17 = [
  "Button","Capacitor","Connector","Diode","Zener_Diode",
  "Fuse","IC","Inductor","Jumper","LED","MOSFET","MOV",
  "Potentiometer","Resistor","Switch","Transformer","Transistor"
];

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getAdminStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const NavBtn = ({ to, icon, label, active }) => (
    <div onClick={() => navigate(to)}
      style={{ display:'flex', alignItems:'center', gap:8,
        padding:'7px 10px', borderRadius:6, marginBottom:2,
        cursor:'pointer', fontSize:12,
        background: active ? '#1a2e40':'transparent',
        color: active ? '#7dd3fc':'#8aa4ba' }}>
      <span>{icon}</span>{label}
    </div>
  );

  return (
    <div style={{ display:'flex', height:'100vh', background:'#0f1923' }}>
      {/* Sidebar */}
      <div style={{ width:200, background:'#0c1520',
        borderRight:'0.5px solid rgba(255,255,255,0.08)',
        display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 14px 12px',
          borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color:'#fff', fontWeight:600, fontSize:13 }}>◈ PCB AI Admin</div>
          <div style={{ color:'#6b8099', fontSize:10, marginTop:2 }}>
            {getAdminUser()}
          </div>
        </div>
        <nav style={{ padding:'10px 8px', flex:1 }}>
          <div style={{ fontSize:9, color:'#4a6278', textTransform:'uppercase',
            letterSpacing:1, padding:'6px 8px 4px' }}>Admin</div>
          <NavBtn to="/admin"         icon="⊞" label="Dashboard"  active={true}/>
          <NavBtn to="/admin/dataset" icon="⊡" label="Dataset"    />
          <NavBtn to="/admin/train"   icon="⚙" label="Training"   />
          <NavBtn to="/admin/models"  icon="◈" label="Models"     />
          <div style={{ height:'0.5px', background:'rgba(255,255,255,0.08)', margin:'8px 0' }}/>
          <NavBtn to="/"              icon="←" label="Back to App"/>
        </nav>
        <div style={{ padding:'10px 14px',
          borderTop:'0.5px solid rgba(255,255,255,0.08)' }}>
          <div onClick={adminLogout}
            style={{ fontSize:11, color:'#ef4444', cursor:'pointer' }}>
            ⊗ Sign out
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'auto', padding:24,
        background:'#f0f4f8' }}>
        <div style={{ fontSize:20, fontWeight:600,
          color:'#0f172a', marginBottom:4 }}>Dashboard</div>
        <div style={{ fontSize:12, color:'#64748b', marginBottom:20 }}>
          Model performance and dataset overview
        </div>

        {loading
          ? <div style={{ color:'#64748b' }}>Loading...</div>
          : stats && (
          <>
            {/* Top stats */}
            <div style={{ display:'grid',
              gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
              {[
                { label:'Total Inspections',   value: stats.total_inspections },
                { label:'Total Components',    value: stats.total_components },
                { label:'Dataset Images',      value: stats.dataset_images },
                { label:'Active Model mAP',
                  value: stats.active_model
                    ? `${(stats.active_model.map50*100).toFixed(1)}%` : '—',
                  color:'#15803d' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ background:'#fff',
                  border:'0.5px solid #e2e8f0', borderRadius:12, padding:16 }}>
                  <div style={{ fontSize:11, color:'#64748b',
                    textTransform:'uppercase', letterSpacing:0.5,
                    marginBottom:6 }}>{label}</div>
                  <div style={{ fontSize:24, fontWeight:500,
                    color: color||'#0f172a' }}>{value}</div>
                </div>
              ))}
            </div>

            {/* Active model */}
            {stats.active_model && (
              <div style={{ background:'#fff', border:'0.5px solid #e2e8f0',
                borderRadius:12, padding:16, marginBottom:16 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#475569',
                  textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>
                  Active Model
                </div>
                <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                  {[
                    ['Version',    stats.active_model.version],
                    ['mAP@50',     `${(stats.active_model.map50*100||0).toFixed(1)}%`],
                    ['Created',    new Date(stats.active_model.created_at).toLocaleDateString()],
                    ['Path',       stats.active_model.model_path?.split('\\').pop()],
                  ].map(([k,v]) => (
                    <div key={k}>
                      <div style={{ fontSize:10, color:'#94a3b8',
                        textTransform:'uppercase', marginBottom:3 }}>{k}</div>
                      <div style={{ fontSize:13, fontWeight:500,
                        color:'#0f172a' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Class distribution — Detection counts */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr',
              gap:12 }}>
              <div style={{ background:'#fff', border:'0.5px solid #e2e8f0',
                borderRadius:12, padding:16 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#475569',
                  textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>
                  Detection Count per Class
                </div>
                {CLASSES_17.map(cls => {
                  const count = stats.class_distribution?.[cls] || 0;
                  const max   = Math.max(...Object.values(stats.class_distribution||{}), 1);
                  const pct   = Math.round((count/max)*100);
                  return (
                    <div key={cls} style={{ display:'flex', alignItems:'center',
                      gap:8, marginBottom:6 }}>
                      <div style={{ width:90, fontSize:11,
                        color:'#475569', flexShrink:0 }}>{cls}</div>
                      <div style={{ flex:1, height:6,
                        background:'#f1f5f9', borderRadius:3 }}>
                        <div style={{ height:'100%', background:'#1e3a5f',
                          borderRadius:3, width:`${pct}%` }}/>
                      </div>
                      <div style={{ fontSize:11, color:'#64748b',
                        width:40, textAlign:'right' }}>{count}</div>
                    </div>
                  );
                })}
              </div>

              {/* Dataset count per class */}
              <div style={{ background:'#fff', border:'0.5px solid #e2e8f0',
                borderRadius:12, padding:16 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#475569',
                  textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>
                  Training Images per Class
                </div>
                {CLASSES_17.map(cls => {
                  const count = stats.dataset_by_class?.[cls] || 0;
                  const max   = Math.max(...Object.values(stats.dataset_by_class||{}), 1);
                  const pct   = Math.round((count/max)*100);
                  const color = count === 0 ? '#ef4444'
                    : count < 10 ? '#f59e0b' : '#22c55e';
                  return (
                    <div key={cls} style={{ display:'flex', alignItems:'center',
                      gap:8, marginBottom:6 }}>
                      <div style={{ width:90, fontSize:11,
                        color:'#475569', flexShrink:0 }}>{cls}</div>
                      <div style={{ flex:1, height:6,
                        background:'#f1f5f9', borderRadius:3 }}>
                        <div style={{ height:'100%', background:color,
                          borderRadius:3, width:`${pct}%` }}/>
                      </div>
                      <div style={{ fontSize:11, color, width:30,
                        textAlign:'right', fontWeight:500 }}>{count}</div>
                    </div>
                  );
                })}
                <div style={{ marginTop:10, fontSize:11, color:'#64748b' }}>
                  🔴 0 images &nbsp; 🟡 &lt;10 &nbsp; 🟢 Ready
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}