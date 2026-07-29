import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getModels, activateModel, getAdminUser, adminLogout } from '../../services/adminApi';

const NavBtn = ({ to, icon, label, active, navigate }) => (
  <div onClick={() => navigate(to)}
    style={{ display:'flex', alignItems:'center', gap:8,
      padding:'7px 10px', borderRadius:6, marginBottom:2,
      cursor:'pointer', fontSize:12,
      background: active ? '#1a2e40':'transparent',
      color: active ? '#7dd3fc':'#8aa4ba' }}>
    <span>{icon}</span>{label}
  </div>
);

export default function AdminModels() {
  const [models,   setModels]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [activating, setActivating] = useState(null);
  const [msg,      setMsg]      = useState('');
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    getModels()
      .then(d => setModels(d.models || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const activate = async (id, version) => {
    if (!window.confirm(`Activate model ${version}? This will replace the current active model.`))
      return;
    setActivating(id); setMsg('');
    try {
      const res = await activateModel(id);
      setMsg(`✅ ${res.message}`);
      load();
    } catch (e) {
      setMsg(`❌ ${e?.response?.data?.detail || 'Activation failed'}`);
    } finally {
      setActivating(null);
    }
  };

  return (
    <div style={{ display:'flex', height:'100vh', background:'#0f1923' }}>
      {/* Sidebar */}
      <div style={{ width:200, background:'#0c1520',
        borderRight:'0.5px solid rgba(255,255,255,0.08)',
        display:'flex', flexDirection:'column' }}>
        <div style={{ padding:'16px 14px 12px',
          borderBottom:'0.5px solid rgba(255,255,255,0.08)' }}>
          <div style={{ color:'#fff', fontWeight:600, fontSize:13 }}>◈ PCB AI Admin</div>
          <div style={{ color:'#6b8099', fontSize:10, marginTop:2 }}>{getAdminUser()}</div>
        </div>
        <nav style={{ padding:'10px 8px', flex:1 }}>
          <div style={{ fontSize:9, color:'#4a6278', textTransform:'uppercase',
            letterSpacing:1, padding:'6px 8px 4px' }}>Admin</div>
          <NavBtn to="/admin"         icon="⊞" label="Dashboard" navigate={navigate}/>
          <NavBtn to="/admin/dataset" icon="⊡" label="Dataset"   navigate={navigate}/>
          <NavBtn to="/admin/train"   icon="⚙" label="Training"  navigate={navigate}/>
          <NavBtn to="/admin/models"  icon="◈" label="Models"    navigate={navigate} active/>
          <div style={{ height:'0.5px', background:'rgba(255,255,255,0.08)', margin:'8px 0'}}/>
          <NavBtn to="/" icon="←" label="Back to App" navigate={navigate}/>
        </nav>
        <div style={{ padding:'10px 14px', borderTop:'0.5px solid rgba(255,255,255,0.08)'}}>
          <div onClick={adminLogout} style={{ fontSize:11, color:'#ef4444', cursor:'pointer'}}>
            ⊗ Sign out
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflow:'auto', padding:24, background:'#f0f4f8' }}>
        <div style={{ fontSize:20, fontWeight:600, color:'#0f172a', marginBottom:4 }}>
          Model Versions
        </div>
        <div style={{ fontSize:12, color:'#64748b', marginBottom:20 }}>
          Manage and activate trained model versions
        </div>

        {/* Message */}
        {msg && (
          <div style={{ padding:'10px 14px', borderRadius:8, marginBottom:16,
            background: msg.startsWith('✅') ? '#f0fdf4':'#fef2f2',
            border: `0.5px solid ${msg.startsWith('✅') ? '#bbf7d0':'#fca5a5'}`,
            color: msg.startsWith('✅') ? '#15803d':'#b91c1c', fontSize:12 }}>
            {msg}
          </div>
        )}

        {/* How to add model */}
        <div style={{ background:'#e6f1fb', border:'0.5px solid #b5d4f4',
          borderRadius:10, padding:'10px 14px', marginBottom:16,
          fontSize:12, color:'#185fa5' }}>
          💡 Models appear here after training completes. Train from the Training page,
          then activate the best model to use it for inspections.
        </div>

        {loading
          ? <div style={{ color:'#64748b' }}>Loading models...</div>
          : models.length === 0
          ? (
            <div style={{ background:'#fff', border:'0.5px solid #e2e8f0',
              borderRadius:12, padding:40, textAlign:'center' }}>
              <div style={{ fontSize:32, marginBottom:10 }}>◈</div>
              <div style={{ fontSize:14, fontWeight:500, color:'#0f172a', marginBottom:6 }}>
                No models yet
              </div>
              <div style={{ fontSize:12, color:'#64748b', marginBottom:16 }}>
                Train a model from the Training page to see it here
              </div>
              <button onClick={() => navigate('/admin/train')}
                style={{ padding:'8px 20px', borderRadius:8, border:'none',
                  background:'#1e3a5f', color:'#7dd3fc',
                  fontSize:12, cursor:'pointer' }}>
                Go to Training →
              </button>
            </div>
          )
          : (
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {models.map(m => (
                <div key={m.id} style={{ background:'#fff',
                  border: m.is_active
                    ? '0.5px solid #7dd3fc'
                    : '0.5px solid #e2e8f0',
                  borderRadius:12, padding:16,
                  position:'relative', overflow:'hidden' }}>

                  {/* Active badge */}
                  {m.is_active && (
                    <div style={{ position:'absolute', top:0, right:0,
                      background:'#1e3a5f', color:'#7dd3fc',
                      fontSize:10, padding:'3px 10px',
                      borderBottomLeftRadius:8 }}>
                      ● ACTIVE
                    </div>
                  )}

                  <div style={{ display:'flex', alignItems:'flex-start',
                    justifyContent:'space-between', gap:16 }}>

                    {/* Info */}
                    <div style={{ flex:1 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10,
                        marginBottom:8 }}>
                        <div style={{ fontSize:15, fontWeight:600,
                          color:'#0f172a' }}>{m.version}</div>
                        {m.is_active && (
                          <span style={{ fontSize:10, padding:'2px 8px',
                            borderRadius:10, background:'#e6f1fb',
                            color:'#185fa5' }}>Current</span>
                        )}
                      </div>

                      <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
                        {[
                          ['mAP@50', m.map50 ? `${(m.map50*100).toFixed(1)}%` : '—',
                            m.map50 >= 0.7 ? '#15803d' : m.map50 >= 0.5 ? '#b45309' : '#94a3b8'],
                          ['Epochs',   m.epochs || '—',   '#475569'],
                          ['Created',  new Date(m.created_at).toLocaleDateString(), '#475569'],
                        ].map(([k, v, color]) => (
                          <div key={k}>
                            <div style={{ fontSize:10, color:'#94a3b8',
                              textTransform:'uppercase', letterSpacing:0.5,
                              marginBottom:2 }}>{k}</div>
                            <div style={{ fontSize:14, fontWeight:500,
                              color }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      {m.notes && (
                        <div style={{ marginTop:8, fontSize:11,
                          color:'#64748b', fontStyle:'italic' }}>
                          {m.notes}
                        </div>
                      )}

                      {/* Model path */}
                      <div style={{ marginTop:8, fontSize:10,
                        color:'#94a3b8', fontFamily:'monospace',
                        background:'#f8fafc', padding:'4px 8px',
                        borderRadius:4, display:'inline-block' }}>
                        {m.model_path?.split('\\').pop() ||
                         m.model_path?.split('/').pop() || m.model_path}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', flexDirection:'column',
                      gap:6, flexShrink:0 }}>
                      {!m.is_active && (
                        <button
                          onClick={() => activate(m.id, m.version)}
                          disabled={activating === m.id}
                          style={{ padding:'8px 16px', borderRadius:8,
                            border:'none', background:'#1e3a5f',
                            color:'#7dd3fc', fontSize:12, fontWeight:500,
                            cursor: activating===m.id ? 'not-allowed':'pointer',
                            opacity: activating===m.id ? 0.7:1 }}>
                          {activating === m.id ? '⟳ Activating...' : '⚡ Activate'}
                        </button>
                      )}
                      {m.is_active && (
                        <div style={{ padding:'8px 16px', borderRadius:8,
                          border:'0.5px solid #e2e8f0', fontSize:12,
                          color:'#94a3b8', textAlign:'center' }}>
                          ✓ In use
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>
    </div>
  );
}