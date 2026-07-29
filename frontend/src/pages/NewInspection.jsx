import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useNavigate } from 'react-router-dom';
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
    accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'] },
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

  const Toggle = ({ value, onChange, label, sub, icon }) => (
    <div style={{ flex:1, background:'#fff', border:'0.5px solid var(--border)',
      borderRadius:10, padding:'12px 14px', display:'flex', alignItems:'center', gap:10 }}>
      <span style={{ fontSize:18 }}>{icon}</span>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:12, fontWeight:500 }}>{label}</div>
        <div style={{ fontSize:11, color:'var(--text-muted)' }}>{sub}</div>
      </div>
      <div onClick={() => onChange(!value)}
        style={{ width:36, height:20, borderRadius:10, cursor:'pointer',
          background: value ? '#1e3a5f' : 'var(--border)', position:'relative',
          transition:'background 0.2s', flexShrink:0 }}>
        <div style={{ width:16, height:16, borderRadius:'50%', position:'absolute',
          top:2, left: value ? 18 : 2, transition:'left 0.2s',
          background: value ? '#7dd3fc' : '#fff' }} />
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Dropzone */}
      <div {...getRootProps()} style={{
        border: `1.5px dashed ${isDragActive ? '#7dd3fc' : 'var(--border)'}`,
        borderRadius:12, padding:'40px 24px', textAlign:'center',
        marginBottom:16, background: isDragActive ? '#e6f1fb' : '#fff',
        cursor:'pointer', transition:'all 0.2s',
      }}>
        <input {...getInputProps()} />
        {preview
          ? <img src={preview} alt="preview"
              style={{ maxHeight:200, maxWidth:'100%', borderRadius:8, marginBottom:10 }}/>
          : <div style={{ fontSize:40, marginBottom:12, color:'var(--text-muted)' }}>↑</div>
        }
        <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>
          {preview ? file.name : 'Drop PCB image here'}
        </div>
        <div style={{ fontSize:12, color:'var(--text-muted)' }}>
          {preview
            ? `${(file.size / 1024).toFixed(0)} KB — click to change`
            : 'Supports JPG, PNG, WEBP — max 10 MB'}
        </div>
        {!preview && (
          <div style={{ marginTop:14, display:'inline-block', padding:'7px 18px',
            border:'0.5px solid var(--border)', borderRadius:8,
            fontSize:12, background:'#fff' }}>
            ⊞ Browse files
          </div>
        )}
      </div>

      {/* Detection mode */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        {[
          { key:false, title:'Standard 640px', tag:'', desc:'Fast detection — large components' },
          { key:true,  title:'SAHI Tile-based', tag:'Recommended', desc:'Detects small SMD components' },
        ].map(m => (
          <div key={String(m.key)} onClick={() => setUseSahi(m.key)}
            style={{ background:'#fff', border:`0.5px solid ${useSahi===m.key ? '#7dd3fc':'var(--border)'}`,
              borderRadius:10, padding:'12px 14px', cursor:'pointer' }}>
            <div style={{ fontSize:13, fontWeight:500, marginBottom:3 }}>
              {m.title}
              {m.tag && <span style={{ marginLeft:6, fontSize:10, padding:'1px 6px',
                borderRadius:3, background:'#e6f1fb', color:'#185fa5' }}>{m.tag}</span>}
            </div>
            <div style={{ fontSize:11, color:'var(--text-muted)' }}>{m.desc}</div>
          </div>
        ))}
      </div>

      {/* Toggles */}
      <div style={{ display:'flex', gap:10, marginBottom:14 }}>
        <Toggle value={damage} onChange={setDamage} icon="👁"
          label="Damage detection" sub="MobileNetV2 visual analysis" />
        <Toggle value={ocr} onChange={setOcr} icon="⊡"
          label="OCR marking read" sub="PaddleOCR text extraction" />
      </div>

      {/* Error */}
      {error && (
        <div style={{ padding:'10px 14px', background:'var(--danger-bg)',
          border:'0.5px solid #fca5a5', borderRadius:8,
          color:'var(--danger-text)', fontSize:12, marginBottom:12 }}>
          ⚠ {error}
        </div>
      )}

      {/* Progress */}
      {loading && (
        <div style={{ marginBottom:12 }}>
          <div style={{ display:'flex', justifyContent:'space-between',
            fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>
            <span>Running inspection...</span><span>{progress}%</span>
          </div>
          <div style={{ height:4, background:'var(--border)', borderRadius:2 }}>
            <div style={{ height:'100%', background:'#7dd3fc', borderRadius:2,
              width:`${progress}%`, transition:'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* Start button */}
      <button onClick={startInspection} disabled={loading || !file}
        style={{ width:'100%', padding:11, borderRadius:8, border:'none',
          background: loading||!file ? '#334155' : '#1e3a5f',
          color: loading||!file ? '#64748b' : '#7dd3fc',
          fontSize:13, fontWeight:500, cursor: loading||!file ? 'not-allowed':'pointer' }}>
        {loading ? `⟳ Processing... ${progress}%` : '⊡ Start Inspection'}
      </button>

      {/* Tip */}
      <div style={{ marginTop:14, padding:'10px 14px', background:'#e6f1fb',
        borderRadius:8, fontSize:11, color:'#185fa5' }}>
        💡 For boards with component density higher than 15 units/cm², use SAHI Tile-based
        to ensure all miniature SMD components are detected.
      </div>
    </div>
  );
}