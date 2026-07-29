import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDropzone } from 'react-dropzone';
import {
  getDatasetList, uploadDatasetImg,
  deleteDatasetImg, getAdminUser, adminLogout
} from '../../services/adminApi';

const CLASSES_17 = [
  "Button","Capacitor","Connector","Diode","Zener_Diode",
  "Fuse","IC","Inductor","Jumper","LED","MOSFET","MOV",
  "Potentiometer","Resistor","Switch","Transformer","Transistor"
];

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

export default function AdminDataset() {
  const [dataset,    setDataset]    = useState({ images:[], total:0, summary:{} });
  const [selClass,   setSelClass]   = useState('');
  const [uploading,  setUploading]  = useState(false);
  const [uploadCls,  setUploadCls]  = useState(CLASSES_17[0]);
  const [progress,   setProgress]   = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [msg,        setMsg]        = useState('');
  const navigate = useNavigate();

  const load = (cls='') => {
    getDatasetList(cls||undefined, 100, 0)
      .then(setDataset).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const onDrop = useCallback((accepted) => {
    setUploadedFiles(accepted);
    setMsg('');
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg','.jpeg','.png','.webp'] },
    multiple: true,
  });

  const uploadAll = async () => {
    if (!uploadedFiles.length) return;
    setUploading(true); setProgress(0); setMsg('');
    let done = 0;
    for (const file of uploadedFiles) {
      try {
        await uploadDatasetImg(file, uploadCls,
          e => setProgress(Math.round((e.loaded/e.total)*100)));
        done++;
      } catch (e) {
        setMsg(`Error: ${e?.response?.data?.detail || e.message}`);
      }
    }
    setUploading(false);
    setUploadedFiles([]);
    setMsg(`✅ Uploaded ${done}/${uploadedFiles.length} images as ${uploadCls}`);
    load(selClass);
  };

  const delImg = async (id) => {
    if (!window.confirm('Delete this image?')) return;
    await deleteDatasetImg(id);
    load(selClass);
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
          <NavBtn to="/admin/dataset" icon="⊡" label="Dataset"   navigate={navigate} active/>
          <NavBtn to="/admin/train"   icon="⚙" label="Training"  navigate={navigate}/>
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
          Dataset Management
        </div>
        <div style={{ fontSize:12, color:'#64748b', marginBottom:20 }}>
          Upload component images to improve model accuracy
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1.4fr', gap:16 }}>

          {/* Upload panel */}
          <div>
            <div style={{ background:'#fff', border:'0.5px solid #e2e8f0',
              borderRadius:12, padding:16, marginBottom:12 }}>
              <div style={{ fontSize:12, fontWeight:500, color:'#475569',
                textTransform:'uppercase', letterSpacing:0.5, marginBottom:14 }}>
                Upload Images
              </div>

              {/* Class selector */}
              <div style={{ marginBottom:12 }}>
                <div style={{ fontSize:11, color:'#64748b', marginBottom:5 }}>
                  Component class
                </div>
                <select value={uploadCls} onChange={e => setUploadCls(e.target.value)}
                  style={{ width:'100%', padding:'8px 10px', borderRadius:8,
                    border:'0.5px solid #e2e8f0', fontSize:12,
                    background:'#f8fafc', color:'#0f172a' }}>
                  {CLASSES_17.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Dropzone */}
              <div {...getRootProps()} style={{
                border:`1.5px dashed ${isDragActive ? '#7dd3fc':'#e2e8f0'}`,
                borderRadius:10, padding:'28px 16px', textAlign:'center',
                background: isDragActive ? '#e6f1fb':'#f8fafc',
                cursor:'pointer', marginBottom:10,
              }}>
                <input {...getInputProps()}/>
                <div style={{ fontSize:28, marginBottom:8, color:'#94a3b8' }}>↑</div>
                <div style={{ fontSize:13, fontWeight:500, color:'#475569' }}>
                  {uploadedFiles.length > 0
                    ? `${uploadedFiles.length} file(s) selected`
                    : 'Drop images here'}
                </div>
                <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>
                  Multiple files supported — JPG, PNG
                </div>
              </div>

              {/* File list preview */}
              {uploadedFiles.length > 0 && (
                <div style={{ background:'#f8fafc', borderRadius:8,
                  padding:'8px 10px', marginBottom:10, maxHeight:120, overflowY:'auto' }}>
                  {uploadedFiles.map((f,i) => (
                    <div key={i} style={{ fontSize:11, color:'#475569',
                      padding:'2px 0', display:'flex', justifyContent:'space-between' }}>
                      <span>{f.name}</span>
                      <span style={{ color:'#94a3b8' }}>{(f.size/1024).toFixed(0)}KB</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Progress */}
              {uploading && (
                <div style={{ marginBottom:10 }}>
                  <div style={{ fontSize:11, color:'#64748b', marginBottom:3 }}>
                    Uploading... {progress}%
                  </div>
                  <div style={{ height:4, background:'#e2e8f0', borderRadius:2 }}>
                    <div style={{ height:'100%', background:'#1e3a5f',
                      borderRadius:2, width:`${progress}%` }}/>
                  </div>
                </div>
              )}

              {/* Message */}
              {msg && (
                <div style={{ padding:'8px 10px', borderRadius:8, marginBottom:10,
                  background: msg.startsWith('✅') ? '#f0fdf4':'#fef2f2',
                  color: msg.startsWith('✅') ? '#15803d':'#b91c1c', fontSize:12 }}>
                  {msg}
                </div>
              )}

              <button onClick={uploadAll}
                disabled={uploading || uploadedFiles.length === 0}
                style={{ width:'100%', padding:'9px', borderRadius:8, border:'none',
                  background: uploadedFiles.length===0 ? '#f1f5f9':'#1e3a5f',
                  color: uploadedFiles.length===0 ? '#94a3b8':'#7dd3fc',
                  fontSize:13, fontWeight:500,
                  cursor: uploadedFiles.length===0 ? 'not-allowed':'pointer' }}>
                {uploading ? '⟳ Uploading...' : `↑ Upload as ${uploadCls}`}
              </button>
            </div>

            {/* Class summary */}
            <div style={{ background:'#fff', border:'0.5px solid #e2e8f0',
              borderRadius:12, padding:16 }}>
              <div style={{ fontSize:12, fontWeight:500, color:'#475569',
                textTransform:'uppercase', letterSpacing:0.5, marginBottom:12 }}>
                Images per Class
              </div>
              {CLASSES_17.map(cls => {
                const cnt = dataset.summary?.[cls] || 0;
                const color = cnt===0?'#ef4444':cnt<5?'#f59e0b':'#22c55e';
                return (
                  <div key={cls}
                    onClick={() => { setSelClass(cls===selClass?'':cls); load(cls===selClass?'':cls); }}
                    style={{ display:'flex', alignItems:'center', gap:8,
                      padding:'5px 6px', borderRadius:6, cursor:'pointer', marginBottom:2,
                      background: selClass===cls ? '#e6f1fb':'transparent' }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:color }}/>
                    <span style={{ flex:1, fontSize:11, color:'#475569' }}>{cls}</span>
                    <span style={{ fontSize:11, fontWeight:500, color }}>{cnt}</span>
                  </div>
                );
              })}
              <div style={{ marginTop:10, paddingTop:10,
                borderTop:'0.5px solid #e2e8f0',
                display:'flex', justifyContent:'space-between',
                fontSize:11, color:'#64748b' }}>
                <span>Total</span>
                <span style={{ fontWeight:500 }}>{dataset.total}</span>
              </div>
            </div>
          </div>

          {/* Image grid */}
          <div style={{ background:'#fff', border:'0.5px solid #e2e8f0',
            borderRadius:12, padding:16, overflow:'hidden',
            display:'flex', flexDirection:'column' }}>
            <div style={{ display:'flex', justifyContent:'space-between',
              alignItems:'center', marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:500, color:'#475569',
                textTransform:'uppercase', letterSpacing:0.5 }}>
                {selClass ? `${selClass} Images` : 'All Images'}
              </div>
              <div style={{ display:'flex', gap:6 }}>
                {selClass && (
                  <button onClick={() => { setSelClass(''); load(''); }}
                    style={{ padding:'4px 10px', borderRadius:5,
                      border:'0.5px solid #e2e8f0', fontSize:11,
                      background:'transparent', cursor:'pointer', color:'#64748b' }}>
                    ✕ Clear filter
                  </button>
                )}
                <span style={{ fontSize:11, color:'#94a3b8',
                  alignSelf:'center' }}>
                  {dataset.images.length} images
                </span>
              </div>
            </div>

            {dataset.images.length === 0
              ? <div style={{ flex:1, display:'flex', alignItems:'center',
                  justifyContent:'center', color:'#94a3b8', fontSize:12 }}>
                  No images uploaded yet — use the upload panel
                </div>
              : <div style={{ flex:1, overflowY:'auto',
                  display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px,1fr))',
                  gap:8, alignContent:'start' }}>
                  {dataset.images.map(img => (
                    <div key={img.id} style={{ position:'relative',
                      border:'0.5px solid #e2e8f0', borderRadius:8, overflow:'hidden',
                      background:'#f8fafc' }}>
                      <div style={{ height:80, display:'flex', alignItems:'center',
                        justifyContent:'center', background:'#f1f5f9',
                        fontSize:24, color:'#94a3b8' }}>◈</div>
                      <div style={{ padding:'4px 6px' }}>
                        <div style={{ fontSize:9, fontWeight:500,
                          color:'#475569', marginBottom:1 }}>
                          {img.class_label}
                        </div>
                        <div style={{ fontSize:8, color:'#94a3b8',
                          fontFamily:'monospace', marginBottom:4 }}>
                          {img.filename.slice(0,12)}
                        </div>
                        <button onClick={() => delImg(img.id)}
                          style={{ width:'100%', padding:'2px', borderRadius:3,
                            border:'0.5px solid #fca5a5', background:'transparent',
                            fontSize:9, color:'#ef4444', cursor:'pointer' }}>
                          Delete
                        </button>
                      </div>
                      {img.used && (
                        <div style={{ position:'absolute', top:4, right:4,
                          background:'#22c55e', borderRadius:3,
                          fontSize:8, padding:'1px 4px', color:'#fff' }}>
                          trained
                        </div>
                      )}
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>
      </div>
    </div>
  );
}