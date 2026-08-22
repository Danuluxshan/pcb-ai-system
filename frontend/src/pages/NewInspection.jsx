import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
import {
  UploadCloud, ImageIcon, Zap, Scan, Eye, ScanText, Lightbulb,
  FolderOpen, Loader2,
} from 'lucide-react';
import { inspectPCB } from '../services/api';

export default function NewInspection() {
  const [file,     setFile]     = useState(null);
  const [preview,  setPreview]  = useState(null);
  const [useSahi,  setUseSahi]  = useState(true);
  const [damage,   setDamage]   = useState(true);
  const [ocr,      setOcr]      = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [progress, setProgress] = useState(0);
  const [error,    setError]    = useState('');
  const navigate = useNavigate();

  const onDrop = useCallback((accepted) => {
    if (!accepted.length) return;
    const f = accepted[0];
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  });

  const startInspection = async () => {
    if (!file) { setError('Please upload a PCB image first'); return; }
    setLoading(true); setError(''); setProgress(0);
    try {
      const result = await inspectPCB(file, useSahi, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      });
      navigate(`/results/${result.inspection_id}`, { state: { result } });
    } catch (e) {
      setError(e?.response?.data?.detail || 'Inspection failed — is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const Toggle = ({ value, onChange, label, sub, Icon, color }) => (
    <div className="card card-hover" style={{
      flex: 1, padding: '16px 18px', display: 'flex', alignItems: 'center', gap: 13,
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 11, flexShrink: 0,
        background: `${color}18`, color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>{label}</div>
        <div style={{ fontSize: 10.5, color: 'var(--text-muted)' }}>{sub}</div>
      </div>
      <div onClick={() => onChange(!value)}
        style={{
          width: 40, height: 22, borderRadius: 999, cursor: 'pointer',
          background: value ? '#1e3a5f' : 'var(--border)', position: 'relative',
          transition: 'background 200ms ease', flexShrink: 0,
        }}>
        <div style={{
          width: 18, height: 18, borderRadius: '50%', position: 'absolute',
          top: 2, left: value ? 20 : 2, transition: 'left 200ms ease',
          background: value ? '#7dd3fc' : '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        }} />
      </div>
    </div>
  );

  return (
    <div className="fade-in" style={{ maxWidth: 760 }}>

      {/* Hero */}
      <div className="fade-in-up" style={{
        position: 'relative', overflow: 'hidden', borderRadius: 20,
        background: 'linear-gradient(120deg, #0d1520 0%, #1e3a5f 60%, #16496b 100%)',
        padding: '24px 28px', marginBottom: 20, color: '#fff',
      }}>
        <div style={{
          position: 'absolute', top: -50, right: -30, width: 180, height: 180,
          borderRadius: '50%', background: 'radial-gradient(circle, rgba(125,211,252,0.18) 0%, transparent 70%)',
        }} />
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 46, height: 46, borderRadius: 13, background: 'rgba(125,211,252,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Scan size={22} color="#7dd3fc" />
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: -0.4 }}>
              New Inspection
            </div>
            <div style={{ fontSize: 12.5, color: '#b8cfe6', marginTop: 2 }}>
              Upload a PCB photo to detect components and check for faults
            </div>
          </div>
        </div>
      </div>

      {/* Dropzone */}
      <div {...getRootProps()} className="fade-in-up stagger-1" style={{
        border: `2px dashed ${isDragActive ? 'var(--accent-strong)' : 'var(--border-strong)'}`,
        borderRadius: 18, padding: preview ? '20px 24px' : '46px 24px', textAlign: 'center',
        marginBottom: 16, background: isDragActive ? 'var(--info-bg)' : 'var(--surface)',
        cursor: 'pointer', transition: 'all 200ms ease',
        boxShadow: isDragActive ? 'var(--shadow-glow)' : 'var(--shadow-xs)',
      }}>
        <input {...getInputProps()} />
        {preview ? (
          <img src={preview} alt="preview" style={{
            maxHeight: 220, maxWidth: '100%', borderRadius: 14, boxShadow: 'var(--shadow-md)',
          }} />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: 18, margin: '0 auto 16px',
            background: 'var(--info-bg)', display: 'flex', alignItems: 'center',
            justifyContent: 'center', color: 'var(--info-text)',
          }}>
            <UploadCloud size={28} strokeWidth={1.8} />
          </div>
        )}
        <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', marginTop: preview ? 14 : 0, marginBottom: 4 }}>
          {preview ? file.name : 'Drop PCB image here'}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
          {preview ? `${(file.size / 1024).toFixed(0)} KB — click to change` : 'Supports JPG, PNG, WEBP — max 10 MB'}
        </div>
        {!preview && (
          <div className="btn btn-ghost" style={{
            marginTop: 18, display: 'inline-flex', padding: '9px 20px',
          }}>
            <FolderOpen size={14} /> Browse files
          </div>
        )}
      </div>

      {/* Detection mode */}
      <div className="fade-in-up stagger-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {[
          { key: false, title: 'Standard', badge: null, desc: 'Fast detection — best for large components', Icon: Zap },
          { key: true, title: 'SAHI Tile-based', badge: 'Recommended', desc: 'Detects small SMD components accurately', Icon: Scan },
        ].map(m => (
          <div key={String(m.key)} onClick={() => setUseSahi(m.key)}
            className="card card-interactive"
            style={{
              padding: '16px 18px', cursor: 'pointer',
              border: useSahi === m.key ? '1.5px solid var(--accent-strong)' : '0.5px solid var(--border)',
              boxShadow: useSahi === m.key ? 'var(--shadow-glow)' : 'var(--shadow-xs)',
              transition: 'all 200ms ease',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 9,
                background: useSahi === m.key ? 'var(--accent-bg)' : 'var(--page-bg)',
                color: useSahi === m.key ? 'var(--accent)' : 'var(--text-muted)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <m.Icon size={15} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
                {m.title}
              </div>
              {m.badge && (
                <span className="badge badge-info" style={{ marginLeft: 'auto' }}>{m.badge}</span>
              )}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', paddingLeft: 40 }}>{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Toggles */}
      <div className="fade-in-up stagger-3" style={{ display: 'flex', gap: 12, marginBottom: 18 }}>
        <Toggle value={damage} onChange={setDamage} Icon={Eye} color="#a855f7"
          label="Damage detection" sub="MobileNetV2 visual analysis" />
        <Toggle value={ocr} onChange={setOcr} Icon={ScanText} color="#f59e0b"
          label="OCR marking read" sub="Reads printed component codes" />
      </div>

      {/* Error */}
      {error && (
        <div className="card fade-in" style={{
          padding: '12px 16px', background: 'var(--danger-bg)', border: '0.5px solid var(--danger-border)',
          color: 'var(--danger-text)', fontSize: 12.5, marginBottom: 14,
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Progress */}
      {loading && (
        <div className="fade-in" style={{ marginBottom: 14 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', fontSize: 11.5,
            color: 'var(--text-muted)', marginBottom: 6,
          }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Loader2 size={13} className="pulse" /> Running inspection...
            </span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--page-bg)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, #38bdf8, #7dd3fc)',
              borderRadius: 999, width: `${progress}%`, transition: 'width 300ms ease',
            }} />
          </div>
        </div>
      )}

      {/* Start button */}
      <button className="btn btn-primary" onClick={startInspection} disabled={loading || !file}
        style={{ width: '100%', padding: 14, fontSize: 13.5 }}>
        {loading ? (
          <><Loader2 size={16} className="pulse" /> Processing... {progress}%</>
        ) : (
          <><Scan size={16} /> Start Inspection</>
        )}
      </button>

      {/* Tip */}
      <div className="fade-in-up stagger-4" style={{
        marginTop: 16, padding: '13px 16px', background: 'var(--info-bg)',
        borderRadius: 14, fontSize: 11.5, color: 'var(--info-text)',
        display: 'flex', gap: 10, alignItems: 'flex-start',
      }}>
        <Lightbulb size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>
          For boards with component density higher than 15 units/cm², use
          <strong> SAHI Tile-based</strong> to ensure all miniature SMD components are detected.
        </span>
      </div>
    </div>
  );
}
