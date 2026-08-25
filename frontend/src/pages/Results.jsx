import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import {
  ZoomIn, ZoomOut, Maximize2, Info, ScanText, Flame, Cpu, CheckCircle2,
  XCircle, Clock, Stethoscope, FileText, ScanLine,
} from 'lucide-react';
import { getInspection, staticUrl, downloadReport } from '../services/api';

const SEV_COLOR = {
  none: { bg: 'var(--success-bg)', color: 'var(--success-text)', label: 'Healthy' },
  minor: { bg: 'var(--warning-bg)', color: 'var(--warning-text)', label: 'Minor' },
  moderate: { bg: '#fff3e6', color: '#c2410c', label: 'Moderate' },
  critical: { bg: 'var(--danger-bg)', color: 'var(--danger-text)', label: 'Critical' },
};

const COMP_ICON_COLOR = {
  IC: '#38bdf8', Capacitor: '#22c55e', Resistor: '#f59e0b',
  Diode: '#a855f7', LED: '#a855f7', Transistor: '#f97316',
  MOSFET: '#0ea5e9', Connector: '#64748b', default: '#94a3b8',
};

export default function Results() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [result, setResult] = useState(location.state?.result || null);
  const [selected, setSelected] = useState(null);
  const [tab, setTab] = useState('info');
  const [loading, setLoading] = useState(!result);

  // Zoom / pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imgRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (!result && id) {
      getInspection(id)
        .then(d => { setResult(d); setSelected(d.components?.[0] || null); setLoading(false); })
        .catch(() => setLoading(false));
    } else if (result) {
      setSelected(result.components?.[0] || null);
      setLoading(false);
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const getMinZoom = () => {
    if (!imgRef.current || !panelRef.current) return 0.5;
    const iw = imgRef.current.naturalWidth || imgRef.current.offsetWidth;
    const ih = imgRef.current.naturalHeight || imgRef.current.offsetHeight;
    const pw = panelRef.current.offsetWidth;
    const ph = panelRef.current.offsetHeight;
    if (!iw || !ih) return 0.5;
    return Math.min(pw / iw, ph / ih, 1);
  };

  const handleImgLoad = () => {
    const min = getMinZoom();
    setZoom(min);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const min = getMinZoom();
    setZoom(z => Math.min(5, Math.max(min, z - e.deltaY * 0.001)));
  };

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.addEventListener('wheel', handleWheel, { passive: false });
    return () => panel.removeEventListener('wheel', handleWheel);
  }, [zoom]);
  const handleMouseDown = (e) => { setDragging(true); setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y }); };
  const handleMouseMove = (e) => { if (dragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y }); };
  const handleMouseUp = () => setDragging(false);
  const resetView = () => { setZoom(getMinZoom()); setPan({ x: 0, y: 0 }); };

  if (loading) return (
    <div style={{ padding: 60 }}>
      <div className="skeleton" style={{ height: 300, borderRadius: 18, marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 60, borderRadius: 12 }} />
    </div>
  );

  if (!result) return (
    <div className="card fade-in" style={{ textAlign: 'center', padding: 60 }}>
      <div style={{
        width: 56, height: 56, borderRadius: 16, background: 'var(--page-bg)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px', color: 'var(--text-muted)',
      }}>
        <ScanLine size={24} />
      </div>
      <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 16 }}>
        No inspection loaded
      </div>
      <button className="btn btn-primary" onClick={() => navigate('/inspect')} style={{ margin: '0 auto', padding: '10px 22px' }}>
        Start New Inspection
      </button>
    </div>
  );

  const comps = result.components || [];
  const groups = comps.reduce((acc, c) => {
    if (!acc[c.class_name]) acc[c.class_name] = [];
    acc[c.class_name].push(c);
    return acc;
  }, {});

  const good = comps.filter(c => c.diagnosis?.includes('Good')).length;
  const bad = comps.filter(c => c.diagnosis && !c.diagnosis.includes('Good')).length;
  const pending = comps.length - good - bad;

  return (
    <div className="fade-in" style={{
      display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16,
      height: 'calc(100vh - 88px)', minHeight: 0,
    }}>
      <style>{`
  @keyframes bboxBlink {
    0%, 100% { opacity: 1; border-color: #fbbf24;background-color: rgba(0, 240, 32, 0.57); }
    50% { opacity: 0.35; border-color: #f59e0b; background-color: rgba(5, 134, 52, 0.69); }
  }
`}</style>

      {/* LEFT */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto', minHeight: 0 }}>

        <div className="card fade-in-up" style={{ overflow: 'hidden', flexShrink: 0 }}>
          <div
            ref={panelRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            style={{
              background: '#0d1520', height: 320, overflow: 'hidden', position: 'relative',
              cursor: dragging ? 'grabbing' : zoom > getMinZoom() ? 'grab' : 'default',
              userSelect: 'none',
            }}>
            {result.annotated_image_url ? (
              <div style={{
                position: 'absolute', top: '50%', left: '50%',
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
                transformOrigin: 'center',
                transition: dragging ? 'none' : 'transform 120ms ease',
              }}>
                <img
                  ref={imgRef}
                  src={staticUrl(result.annotated_image_url)}
                  alt="annotated"
                  draggable={false}
                  onLoad={handleImgLoad}
                  style={{ display: 'block', maxWidth: 'none', pointerEvents: 'none' }} />

                {selected && selected.bbox && (
                  <div key={selected.id} style={{
                    position: 'absolute',
                    left: selected.bbox.x1, top: selected.bbox.y1,
                    width: selected.bbox.x2 - selected.bbox.x1,
                    height: selected.bbox.y2 - selected.bbox.y1,
                    border: '3px solid #fbbf24',
                    borderRadius: 4,
                    boxShadow: '0 0 0 3px rgba(251,191,36,0.25)',
                    pointerEvents: 'none',
                    animation: 'bboxBlink 1s ease-in-out infinite',
                  }} />
                )}
              </div>
            ) : (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center',
                justifyContent: 'center', color: '#2a4a6a',
              }}><ScanLine size={48} /></div>
            )}

            {/* Zoom controls */}
            <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                { Icon: ZoomIn, action: () => setZoom(z => Math.min(5, z + 0.25)) },
                { Icon: ZoomOut, action: () => setZoom(z => Math.max(getMinZoom(), z - 0.25)) },
                { Icon: Maximize2, action: resetView },
              ].map(({ Icon, action }, i) => (
                <button key={i} onClick={action} style={{
                  width: 30, height: 30, borderRadius: 9, border: 'none',
                  background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(6px)',
                  color: '#fff', cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  transition: 'background 150ms ease',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.22)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}>
                  <Icon size={14} />
                </button>
              ))}
            </div>

            <div style={{
              position: 'absolute', bottom: 10, left: 10, fontSize: 10,
              color: 'rgba(255,255,255,0.65)', background: 'rgba(0,0,0,0.35)',
              padding: '3px 9px', borderRadius: 999,
            }}>
              {Math.round(zoom * 100)}%
            </div>
          </div>

          <div style={{
            padding: '11px 16px', borderTop: '0.5px solid var(--border)',
            display: 'flex', alignItems: 'center', gap: 10, fontSize: 11.5,
          }}>
            <span className="badge badge-info">{result.inference_mode || 'Standard'}</span>
            <span style={{ color: 'var(--text-muted)' }}>Scroll to zoom · Drag to pan</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {comps.length} components · {result.processing_time_ms}ms
            </span>
          </div>
        </div>

        {/* Detail tabs */}
        {selected && (
          <div className="card fade-in-up stagger-1" style={{ overflow: 'hidden', flexShrink: 0 }}>
            <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)' }}>
              {[
                { key: 'info', label: 'Info', Icon: Info },
                { key: 'ocr', label: 'OCR', Icon: ScanText },
                { key: 'heatmap', label: 'Heatmap', Icon: Flame },
              ].map(t => (
                <div key={t.key} onClick={() => setTab(t.key)} style={{
                  flex: 1, textAlign: 'center', padding: '11px 6px', fontSize: 12,
                  cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', gap: 6,
                  borderBottom: tab === t.key ? '2px solid var(--accent-strong)' : '2px solid transparent',
                  color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                  transition: 'color 150ms ease',
                }}>
                  <t.Icon size={13} /> {t.label}
                </div>
              ))}
            </div>
            <div style={{ padding: 16 }} className="fade-in">
              {tab === 'info' && (
                <table style={{ width: '100%', fontSize: 12.5 }}>
                  <tbody>
                    {[
                      ['Component', selected.class_name],
                      ['Confidence', `${(selected.confidence * 100).toFixed(0)}%`],
                      ['Defect state', selected.defect_state || 'Not analysed'],
                      ['Severity', selected.severity || '—'],
                      ['Diagnosis', selected.diagnosis || 'Pending'],
                    ].map(([k, v]) => (
                      <tr key={k} style={{ borderBottom: '0.5px solid var(--border)' }}>
                        <td style={{ padding: '7px 0', color: 'var(--text-muted)', width: '40%' }}>{k}</td>
                        <td style={{
                          padding: '7px 0', fontWeight: 600,
                          color: v === 'Pending' ? 'var(--text-muted)'
                            : v?.includes('Good') || v === 'Healthy' ? 'var(--success-text)'
                              : 'var(--text-primary)',
                        }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {tab === 'ocr' && (
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>Detected text</div>
                  <div className="font-mono" style={{
                    fontSize: 12, padding: '10px 12px', background: 'var(--page-bg)',
                    borderRadius: 10, minHeight: 40,
                  }}>
                    {selected.ocr_text || 'No text detected'}
                  </div>
                  {selected.ocr_matched_part && (
                    <div className="badge badge-info" style={{ marginTop: 10 }}>{selected.ocr_matched_part}</div>
                  )}
                </div>
              )}
              {tab === 'heatmap' && (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  {selected.heatmap_url ? (
                    <img src={staticUrl(selected.heatmap_url)} alt="heatmap"
                      style={{ maxWidth: '100%', borderRadius: 12, boxShadow: 'var(--shadow-sm)' }} />
                  ) : (
                    <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      Heatmap not available — run diagnosis first
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="fade-in-up stagger-2" style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
          <button className="btn btn-primary" style={{ flex: 1, padding: 12 }}
            onClick={() => navigate('/diagnosis', { state: { result, selected } })}>
            <Stethoscope size={15} /> Start Diagnosis
          </button>
          <button className="btn btn-ghost" style={{ padding: '12px 18px' }}
            onClick={() => downloadReport(result.inspection_id || result.id)}>
            <FileText size={15} /> PDF Report
          </button>
        </div>
      </div>

      {/* RIGHT — Component list */}
      <div className="card fade-in-up stagger-1" style={{
        display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0,
      }}>
        <div style={{
          padding: '14px 18px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
            Detected Components
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{comps.length} total</span>
        </div>

        <div style={{ padding: '10px 18px 8px' }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between', fontSize: 10.5,
            color: 'var(--text-muted)', marginBottom: 5,
          }}>
            <span>Diagnosis progress</span>
            <span>{good + bad} / {comps.length}</span>
          </div>
          <div style={{ height: 5, background: 'var(--page-bg)', borderRadius: 999, overflow: 'hidden' }}>
            <div style={{
              height: '100%', background: 'linear-gradient(90deg, #22c55e, #4ade80)',
              borderRadius: 999, width: comps.length ? `${((good + bad) / comps.length) * 100}%` : '0%',
              transition: 'width 400ms ease',
            }} />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
          {Object.entries(groups).map(([cls, instances]) => (
            <div key={cls}>
              <div style={{
                padding: '8px 10px 4px', fontSize: 10, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: 0.7,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                {cls}
                <span className="badge badge-neutral" style={{ padding: '1px 7px' }}>{instances.length}</span>
              </div>
              {instances.map((comp, idx) => {
                const isSel = selected?.id === comp.id;
                const diag = comp.diagnosis;
                const iconColor = COMP_ICON_COLOR[cls] || COMP_ICON_COLOR.default;
                const status = diag?.includes('Good')
                  ? { Icon: CheckCircle2, ...SEV_COLOR.none, label: 'Good' }
                  : diag
                    ? { Icon: XCircle, bg: 'var(--danger-bg)', color: 'var(--danger-text)', label: 'Bad' }
                    : { Icon: Clock, bg: 'var(--page-bg)', color: 'var(--text-muted)', label: 'Pending' };

                return (
                  <div key={comp.id}
                    onClick={() => { setSelected(comp); setTab('info'); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 10px', cursor: 'pointer', borderRadius: 12,
                      background: isSel ? 'var(--info-bg)' : 'transparent',
                      transition: 'background 150ms ease', marginBottom: 2,
                    }}
                    onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--page-bg)'; }}
                    onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                      background: `${iconColor}18`, color: iconColor,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><Cpu size={14} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-primary)' }}>
                        {cls} #{idx + 1}
                      </div>
                      <div className="font-mono" style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>
                        {comp.id.slice(0, 6)}
                      </div>
                    </div>
                    <span className="badge" style={{ background: status.bg, color: status.color, flexShrink: 0 }}>
                      <status.Icon size={10} /> {status.label}
                    </span>
                  </div>
                );
              })}
              <div style={{ height: '0.5px', background: 'var(--border)', margin: '6px 10px' }} />
            </div>
          ))}
        </div>

        <div style={{
          padding: '11px 18px', borderTop: '0.5px solid var(--border)',
          display: 'flex', gap: 16, background: 'var(--page-bg)',
        }}>
          {[
            { color: '#22c55e', label: `Good: ${good}` },
            { color: '#ef4444', label: `Bad: ${bad}` },
            { color: '#94a3b8', label: `Pending: ${pending}` },
          ].map(({ color, label }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: color }} />
              <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
