import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getAnnotations, saveAnnotations,
  getAdminUser, adminLogout
} from '../../services/adminApi';

const CLASSES_17 = [
  "Button","Capacitor","Connector","Diode","Zener_Diode",
  "Fuse","IC","Inductor","Jumper","LED","MOSFET","MOV",
  "Potentiometer","Resistor","Switch","Transformer","Transistor"
];

const COLORS = [
  '#ef4444','#f59e0b','#22c55e','#3b82f6','#a855f7',
  '#ec4899','#06b6d4','#84cc16','#f97316','#6366f1',
];

const CLOSE_DIST = 12; // px distance to first point that auto-closes the polygon

export default function AdminAnnotate() {
  const { imageId } = useParams();
  const navigate = useNavigate();
  const canvasRef = useRef(null);
  const imgRef    = useRef(null);

  const [imgSrc,    setImgSrc]    = useState(null);
  const [loadError, setLoadError] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);

  const [boxes,      setBoxes]      = useState([]); // saved {x1,y1,x2,y2,class}
  const [polyPoints, setPolyPoints] = useState([]);  // in-progress lasso points
  const [selClass,   setSelClass]   = useState(CLASSES_17[0]);
  const [selBoxIdx,  setSelBoxIdx]  = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [msg,        setMsg]        = useState('');

  // ── Fetch image with auth token (plain <img src> can't send headers) ──
  useEffect(() => {
    const token = localStorage.getItem('admin_token');
    const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

    fetch(`${API_BASE}/api/admin/dataset/${imageId}/image`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.blob();
      })
      .then(blob => setImgSrc(URL.createObjectURL(blob)))
      .catch(err => setLoadError(`Failed to load image: ${err.message}`));

    return () => { if (imgSrc) URL.revokeObjectURL(imgSrc); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageId]);

  // ── Load existing annotations ──────────────────────────────────────
  useEffect(() => {
    getAnnotations(imageId).then(data => {
      if (data.boxes?.length) {
        setBoxes(data.boxes.map(b => ({ _norm: b })));
      }
    }).catch(() => {});
  }, [imageId]);

  // Convert pending normalized boxes to pixel coords once image is loaded
  useEffect(() => {
    if (!imgLoaded || !imgRef.current) return;
    setBoxes(prev => prev.map(b => {
      if (!b._norm) return b;
      const iw = imgRef.current.naturalWidth;
      const ih = imgRef.current.naturalHeight;
      const n = b._norm;
      const w = n.width * iw, h = n.height * ih;
      const cx = n.x_center * iw, cy = n.y_center * ih;
      return { x1: cx - w/2, y1: cy - h/2, x2: cx + w/2, y2: cy + h/2, class: n.class_label };
    }));
  }, [imgLoaded]);

  // ── Drawing (canvas render) ────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const img    = imgRef.current;
    if (!canvas || !img || !imgLoaded) return;
    const ctx = canvas.getContext('2d');
    canvas.width  = img.naturalWidth;
    canvas.height = img.naturalHeight;
    ctx.drawImage(img, 0, 0);

    // Saved boxes — shown as rectangles (the actual YOLO training format)
    boxes.forEach((b, i) => {
      if (b._norm) return; // not yet converted
      const color = COLORS[CLASSES_17.indexOf(b.class) % COLORS.length];
      ctx.strokeStyle = i === selBoxIdx ? '#fff' : color;
      ctx.lineWidth = i === selBoxIdx ? 3 : 2;
      ctx.strokeRect(b.x1, b.y1, b.x2 - b.x1, b.y2 - b.y1);
      ctx.fillStyle = color;
      ctx.font = '14px sans-serif';
      const label = b.class;
      const tw = ctx.measureText(label).width;
      ctx.fillRect(b.x1, b.y1 - 18, tw + 8, 18);
      ctx.fillStyle = '#fff';
      ctx.fillText(label, b.x1 + 4, b.y1 - 4);
    });

    // In-progress polygon (lasso trace)
    if (polyPoints.length > 0) {
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(polyPoints[0].x, polyPoints[0].y);
      for (let i = 1; i < polyPoints.length; i++) {
        ctx.lineTo(polyPoints[i].x, polyPoints[i].y);
      }
      ctx.stroke();

      polyPoints.forEach((p, i) => {
        ctx.fillStyle = i === 0 ? '#22c55e' : '#7dd3fc';
        ctx.beginPath();
        ctx.arc(p.x, p.y, i === 0 ? 6 : 4, 0, Math.PI * 2);
        ctx.fill();
      });

      // Preview of the bounding box that will actually be saved
      if (polyPoints.length >= 2) {
        const xs = polyPoints.map(p => p.x);
        const ys = polyPoints.map(p => p.y);
        const x1 = Math.min(...xs), x2 = Math.max(...xs);
        const y1 = Math.min(...ys), y2 = Math.max(...ys);
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
        ctx.setLineDash([]);
      }
    }
  }, [boxes, polyPoints, selBoxIdx, imgLoaded]);

  useEffect(() => { redraw(); }, [redraw]);

  // ── Mouse / keyboard interaction ───────────────────────────────────
  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width  / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  };

  const closePolygon = useCallback(() => {
    setPolyPoints(current => {
      if (current.length < 3) return current;
      const xs = current.map(p => p.x);
      const ys = current.map(p => p.y);
      const x1 = Math.min(...xs), x2 = Math.max(...xs);
      const y1 = Math.min(...ys), y2 = Math.max(...ys);

      if ((x2 - x1) > 8 && (y2 - y1) > 8) {
        setBoxes(prevBoxes => [...prevBoxes, { x1, y1, x2, y2, class: selClass }]);
      }
      return [];
    });
  }, [selClass]);

  const cancelPolygon = () => setPolyPoints([]);

  const onCanvasClick = (e) => {
    const pos = getPos(e);

    if (polyPoints.length >= 3) {
      const first = polyPoints[0];
      const dist = Math.hypot(pos.x - first.x, pos.y - first.y);
      if (dist < CLOSE_DIST) {
        closePolygon();
        return;
      }
    }
    setPolyPoints(prev => [...prev, pos]);
  };

  const onCanvasDblClick = () => {
    if (polyPoints.length >= 3) closePolygon();
  };

  // Escape cancels, Enter closes
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') cancelPolygon();
      if (e.key === 'Enter' && polyPoints.length >= 3) closePolygon();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [polyPoints, closePolygon]);

  const deleteBox = (idx) => {
    setBoxes(prev => prev.filter((_, i) => i !== idx));
    setSelBoxIdx(null);
  };

  const changeBoxClass = (idx, cls) => {
    setBoxes(prev => prev.map((b, i) => i === idx ? { ...b, class: cls } : b));
  };

  // ── Save ────────────────────────────────────────────────────────────
  const save = async () => {
    const readyBoxes = boxes.filter(b => !b._norm);
    if (!readyBoxes.length) { setMsg('❌ Draw at least one shape first'); return; }
    setSaving(true); setMsg('');

    const iw = imgRef.current.naturalWidth;
    const ih = imgRef.current.naturalHeight;

    const normBoxes = readyBoxes.map(b => ({
      class_label: b.class,
      x_center: ((b.x1 + b.x2) / 2) / iw,
      y_center: ((b.y1 + b.y2) / 2) / ih,
      width:    (b.x2 - b.x1) / iw,
      height:   (b.y2 - b.y1) / ih,
    }));

    try {
      await saveAnnotations(imageId, normBoxes);
      setMsg(`✅ Saved ${readyBoxes.length} boxes`);
    } catch (e) {
      setMsg(`❌ ${e?.response?.data?.detail || 'Save failed'}`);
    } finally {
      setSaving(false);
    }
  };

  const readyBoxCount = boxes.filter(b => !b._norm).length;

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
        <div style={{ padding:'12px 14px', flex:1, overflowY:'auto' }}>
          <div onClick={() => navigate('/admin/dataset')}
            style={{ fontSize:12, color:'#7dd3fc', cursor:'pointer', marginBottom:16 }}>
            ← Back to Dataset
          </div>

          <div style={{ fontSize:11, color:'#6b8099', textTransform:'uppercase',
            letterSpacing:0.5, marginBottom:8 }}>Instructions</div>
          <div style={{ fontSize:11, color:'#8aa4ba', lineHeight:1.7 }}>
            1. Select a class below<br/>
            2. Click points around the component edge (lasso trace)<br/>
            3. Click near the green start point — or double-click, or press
            Enter — to close the shape<br/>
            4. Press Escape to cancel the current shape<br/>
            5. Repeat for every component, then Save
          </div>

          <div style={{ marginTop:20, fontSize:11, color:'#6b8099',
            textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>
            Class to draw
          </div>
          <select value={selClass} onChange={e => setSelClass(e.target.value)}
            style={{ width:'100%', padding:'8px 10px', borderRadius:8,
              border:'0.5px solid rgba(255,255,255,0.15)', fontSize:12,
              background:'rgba(255,255,255,0.06)', color:'#fff' }}>
            {CLASSES_17.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          <div style={{ marginTop:16, fontSize:11, color:'#6b8099',
            textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>
            Boxes drawn ({readyBoxCount})
          </div>
          <div style={{ maxHeight:220, overflowY:'auto' }}>
            {boxes.map((b, i) => b._norm ? null : (
              <div key={i}
                onClick={() => setSelBoxIdx(i)}
                style={{ display:'flex', alignItems:'center', gap:6,
                  padding:'5px 6px', borderRadius:5, marginBottom:3,
                  background: selBoxIdx===i ? 'rgba(125,211,252,0.15)':'transparent',
                  cursor:'pointer' }}>
                <div style={{ width:8, height:8, borderRadius:2,
                  background: COLORS[CLASSES_17.indexOf(b.class)%COLORS.length] }}/>
                <select value={b.class}
                  onClick={e => e.stopPropagation()}
                  onChange={e => changeBoxClass(i, e.target.value)}
                  style={{ flex:1, fontSize:10, padding:'2px 4px',
                    background:'transparent', color:'#cbd5e1', border:'none' }}>
                  {CLASSES_17.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <span onClick={(e) => { e.stopPropagation(); deleteBox(i); }}
                  style={{ fontSize:11, color:'#ef4444', cursor:'pointer' }}>✕</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding:'10px 14px', borderTop:'0.5px solid rgba(255,255,255,0.08)'}}>
          <div onClick={adminLogout} style={{ fontSize:11, color:'#ef4444', cursor:'pointer'}}>
            ⊗ Sign out
          </div>
        </div>
      </div>

      {/* Canvas area */}
      <div style={{ flex:1, display:'flex', flexDirection:'column',
        background:'#f0f4f8' }}>
        <div style={{ padding:'14px 20px', background:'#fff',
          borderBottom:'0.5px solid #e2e8f0',
          display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ fontSize:14, fontWeight:600 }}>Annotate Image</div>

          {polyPoints.length > 0 && (
            <span style={{ fontSize:12, color:'#185fa5' }}>
              Drawing: {polyPoints.length} points — click near start to close, Esc to cancel
            </span>
          )}

          {msg && (
            <span style={{ fontSize:12,
              color: msg.startsWith('✅') ? '#15803d':'#b91c1c' }}>{msg}</span>
          )}

          <button onClick={cancelPolygon}
            disabled={polyPoints.length === 0}
            style={{ marginLeft: polyPoints.length ? 0 : 'auto',
              padding:'6px 14px', borderRadius:8,
              border:'0.5px solid #e2e8f0', background:'transparent',
              fontSize:12, color:'#64748b',
              cursor: polyPoints.length ? 'pointer':'not-allowed' }}>
            Cancel shape
          </button>

          <button onClick={save} disabled={saving}
            style={{ marginLeft: polyPoints.length ? 0 : undefined,
              padding:'8px 20px', borderRadius:8,
              border:'none', background:'#1e3a5f', color:'#7dd3fc',
              fontSize:12, fontWeight:500, cursor:'pointer' }}>
            {saving ? '⟳ Saving...' : `💾 Save ${readyBoxCount} boxes`}
          </button>
        </div>

        <div style={{ flex:1, display:'flex', alignItems:'center',
          justifyContent:'center', overflow:'auto', padding:20 }}>

          {loadError && (
            <div style={{ color:'#ef4444', fontSize:12 }}>⚠ {loadError}</div>
          )}

          {imgSrc && (
            <img ref={imgRef} src={imgSrc}
              onLoad={() => setImgLoaded(true)}
              style={{ display:'none' }} alt=""/>
          )}

          {imgLoaded && (
            <canvas
              ref={canvasRef}
              onClick={onCanvasClick}
              onDoubleClick={onCanvasDblClick}
              style={{ maxWidth:'100%', maxHeight:'70vh',
                border:'1px solid #e2e8f0', borderRadius:8,
                cursor:'crosshair', background:'#fff' }}
            />
          )}

          {!imgLoaded && !loadError && (
            <div style={{ color:'#94a3b8', fontSize:12 }}>Loading image...</div>
          )}
        </div>
      </div>
    </div>
  );
}
