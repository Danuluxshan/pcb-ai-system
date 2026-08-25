import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  UploadCloud, Database, PenSquare, Trash2, FolderInput, LayoutGrid,
} from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import {
  getDatasetList, uploadDatasetImg, deleteDatasetImg, getAdminStats,
} from '../../services/adminApi';

const CLASSES_17 = [
  "Button", "Capacitor", "Connector", "Diode", "Zener_Diode",
  "Fuse", "IC", "Inductor", "Jumper", "LED", "MOSFET", "MOV",
  "Potentiometer", "Resistor", "Switch", "Transformer", "Transistor"
];
const BLOCK_THRESHOLD = 500;
const LOW_THRESHOLD = 400;
const ORIGINAL_DATASET_COUNTS = {
  Button: 411, Capacitor: 112893, Connector: 7901, Diode: 3012,
  Zener_Diode: 1107, Fuse: 66, IC: 16447, Inductor: 2239,
  Jumper: 7572, LED: 5089, MOSFET: 3317, MOV: 3351,
  Potentiometer: 54, Resistor: 117777, Switch: 276,
  Transformer: 6535, Transistor: 8769,
};

export default function AdminDataset() {
  const [stats, setStats] = useState(null);
  const [dataset, setDataset] = useState({ images: [], total: 0, summary: {} });
  const [selClass, setSelClass] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadCls, setUploadCls] = useState('');
  const [uploadType, setUploadType] = useState('board');
  const [progress, setProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [msg, setMsg] = useState('');
  const [thumbUrls, setThumbUrls] = useState({});
  const navigate = useNavigate();

  const loadStats = () => getAdminStats().then(setStats).catch(() => { });
  const loadData = (cls = '') => getDatasetList(cls || undefined, 100, 0).then(setDataset).catch(() => { });

  useEffect(() => { loadStats(); loadData(); }, []);
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
    dataset.images.forEach(img => {
      if (thumbUrls[img.id]) return;
      fetch(`${API_BASE}/api/admin/dataset/${img.id}/image`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.ok ? res.blob() : Promise.reject())
        .then(blob => {
          const url = URL.createObjectURL(blob);
          setThumbUrls(prev => ({ ...prev, [img.id]: url }));
        })
        .catch(() => { });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset.images]);

  useEffect(() => {
    if (stats && !uploadCls) {
      const firstLow = CLASSES_17.find(c => stats.class_status?.[c]?.status === 'low');
      setUploadCls(firstLow || CLASSES_17[0]);
    }
  }, [stats]);


  const canUpload = (cls) => stats?.class_status?.[cls]?.can_upload !== false;

  const onDrop = useCallback((accepted) => { setUploadedFiles(accepted); setMsg(''); }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop, accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp'] }, multiple: true,
    disabled: uploadType === 'single' && !canUpload(uploadCls),
  });

  const getStatusColor = (cls) => {
    const s = stats?.class_status?.[cls]?.status;
    return s === 'blocked' ? '#ef4444' : s === 'sufficient' ? '#f59e0b' : '#22c55e';
  };
  const selectedStatus = stats?.class_status?.[uploadCls];

  const uploadAll = async () => {
    if (!uploadedFiles.length) { setMsg('❌ Please select or drop image(s) to upload first'); return; }
    const targetClass = uploadType === 'board' ? 'PCB_Board' : uploadCls;
    if (uploadType === 'single') {
      const cs = stats?.class_status?.[uploadCls];
      if (cs && !cs.can_upload) { setMsg(`❌ ${uploadCls} is blocked — already has ${cs.admin_count} images`); return; }
    }
    setUploading(true); setProgress(0); setMsg('');
    let done = 0;
    for (const file of uploadedFiles) {
      try {
        await uploadDatasetImg(file, targetClass, e => setProgress(Math.round((e.loaded / e.total) * 100)));
        done++;
      } catch (e) {
        setMsg(`❌ ${e?.response?.data?.detail || e.message}`);
        break;
      }
    }
    setUploading(false); setUploadedFiles([]);
    if (done === uploadedFiles.length) setMsg(`✅ Uploaded ${done} images as ${targetClass === 'PCB_Board' ? 'PCB Board' : targetClass}`);
    loadStats(); loadData(selClass);
  };

  const delImg = async (id) => {
    if (!window.confirm('Delete this image?')) return;
    await deleteDatasetImg(id);
    loadStats(); loadData(selClass);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0d1520' }}>
      <AdminSidebar active="/admin/dataset" />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--page-bg)' }}>
        <div style={{ padding: '22px 26px 0' }} className="fade-in">
          <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.4, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={22} color="var(--accent-strong)" /> Dataset Management
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 14 }}>
            Upload images for underrepresented classes to improve model accuracy
          </div>

          <div className="card" style={{ display: 'flex', gap: 20, padding: '10px 16px', marginBottom: 16, fontSize: 11 }}>
            <span style={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 5 }}>● Low (&lt;{LOW_THRESHOLD}) — Upload needed</span>
            <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 5 }}>● Sufficient</span>
            <span style={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 5 }}>● Blocked (&gt;{BLOCK_THRESHOLD})</span>
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'hidden', padding: '0 26px 26px', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 16, minHeight: 0 }}>

          {/* LEFT */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto' }}>

            <div className="card fade-in-up" style={{ padding: 18 }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
                Upload Images
              </div>

              <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--page-bg)', borderRadius: 10, padding: 3 }}>
                {[{ k: 'board', l: '📋 Full PCB Board' }, { k: 'single', l: '🔍 Single Component' }].map(t => (
                  <div key={t.k} onClick={() => { setUploadType(t.k); setMsg(''); }}
                    style={{
                      flex: 1, padding: '7px', borderRadius: 8, textAlign: 'center', fontSize: 11, fontWeight: 600, cursor: 'pointer',
                      background: uploadType === t.k ? '#fff' : 'transparent',
                      color: uploadType === t.k ? 'var(--text-primary)' : 'var(--text-muted)',
                      boxShadow: uploadType === t.k ? 'var(--shadow-xs)' : 'none',
                    }}>{t.l}</div>
                ))}
              </div>

              {uploadType === 'board' ? (
                <div className="badge badge-info" style={{ display: 'block', padding: '8px 10px', marginBottom: 12, lineHeight: 1.5, fontSize: 11 }}>
                  Upload a full PCB board photo. Draw boxes and assign classes per component on the Annotate page.
                </div>
              ) : (
                <div style={{ marginBottom: 12 }}>
                  <select value={uploadCls} onChange={e => { setUploadCls(e.target.value); setMsg(''); }}
                    className="input-modern" style={{ width: '100%', fontSize: 11.5, padding: '8px 10px' }}>
                    {CLASSES_17.map(c => {
                      const s = stats?.class_status?.[c];
                      const ic = s?.status === 'blocked' ? '🚫' : s?.status === 'sufficient' ? '⚠️' : '🟢';
                      return <option key={c} value={c}>{ic} {c} ({s?.admin_count || 0})</option>;
                    })}
                  </select>
                  {selectedStatus && (
                    <div style={{
                      marginTop: 6, padding: '6px 10px', borderRadius: 8, fontSize: 10.5,
                      background: selectedStatus.status === 'blocked' ? 'var(--danger-bg)' : selectedStatus.status === 'sufficient' ? 'var(--warning-bg)' : 'var(--success-bg)',
                      color: selectedStatus.status === 'blocked' ? 'var(--danger-text)' : selectedStatus.status === 'sufficient' ? 'var(--warning-text)' : 'var(--success-text)',
                    }}>
                      {selectedStatus.admin_count}/{BLOCK_THRESHOLD} admin images
                    </div>
                  )}
                </div>
              )}

              <div {...getRootProps()}
                onClick={
                  uploadType === 'single' && !canUpload(uploadCls)
                    ? (e) => {
                      e.stopPropagation();
                      setMsg(`❌ "${uploadCls}" is blocked — already has sufficient data (limit: ${BLOCK_THRESHOLD}). Choose a different class to upload.`);
                    }
                    : getRootProps().onClick
                }
                style={{
                  border: `2px dashed ${uploadType === 'single' && !canUpload(uploadCls) ? '#ef4444' : isDragActive ? 'var(--accent-strong)' : 'var(--border-strong)'}`,
                  borderRadius: 14, padding: '22px 14px', textAlign: 'center',
                  background: uploadType === 'single' && !canUpload(uploadCls) ? 'var(--danger-bg)' : isDragActive ? 'var(--info-bg)' : 'var(--page-bg)',
                  cursor: uploadType === 'single' && !canUpload(uploadCls) ? 'not-allowed' : 'pointer',
                  marginBottom: 10,
                  transition: 'all 200ms ease',
                }}>
                <input {...getInputProps()} disabled={uploadType === 'single' && !canUpload(uploadCls)} />
                <UploadCloud size={22} color={uploadType === 'single' && !canUpload(uploadCls) ? '#ef4444' : 'var(--text-muted)'} style={{ marginBottom: 6 }} />
                <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {uploadedFiles.length > 0 ? `${uploadedFiles.length} file(s) selected` : 'Drop images here'}
                </div>
              </div>

              {uploading && (
                <div style={{ marginBottom: 10 }}>
                  <div style={{ height: 5, background: 'var(--page-bg)', borderRadius: 999, overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'linear-gradient(90deg,#38bdf8,#7dd3fc)', width: `${progress}%`, transition: 'width 300ms ease' }} />
                  </div>
                </div>
              )}
              {msg && <div className="badge" style={{ display: 'block', padding: '8px 10px', marginBottom: 10, background: msg.startsWith('✅') ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.startsWith('✅') ? 'var(--success-text)' : 'var(--danger-text)' }}>{msg}</div>}

              <button className="btn btn-primary" onClick={uploadAll}
                disabled={uploading}
                style={{
                  width: '100%', padding: 11,
                  opacity: (!uploading && (!uploadedFiles.length || (uploadType === 'single' && !canUpload(uploadCls)))) ? 0.5 : 1,
                  cursor: (!uploading && (!uploadedFiles.length || (uploadType === 'single' && !canUpload(uploadCls)))) ? 'not-allowed' : 'pointer',
                }}>
                {uploading ? 'Uploading...' : `Upload ${uploadedFiles.length ? `(${uploadedFiles.length})` : ''}`}
              </button>
            </div>

            <div className="card fade-in-up stagger-1" style={{ padding: 18, flex: 1, overflowY: 'auto' }}>
              <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>
                Class Status
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {CLASSES_17.map(cls => {
                  const s = stats?.class_status?.[cls], count = s?.admin_count || 0, pct = Math.min((count / BLOCK_THRESHOLD) * 100, 100);
                  const color = getStatusColor(cls), isSel = selClass === cls;
                  return (
                    <div key={cls} onClick={() => { setSelClass(isSel ? '' : cls); loadData(isSel ? '' : cls); }}
                      style={{ padding: '6px 6px', borderRadius: 8, cursor: 'pointer', marginBottom: 2, background: isSel ? 'var(--info-bg)' : 'transparent' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: color }} />
                        <span style={{ flex: 1, fontSize: 11, color: 'var(--text-secondary)' }}>{cls}</span>
                        <span style={{ fontSize: 10, color, fontWeight: 700 }}>+{count}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RIGHT — Image grid */}
          <div className="card fade-in-up stagger-2" style={{ padding: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 7 }}>
                <LayoutGrid size={14} /> {selClass || 'All Uploaded Images'}
              </div>
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{dataset.images.length} images</span>
            </div>

            {dataset.images.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>
                No images uploaded yet
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px,1fr))', gap: 10, alignItems: 'start', alignContent: 'start', gridAutoRows: 'min-content', minHeight: 0 }}>
                {dataset.images.map((img, i) => (
                  <div key={img.id} className={`card fade-in-up stagger-${Math.min(i % 6 + 1, 6)}`} style={{ overflow: 'hidden', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ height: 75, background: 'var(--page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                      {thumbUrls[img.id]
                        ? <img src={thumbUrls[img.id]} alt={img.filename} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : <span style={{ fontSize: 20, color: 'var(--text-muted)' }}>◈</span>}
                    </div>
                    <div style={{ padding: '7px 8px', flexShrink: 0 }}>
                      <div style={{ fontSize: 9.5, fontWeight: 700, color: img.class_label === 'PCB_Board' ? 'var(--info-text)' : 'var(--text-primary)', marginBottom: 5 }}>
                        {img.class_label === 'PCB_Board' ? '📋 PCB Board' : img.class_label}
                      </div>
                      <div style={{ fontSize: 8.5, color: 'var(--text-muted)', fontFamily: 'monospace', marginBottom: 5 }}>
                        {img.filename?.slice(0, 12)}
                      </div>
                      <button onClick={() => navigate(`/admin/annotate/${img.id}`)} style={{
                        width: '100%', padding: '3px', borderRadius: 5, fontSize: 8.5, cursor: 'pointer', marginBottom: 3,
                        border: img.class_label === 'PCB_Board' && !img.annotated ? '1px solid #f59e0b' : '1px solid var(--accent-strong)',
                        background: img.class_label === 'PCB_Board' && !img.annotated ? 'var(--warning-bg)' : 'transparent',
                        color: img.class_label === 'PCB_Board' && !img.annotated ? 'var(--warning-text)' : 'var(--accent-strong)',
                      }}><PenSquare size={9} style={{ display: 'inline', marginRight: 3 }} />{img.annotated ? `${img.box_count} boxes` : 'Annotate'}</button>
                      <button onClick={() => delImg(img.id)} style={{ width: '100%', padding: '3px', borderRadius: 5, border: '1px solid var(--danger-border)', background: 'transparent', fontSize: 8.5, color: 'var(--danger-text)', cursor: 'pointer' }}>
                        <Trash2 size={9} style={{ display: 'inline', marginRight: 3 }} />Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
