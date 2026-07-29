import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { startTraining, stopTraining, getTrainStatus,
         getAdminUser, adminLogout } from '../../services/adminApi';

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

export default function AdminTraining() {
  const [status,    setStatus]    = useState(null);
  const [epochs,    setEpochs]    = useState(50);
  const [batch,     setBatch]     = useState(16);
  const [imgsz,     setImgsz]     = useState(640);
  const [useColab,  setUseColab]  = useState(false);
  const [colabUrl,  setColabUrl]  = useState('');
  const [starting,  setStarting]  = useState(false);
  const [error,     setError]     = useState('');
  const logRef  = useRef(null);
  const pollRef = useRef(null);
  const navigate = useNavigate();

  const fetchStatus = async () => {
    try {
      const s = await getTrainStatus();
      setStatus(s);
      // Auto-scroll log
      if (logRef.current)
        logRef.current.scrollTop = logRef.current.scrollHeight;
      return s;
    } catch { return null; }
  };

  useEffect(() => {
    fetchStatus();
    pollRef.current = setInterval(fetchStatus, 2000);
    return () => clearInterval(pollRef.current);
  }, []);

  const start = async () => {
    setStarting(true); setError('');
    try {
      await startTraining({
        epochs, batch_size: batch, imgsz,
        use_colab: useColab,
        colab_url: useColab ? colabUrl : null,
      });
      await fetchStatus();
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to start training');
    } finally {
      setStarting(false);
    }
  };

  const stop = async () => {
    await stopTraining();
    await fetchStatus();
  };

  const running  = status?.running || false;
  const progress = status?.progress || 0;
  const map50    = status?.map50 || 0;
  const logs     = status?.log || [];

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
          <NavBtn to="/admin/train"   icon="⚙" label="Training"  navigate={navigate} active/>
          <NavBtn to="/admin/models"  icon="◈" label="Models"    navigate={navigate}/>
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
          Model Training
        </div>
        <div style={{ fontSize:12, color:'#64748b', marginBottom:20 }}>
          Retrain YOLO11s with uploaded dataset images
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.5fr', gap:16 }}>

          {/* Config panel */}
          <div>
            <div style={{ background:'#fff', border:'0.5px solid #e2e8f0',
              borderRadius:12, padding:16, marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:500, color:'#475569',
                textTransform:'uppercase', letterSpacing:0.5, marginBottom:14 }}>
                Training Config
              </div>

              {[
                { label:'Epochs', value:epochs, set:setEpochs, min:10, max:300, step:10 },
                { label:'Batch Size', value:batch, set:setBatch, min:4, max:32, step:4 },
                { label:'Image Size', value:imgsz, set:setImgsz, min:320, max:1280, step:32 },
              ].map(({ label, value, set, min, max, step }) => (
                <div key={label} style={{ marginBottom:12 }}>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    fontSize:11, color:'#64748b', marginBottom:5 }}>
                    <span>{label}</span>
                    <span style={{ fontWeight:500, color:'#0f172a' }}>{value}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step}
                    value={value} onChange={e => set(Number(e.target.value))}
                    disabled={running}
                    style={{ width:'100%', accentColor:'#1e3a5f' }}/>
                  <div style={{ display:'flex', justifyContent:'space-between',
                    fontSize:10, color:'#94a3b8', marginTop:2 }}>
                    <span>{min}</span><span>{max}</span>
                  </div>
                </div>
              ))}

              {/* Mode toggle */}
              <div style={{ marginBottom:14, padding:'10px 12px',
                background:'#f8fafc', borderRadius:8 }}>
                <div style={{ display:'flex', alignItems:'center',
                  justifyContent:'space-between', marginBottom: useColab ? 10 : 0 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:500, color:'#0f172a' }}>
                      Google Colab
                    </div>
                    <div style={{ fontSize:11, color:'#64748b' }}>
                      Trigger Colab notebook training
                    </div>
                  </div>
                  <div onClick={() => setUseColab(!useColab)}
                    style={{ width:36, height:20, borderRadius:10,
                      background: useColab ? '#1e3a5f':'#e2e8f0',
                      position:'relative', cursor:'pointer', flexShrink:0 }}>
                    <div style={{ width:16, height:16, borderRadius:'50%',
                      position:'absolute', top:2,
                      left: useColab ? 18:2, transition:'left 0.2s',
                      background: useColab ? '#7dd3fc':'#fff' }}/>
                  </div>
                </div>
                {useColab && (
                  <input value={colabUrl} onChange={e => setColabUrl(e.target.value)}
                    placeholder="https://your-colab-webhook-url"
                    style={{ width:'100%', padding:'7px 10px', borderRadius:6,
                      border:'0.5px solid #e2e8f0', fontSize:11,
                      background:'#fff', color:'#0f172a' }}/>
                )}
              </div>

              {error && (
                <div style={{ padding:'8px 10px', background:'#fef2f2',
                  border:'0.5px solid #fca5a5', borderRadius:8,
                  color:'#b91c1c', fontSize:12, marginBottom:10 }}>
                  ⚠ {error}
                </div>
              )}

              {/* Buttons */}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={start}
                  disabled={running || starting}
                  style={{ flex:1, padding:'9px', borderRadius:8, border:'none',
                    background: running||starting ? '#f1f5f9':'#1e3a5f',
                    color: running||starting ? '#94a3b8':'#7dd3fc',
                    fontSize:13, fontWeight:500,
                    cursor: running||starting ? 'not-allowed':'pointer' }}>
                  {starting ? '⟳ Starting...' : running ? '⟳ Running...' : '⚙ Start Training'}
                </button>
                {running && (
                  <button onClick={stop}
                    style={{ padding:'9px 14px', borderRadius:8,
                      border:'0.5px solid #fca5a5', background:'transparent',
                      color:'#b91c1c', fontSize:12, cursor:'pointer' }}>
                    ⊗ Stop
                  </button>
                )}
              </div>
            </div>

            {/* Status card */}
            {status && (
              <div style={{ background:'#fff', border:'0.5px solid #e2e8f0',
                borderRadius:12, padding:16 }}>
                <div style={{ fontSize:12, fontWeight:500, color:'#475569',
                  textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>
                  Status
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                  <div style={{ width:8, height:8, borderRadius:'50%',
                    background: running ? '#22c55e':'#94a3b8' }}/>
                  <span style={{ fontSize:12, fontWeight:500,
                    color: running ? '#15803d':'#475569' }}>
                    {running ? 'Training in progress' : status.error ? 'Error' : 'Idle'}
                  </span>
                </div>
                {running && (
                  <>
                    <div style={{ display:'flex', justifyContent:'space-between',
                      fontSize:11, color:'#64748b', marginBottom:4 }}>
                      <span>Epoch {status.epoch}/{status.total_epochs}</span>
                      <span>{progress}%</span>
                    </div>
                    <div style={{ height:6, background:'#f1f5f9', borderRadius:3, marginBottom:10 }}>
                      <div style={{ height:'100%', background:'#22c55e',
                        borderRadius:3, width:`${progress}%`, transition:'width 0.5s' }}/>
                    </div>
                    <div style={{ display:'flex', gap:12 }}>
                      <div>
                        <div style={{ fontSize:10, color:'#94a3b8' }}>mAP@50</div>
                        <div style={{ fontSize:16, fontWeight:500,
                          color:'#15803d' }}>{(map50*100).toFixed(1)}%</div>
                      </div>
                      {status.started_at && (
                        <div>
                          <div style={{ fontSize:10, color:'#94a3b8' }}>Started</div>
                          <div style={{ fontSize:12, color:'#475569' }}>
                            {new Date(status.started_at).toLocaleTimeString()}
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {status.error && (
                  <div style={{ padding:'6px 10px', background:'#fef2f2',
                    borderRadius:6, color:'#b91c1c', fontSize:11 }}>
                    {status.error}
                  </div>
                )}
                {!running && status.finished_at && !status.error && (
                  <div style={{ padding:'6px 10px', background:'#f0fdf4',
                    borderRadius:6, color:'#15803d', fontSize:11 }}>
                    ✅ Training complete — mAP@50: {(map50*100).toFixed(1)}%
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Log panel */}
          <div style={{ background:'#0f1923', border:'0.5px solid rgba(255,255,255,0.1)',
            borderRadius:12, overflow:'hidden', display:'flex', flexDirection:'column' }}>
            <div style={{ padding:'10px 16px',
              borderBottom:'0.5px solid rgba(255,255,255,0.08)',
              display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontSize:12, fontWeight:500, color:'#7dd3fc' }}>
                Training Log
              </span>
              {running && (
                <span style={{ fontSize:10, padding:'2px 8px', borderRadius:3,
                  background:'rgba(34,197,94,0.2)', color:'#22c55e' }}>
                  ● LIVE
                </span>
              )}
            </div>
            <div ref={logRef}
              style={{ flex:1, overflowY:'auto', padding:16,
                fontFamily:'monospace', fontSize:11,
                color:'#8aa4ba', lineHeight:1.8, minHeight:300 }}>
              {logs.length === 0
                ? <div style={{ color:'#4a6278' }}>
                    No logs yet — start training to see output
                  </div>
                : logs.map((log, i) => (
                    <div key={i} style={{
                      color: log.startsWith('✅') ? '#22c55e'
                           : log.startsWith('❌') ? '#ef4444'
                           : log.startsWith('🚀') ? '#7dd3fc'
                           : log.startsWith('💾') ? '#f59e0b'
                           : log.startsWith('⚠') ? '#f59e0b'
                           : '#8aa4ba'
                    }}>
                      {log}
                    </div>
                  ))
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}