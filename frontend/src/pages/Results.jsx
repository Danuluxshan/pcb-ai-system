import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { getInspection, staticUrl } from '../services/api';

const SEV_COLOR = {
    none: { bg: '#f0fdf4', color: '#15803d', label: 'Healthy' },
    minor: { bg: '#fffbeb', color: '#b45309', label: 'Minor' },
    moderate: { bg: '#fff7ed', color: '#c2410c', label: 'Moderate' },
    critical: { bg: '#fef2f2', color: '#b91c1c', label: 'Critical' },
};

const COMP_COLOR = {
    IC: '#e6f1fb', Capacitor: '#f0fdf4', Resistor: '#fffbeb',
    Diode: '#fdf4ff', LED: '#fdf4ff', Transistor: '#fff7ed',
    MOSFET: '#f0f9ff', Connector: '#f8fafc', default: '#f1f5f9',
};

export default function Results() {
    const { id } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const [result, setResult] = useState(location.state?.result || null);
    const [selected, setSelected] = useState(null);
    const [tab, setTab] = useState('info');
    const [loading, setLoading] = useState(!result);

    useEffect(() => {
        if (location.state?.result) {
            setResult(location.state.result);
            setSelected(location.state.result.components?.[0] || null);
            setLoading(false);
        } else if (id) {
            getInspection(id)
                .then(d => {
                    setResult(d);
                    setSelected(d.components?.[0] || null);
                    setLoading(false);
                })
                .catch(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [id]);

    if (loading) return (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
            Loading inspection...
        </div>
    );

    if (!result) return (
        <div style={{ textAlign: 'center', padding: 60 }}>
            <div style={{ fontSize: 14, color: 'var(--text-muted)', marginBottom: 12 }}>
                No inspection loaded
            </div>
            <button onClick={() => navigate('/inspect')}
                style={{
                    padding: '8px 20px', borderRadius: 8, border: '0.5px solid var(--border)',
                    background: '#1e3a5f', color: '#7dd3fc', cursor: 'pointer', fontSize: 12
                }}>
                Start New Inspection
            </button>
        </div>
    );

    const comps = result.components || [];

    // Group by class
    const groups = comps.reduce((acc, c) => {
        const k = c.class_name;
        if (!acc[k]) acc[k] = [];
        acc[k].push(c);
        return acc;
    }, {});

    const pending = comps.filter(c => !c.diagnosis).length;
    const good = comps.filter(c => c.diagnosis?.includes('Good')).length;
    const bad = comps.filter(c => c.diagnosis && !c.diagnosis.includes('Good')).length;
    const health = result.health_score;
    // State add பண்ணுங்க (மேலே உள்ள useState-களுடன்)
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    // const handleWheel = (e) => {
    //     e.preventDefault();
    //     setZoom(z => Math.min(5, Math.max(0.5, z - e.deltaY * 0.001)));
    // };
    const handleWheel = (e) => {
        e.preventDefault();
        const min = getMinZoom();
        setZoom(z => Math.min(5, Math.max(min, z - e.deltaY * 0.001)));
    };

    const handleMouseDown = (e) => {
        setDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e) => {
        if (!dragging) return;
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => setDragging(false);

    const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

    const imgRef = useRef(null);
    const panelRef = useRef(null);

    // Min zoom — image container-க்கு fit ஆக calculate பண்றது
    const getMinZoom = () => {
        if (!imgRef.current || !panelRef.current) return 0.5;
        const iw = imgRef.current.naturalWidth || imgRef.current.offsetWidth;
        const ih = imgRef.current.naturalHeight || imgRef.current.offsetHeight;
        const pw = panelRef.current.offsetWidth;
        const ph = panelRef.current.offsetHeight;
        if (!iw || !ih) return 0.5;
        return Math.min(pw / iw, ph / ih, 1); // container-க்கு fit ஆக, max 1x
    };
    const handleImgLoad = () => {
        const min = getMinZoom();
        setZoom(min); // image load ஆனதும் container-க்கு fit ஆக
        setPan({ x: 0, y: 0 });
    };

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16, height: 'calc(100vh - 88px)' }}>

            {/* LEFT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'auto' }}>

                {/* Annotated image */}
                {/* <div style={{ background:'#fff', border:'0.5px solid var(--border)', borderRadius:12, overflow:'hidden' }}>
          <div style={{ background:'#0f1923', minHeight:220, display:'flex',
            alignItems:'center', justifyContent:'center', position:'relative' }}>
            {result.annotated_image_url
              ? <img src={staticUrl(result.annotated_image_url)} alt="annotated"
                  style={{ maxWidth:'100%', maxHeight:320, objectFit:'contain' }}/>
              : <div style={{ color:'#2a4a6a', fontSize:48 }}>◈</div>
            }
          </div>
          <div style={{ padding:'10px 14px', borderTop:'0.5px solid var(--border)',
            display:'flex', alignItems:'center', gap:8, fontSize:11 }}>
            <span style={{ background:'#e6f1fb', color:'#185fa5',
              padding:'2px 8px', borderRadius:3 }}>
              {result.inference_mode || 'Standard'}
            </span>
            <span style={{ color:'var(--text-muted)', marginLeft:'auto' }}>
              {comps.length} components · {result.processing_time_ms}ms
            </span>
          </div>
        </div> */}
                {/* Annotated image */}
                <div style={{
                    background: '#fff', border: '0.5px solid var(--border)',
                    borderRadius: 12, overflow: 'hidden'
                }}>

                    {/* Image viewport */}
                    <div
                        ref={panelRef}
                        onWheel={handleWheel}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                        style={{
                            background: '#0f1923',
                            height: 260,
                            overflow: 'hidden',
                            position: 'relative',
                            cursor: dragging ? 'grabbing' : zoom > 1 ? 'grab' : 'default',
                            userSelect: 'none',
                        }}>

                        {result.annotated_image_url
                            ? <img
                                ref={imgRef}
                                src={staticUrl(result.annotated_image_url)}
                                alt="annotated"
                                draggable={false}
                                onLoad={handleImgLoad}
                                style={{
                                    position: 'absolute',
                                    top: '50%', left: '50%',
                                    transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px)) scale(${zoom})`,
                                    transformOrigin: 'center',
                                    maxWidth: 'none',
                                    transition: dragging ? 'none' : 'transform 0.1s ease',
                                    pointerEvents: 'none',
                                }} />
                            : <div style={{
                                position: 'absolute', top: '50%', left: '50%',
                                transform: 'translate(-50%,-50%)',
                                color: '#2a4a6a', fontSize: 48
                            }}>◈</div>
                        }

                        {/* Zoom controls — top right */}
                        <div style={{
                            position: 'absolute', top: 8, right: 8,
                            display: 'flex', flexDirection: 'column', gap: 4
                        }}>
                            {[
                                // { label: '+', action: () => setZoom(z => Math.min(5, z + 0.25)) },
                                // { label: '−', action: () => setZoom(z => Math.max(0.5, z - 0.25)) },
                                // { label: '⊡', action: resetView },
                                { label: '+', action: () => setZoom(z => Math.min(5, z + 0.25)) },
                                { label: '−', action: () => setZoom(z => Math.max(getMinZoom(), z - 0.25)) },
                                { label: '⊡', action: () => { setZoom(getMinZoom()); setPan({ x: 0, y: 0 }); } },
                            ].map(({ label, action }) => (
                                <button key={label} onClick={action}
                                    style={{
                                        width: 28, height: 28, borderRadius: 6, border: 'none',
                                        background: 'rgba(255,255,255,0.15)',
                                        backdropFilter: 'blur(4px)',
                                        color: '#fff', fontSize: 14, cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 500
                                    }}>
                                    {label}
                                </button>
                            ))}
                        </div>

                        {/* Zoom level indicator — bottom left */}
                        <div style={{
                            position: 'absolute', bottom: 8, left: 8,
                            fontSize: 10, color: 'rgba(255,255,255,0.6)',
                            background: 'rgba(0,0,0,0.3)', padding: '2px 7px',
                            borderRadius: 4
                        }}>
                            {Math.round(zoom * 100)}%
                        </div>
                    </div>

                    {/* Footer */}
                    <div style={{
                        padding: '8px 14px', borderTop: '0.5px solid var(--border)',
                        display: 'flex', alignItems: 'center', gap: 8, fontSize: 11
                    }}>
                        <span style={{
                            background: '#e6f1fb', color: '#185fa5',
                            padding: '2px 8px', borderRadius: 3
                        }}>
                            {result.inference_mode || 'Standard'}
                        </span>
                        <span style={{ color: 'var(--text-muted)' }}>
                            Scroll to zoom · Drag to pan
                        </span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                            {comps.length} components · {result.processing_time_ms}ms
                        </span>
                    </div>
                </div>

                {/* Detail tabs */}
                {selected && (
                    <div style={{
                        background: '#fff', border: '0.5px solid var(--border)',
                        borderRadius: 12, overflow: 'hidden'
                    }}>
                        <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)' }}>
                            {['info', 'ocr', 'heatmap'].map(t => (
                                <div key={t} onClick={() => setTab(t)}
                                    style={{
                                        padding: '9px 16px', fontSize: 12, cursor: 'pointer',
                                        borderBottom: tab === t ? '2px solid #7dd3fc' : '2px solid transparent',
                                        color: tab === t ? '#185fa5' : 'var(--text-muted)',
                                        textTransform: 'capitalize'
                                    }}>
                                    {t}
                                </div>
                            ))}
                        </div>
                        <div style={{ padding: 14 }}>
                            {tab === 'info' && (
                                <table style={{ width: '100%', fontSize: 12 }}>
                                    <tbody>
                                        {[
                                            ['Component', selected.class_name],
                                            ['Confidence', `${(selected.confidence * 100).toFixed(0)}%`],
                                            ['Defect state', selected.defect_state || 'Not analysed'],
                                            ['Severity', selected.severity || '—'],
                                            ['Diagnosis', selected.diagnosis || 'Pending'],
                                        ].map(([k, v]) => (
                                            <tr key={k} style={{ borderBottom: '0.5px solid var(--border)' }}>
                                                <td style={{ padding: '6px 0', color: 'var(--text-muted)', width: '40%' }}>{k}</td>
                                                <td style={{
                                                    padding: '6px 0', fontWeight: 500, color:
                                                        v === 'Pending' ? 'var(--text-muted)' :
                                                            v?.includes('Good') ? 'var(--success-text)' :
                                                                v === 'Healthy' ? 'var(--success-text)' : 'var(--text-primary)'
                                                }}>{v}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                            {tab === 'ocr' && (
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Detected text</div>
                                    <div style={{
                                        fontFamily: 'monospace', fontSize: 12,
                                        padding: '8px 10px', background: 'var(--page-bg)',
                                        borderRadius: 6, minHeight: 40
                                    }}>
                                        {selected.ocr_text || 'No text detected'}
                                    </div>
                                    {selected.ocr_matched_part && (
                                        <div style={{
                                            marginTop: 8, fontSize: 11,
                                            padding: '6px 10px', background: '#e6f1fb',
                                            borderRadius: 6, color: '#185fa5'
                                        }}>
                                            {selected.ocr_matched_part}
                                        </div>
                                    )}
                                </div>
                            )}
                            {tab === 'heatmap' && (
                                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    {selected.heatmap_url
                                        ? <img src={staticUrl(selected.heatmap_url)} alt="heatmap"
                                            style={{ maxWidth: '100%', borderRadius: 8 }} />
                                        : <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                                            Heatmap not available — run diagnosis first
                                        </div>
                                    }
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => navigate('/diagnosis', { state: { result, selected } })}
                        style={{
                            flex: 1, padding: '9px', borderRadius: 8, border: 'none',
                            background: '#1e3a5f', color: '#7dd3fc', fontSize: 12,
                            cursor: 'pointer', fontWeight: 500
                        }}>
                        ⚕ Start Diagnosis
                    </button>
                    <button style={{
                        padding: '9px 16px', borderRadius: 8,
                        border: '0.5px solid var(--border)', background: '#fff',
                        fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)'
                    }}>
                        ⊡ PDF Report
                    </button>
                </div>
            </div>

            {/* RIGHT — Component instance list */}
            <div style={{
                background: '#fff', border: '0.5px solid var(--border)',
                borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }}>

                {/* Header */}
                <div style={{
                    padding: '10px 14px', borderBottom: '0.5px solid var(--border)',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}>
                    <span style={{ fontSize: 12, fontWeight: 500 }}>Detected components</span>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{comps.length} total</span>
                </div>

                {/* Progress */}
                <div style={{ padding: '6px 14px 4px' }}>
                    <div style={{
                        display: 'flex', justifyContent: 'space-between',
                        fontSize: 10, color: 'var(--text-muted)', marginBottom: 3
                    }}>
                        <span>Diagnosis progress</span>
                        <span>{good + bad} / {comps.length}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--border)', borderRadius: 2 }}>
                        <div style={{
                            height: '100%', background: '#22c55e', borderRadius: 2,
                            width: comps.length ? `${((good + bad) / comps.length) * 100}%` : '0%'
                        }} />
                    </div>
                </div>

                {/* Groups */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
                    {Object.entries(groups).map(([cls, instances]) => (
                        <div key={cls}>
                            <div style={{
                                padding: '6px 14px 3px', fontSize: 10,
                                color: 'var(--text-muted)', textTransform: 'uppercase',
                                letterSpacing: 0.8, display: 'flex', alignItems: 'center', gap: 6
                            }}>
                                {cls}
                                <span style={{
                                    background: 'var(--page-bg)',
                                    border: '0.5px solid var(--border)',
                                    padding: '0px 5px', borderRadius: 3,
                                    fontSize: 10, color: 'var(--text-secondary)'
                                }}>
                                    {instances.length}
                                </span>
                            </div>
                            {instances.map((comp, idx) => {
                                const sev = SEV_COLOR[comp.severity || 'none'];
                                const isSel = selected?.id === comp.id;
                                const diag = comp.diagnosis;
                                const badgeColor = diag?.includes('Good')
                                    ? { bg: '#f0fdf4', color: '#15803d', label: 'Good' }
                                    : diag
                                        ? { bg: '#fef2f2', color: '#b91c1c', label: 'Bad' }
                                        : { bg: 'var(--page-bg)', color: 'var(--text-muted)', label: 'Pending' };

                                return (
                                    <div key={comp.id}
                                        onClick={() => { setSelected(comp); setTab('info'); }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 8,
                                            padding: '7px 14px', cursor: 'pointer', borderRadius: 0,
                                            background: isSel ? '#e6f1fb' : 'transparent'
                                        }}
                                        onMouseEnter={e => { if (!isSel) e.currentTarget.style.background = 'var(--page-bg)'; }}
                                        onMouseLeave={e => { if (!isSel) e.currentTarget.style.background = 'transparent'; }}>
                                        <div style={{
                                            width: 26, height: 26, borderRadius: 5, flexShrink: 0,
                                            background: COMP_COLOR[cls] || COMP_COLOR.default,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontSize: 12
                                        }}>◈</div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 12, fontWeight: 500 }}>
                                                {cls} #{idx + 1}
                                            </div>
                                            <div style={{
                                                fontSize: 10, color: 'var(--text-muted)',
                                                fontFamily: 'monospace'
                                            }}>
                                                id: {comp.id.slice(0, 6)}
                                            </div>
                                        </div>
                                        <span style={{
                                            fontSize: 10, padding: '2px 7px', borderRadius: 10,
                                            background: badgeColor.bg, color: badgeColor.color, flexShrink: 0
                                        }}>
                                            {badgeColor.label === 'Pending' ? 'Pending' :
                                                badgeColor.label === 'Good' ? '✓ Good' : '✗ Bad'}
                                        </span>
                                    </div>
                                );
                            })}
                            <div style={{ height: '0.5px', background: 'var(--border)', margin: '4px 14px' }} />
                        </div>
                    ))}
                </div>

                {/* Summary strip */}
                <div style={{
                    padding: '8px 14px', borderTop: '0.5px solid var(--border)',
                    display: 'flex', gap: 14, background: 'var(--page-bg)'
                }}>
                    {[
                        { dot: '#22c55e', label: `Good: ${good}` },
                        { dot: '#ef4444', label: `Bad: ${bad}` },
                        { dot: '#94a3b8', label: `Pending: ${pending}` },
                    ].map(({ dot, label }) => (
                        <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                            <div style={{ width: 7, height: 7, borderRadius: '50%', background: dot }} />
                            <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}