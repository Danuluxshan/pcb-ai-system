import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Settings, PlayCircle, StopCircle, AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import { startTraining, stopTraining, getTrainStatus, getAdminStats } from '../../services/adminApi';

const MIN_ANNOTATED = 5;

export default function AdminTraining() {
  const [status,    setStatus]    = useState(null);
  const [statsData, setStatsData] = useState(null);
  const [epochs,    setEpochs]    = useState(50);
  const [batch,     setBatch]     = useState(16);
  const [imgsz,     setImgsz]     = useState(640);
  const [starting,  setStarting]  = useState(false);
  const [error,     setError]     = useState('');
  const logRef  = useRef(null);
  const pollRef = useRef(null);
  const navigate = useNavigate();

  const fetchStatus = async () => {
    try { const s = await getTrainStatus(); setStatus(s); if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; return s; }
    catch { return null; }
  };
  const fetchStats = () => getAdminStats().then(setStatsData).catch(() => {});

  useEffect(() => {
    fetchStatus(); fetchStats();
    pollRef.current = setInterval(fetchStatus, 2000);
    return () => clearInterval(pollRef.current);
  }, []);

  const annotatedCount = statsData?.annotated_images || 0;
  const readyToTrain   = annotatedCount >= MIN_ANNOTATED;

  const start = async () => {
    setStarting(true); setError('');
    try { await startTraining({ epochs, batch_size: batch, imgsz }); await fetchStatus(); }
    catch (e) { setError(e?.response?.data?.detail || 'Failed to start training'); }
    finally { setStarting(false); }
  };
  const stop = async () => { await stopTraining(); await fetchStatus(); };

  const running  = status?.running || false;
  const progress = status?.progress || 0;
  const map50    = status?.map50 || 0;
  const logs     = status?.log || [];

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0d1520' }}>
      <AdminSidebar active="/admin/train" />

      <div style={{ flex: 1, overflow: 'auto', padding: 26, background: 'var(--page-bg)' }} className="fade-in">
        <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.4, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Settings size={22} color="var(--accent-strong)" /> Model Training
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 18 }}>
          Fine-tune YOLO11s using real bounding-box annotated images
        </div>

        <div className="card fade-in-up" style={{
          padding: '14px 18px', marginBottom: 18, display: 'flex', alignItems: 'center', gap: 14,
          borderLeft: `4px solid ${readyToTrain ? '#22c55e' : '#f59e0b'}`,
        }}>
          {readyToTrain ? <CheckCircle2 size={22} color="#22c55e" /> : <AlertTriangle size={22} color="#f59e0b" />}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: readyToTrain ? 'var(--success-text)' : 'var(--warning-text)' }}>
              {readyToTrain ? `Ready to train — ${annotatedCount} annotated images available` : `Not enough annotated images — ${annotatedCount}/${MIN_ANNOTATED} minimum`}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
              {readyToTrain ? 'Training uses real bounding boxes from the Dataset → Annotate page.' : 'Upload images, then click "Annotate" to draw boxes.'}
            </div>
          </div>
          {!readyToTrain && <button className="btn btn-primary" onClick={() => navigate('/admin/dataset')} style={{ padding: '8px 18px', flexShrink: 0 }}>Go to Dataset →</button>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: 16 }}>
          <div>
            <div className="card fade-in-up stagger-1" style={{ padding: 18, marginBottom: 12 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 14 }}>
                Training Config
              </div>
              {[
                { label: 'Epochs', value: epochs, set: setEpochs, min: 10, max: 300, step: 10 },
                { label: 'Batch Size', value: batch, set: setBatch, min: 4, max: 32, step: 4 },
                { label: 'Image Size', value: imgsz, set: setImgsz, min: 320, max: 1280, step: 32 },
              ].map(({ label, value, set, min, max, step }) => (
                <div key={label} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
                    <span>{label}</span><span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{value}</span>
                  </div>
                  <input type="range" min={min} max={max} step={step} value={value} onChange={e => set(Number(e.target.value))}
                    disabled={running} style={{ width: '100%', accentColor: 'var(--accent-bg)' }} />
                </div>
              ))}
              {error && <div className="badge" style={{ display: 'block', padding: 8, marginBottom: 10, background: 'var(--danger-bg)', color: 'var(--danger-text)' }}>⚠ {error}</div>}
              <div style={{ display: 'flex', gap: 8 }}>
                <button className="btn btn-primary" onClick={start} disabled={running || starting || !readyToTrain} style={{ flex: 1, padding: 10 }}>
                  {starting ? <Loader2 size={14} className="pulse" /> : running ? <Loader2 size={14} className="pulse" /> : <PlayCircle size={14} />}
                  {starting ? 'Starting...' : running ? 'Running...' : !readyToTrain ? 'Need more data' : 'Start Training'}
                </button>
                {running && <button className="btn btn-ghost" onClick={stop} style={{ padding: '10px 14px', color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}><StopCircle size={14} /></button>}
              </div>
            </div>

            {status && (
              <div className="card fade-in-up stagger-2" style={{ padding: 18 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>Status</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <div className={running ? 'pulse' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: running ? '#22c55e' : '#94a3b8' }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: running ? 'var(--success-text)' : 'var(--text-secondary)' }}>{running ? 'Training in progress' : status.error ? 'Error' : 'Idle'}</span>
                </div>
                {running && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>
                      <span>Epoch {status.epoch}/{status.total_epochs}</span><span>{progress}%</span>
                    </div>
                    <div style={{ height: 6, background: 'var(--page-bg)', borderRadius: 999, marginBottom: 10, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: 'linear-gradient(90deg,#22c55e,#4ade80)', width: `${progress}%`, transition: 'width 500ms ease' }} />
                    </div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success-text)' }}>{(map50 * 100).toFixed(1)}% <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>mAP@50</span></div>
                  </>
                )}
                {!running && status.finished_at && !status.error && (
                  <div className="badge" style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--success-bg)', color: 'var(--success-text)' }}>
                    <span>✅ mAP@50: {(map50 * 100).toFixed(1)}%</span>
                    <span onClick={() => navigate('/admin/models')} style={{ cursor: 'pointer', fontWeight: 700 }}>Review →</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card fade-in-up stagger-1" style={{ background: '#0d1520', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '11px 18px', borderBottom: '0.5px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#7dd3fc' }}>Training Log</span>
              {running && <span className="badge" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>● LIVE</span>}
            </div>
            <div ref={logRef} style={{ flex: 1, overflowY: 'auto', padding: 16, fontFamily: 'monospace', fontSize: 11, color: '#94a5ba', lineHeight: 1.8, minHeight: 320 }}>
              {logs.length === 0 ? <div style={{ color: '#4a6278' }}>No logs yet — start training to see output</div> :
                logs.map((log, i) => (
                  <div key={i} style={{ color: log.includes('complete') || log.startsWith('✅') ? '#22c55e' : log.includes('Error') || log.startsWith('❌') ? '#ef4444' : log.includes('Starting') || log.startsWith('🚀') ? '#7dd3fc' : log.startsWith('💾') ? '#f59e0b' : '#94a5ba' }}>{log}</div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
