import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getInstructions, diagnoseComponent, downloadReport, staticUrl } from '../services/api';

// Component marking → nominal value parser
const parseMarking = (text, className) => {
    if (!text) return null;
    const t = text.trim().toUpperCase().replace(/\s/g, '');

    // ── Resistor ─────────────────────────────────────────────
    // E-notation: 1E4 = 10000
    const eMatch = t.match(/^(\d+\.?\d*)E(\d+)$/);
    if (eMatch && className === 'Resistor')
        return parseFloat(eMatch[1]) * Math.pow(10, parseInt(eMatch[2]));

    // 4K7 = 4700, 1K = 1000, 10K, 1M, 100R
    const rMatch = t.match(/^(\d+\.?\d*)([KMR])(\d*)$/);
    if (rMatch && className === 'Resistor') {
        const base = parseFloat(rMatch[1]);
        const frac = rMatch[3] ? parseFloat('0.' + rMatch[3]) : 0;
        const mult = { K: 1000, M: 1000000, R: 1 }[rMatch[2]];
        return (base + frac) * mult;
    }

    // Pure number: 10000
    const numMatch = t.match(/^(\d+\.?\d*)$/);
    if (numMatch && className === 'Resistor')
        return parseFloat(numMatch[1]);

    // ── Capacitor ─────────────────────────────────────────────
    // 104 = 10 × 10^4 pF = 100nF = 0.0001µF
    if (className === 'Capacitor') {
        const cap3 = t.match(/^(\d{3})$/);
        if (cap3) {
            const pf = parseInt(t[0] + t[1]) * Math.pow(10, parseInt(t[2]));
            return pf / 1000000; // → µF
        }
        // 100nF, 10uF, 100pF
        const capMatch = t.match(/^(\d+\.?\d*)(P|N|U|UF|NF|PF|µF)$/);
        if (capMatch) {
            const val = parseFloat(capMatch[1]);
            const mult = { P: 1e-6, PF: 1e-6, N: 0.001, NF: 0.001, U: 1, UF: 1, 'µF': 1 }[capMatch[2]];
            return val * (mult || 1);
        }
    }

    // ── Inductor ─────────────────────────────────────────────
    if (className === 'Inductor') {
        const indMatch = t.match(/^(\d+\.?\d*)(UH|MH|H)$/);
        if (indMatch) return parseFloat(indMatch[1]); // just value, unit shown separately
    }

    // ── Zener / Diode voltage ─────────────────────────────────
    if (['Diode', 'Zener_Diode', 'LED'].includes(className)) {
        const vMatch = t.match(/^(\d+\.?\d*)V$/);
        if (vMatch) return parseFloat(vMatch[1]);
    }

    return null;
};

// Format nominal for display
const formatNominal = (val, className) => {
    if (val === null || val === undefined) return '';
    if (className === 'Resistor') {
        if (val >= 1000000) return `${(val / 1000000).toFixed(2).replace(/\.?0+$/, '')}MΩ`;
        if (val >= 1000) return `${(val / 1000).toFixed(2).replace(/\.?0+$/, '')}kΩ`;
        return `${val}Ω`;
    }
    if (className === 'Capacitor') {
        if (val < 0.001) return `${(val * 1000000).toFixed(0)}pF`;
        if (val < 1) return `${(val * 1000).toFixed(3).replace(/\.?0+$/, '')}nF`;
        return `${val}µF`;
    }
    return String(val);
};

const UNITS = {
    Resistor: 'Ω', Capacitor: 'µF', Diode: 'V', Zener_Diode: 'V',
    Transistor: 'V', MOSFET: 'V', LED: 'V', IC: 'V', Inductor: 'Ω',
    Fuse: '', Connector: '', Jumper: '', Switch: '', Transformer: 'Ω',
    Potentiometer: 'Ω', MOV: 'Ω',
};

const getBadge = (diag) => {
    if (!diag) return { bg: 'var(--page-bg)', color: 'var(--text-muted)', label: 'Pending' };
    if (diag.toLowerCase().includes('good'))
        return { bg: '#f0fdf4', color: '#15803d', label: 'Good' };
    return { bg: '#fef2f2', color: '#b91c1c', label: 'Bad' };
};

export default function Diagnosis() {
    const location = useLocation();
    const navigate = useNavigate();

    // Accept result from Results page or start empty
    const initResult = location.state?.result || null;
    const initSelected = location.state?.selected || null;

    const [result, setResult] = useState(initResult);
    const [components, setComponents] = useState(initResult?.components || []);
    const [currentIdx, setCurrentIdx] = useState(
        initSelected ? (initResult?.components?.findIndex(c => c.id === initSelected.id) || 0) : 0
    );
    const [instructions, setInstructions] = useState(null);
    const [measured, setMeasured] = useState('');
    const [nominal, setNominal] = useState('');
    const [verdict, setVerdict] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeStep, setActiveStep] = useState(2);

    const current = components[currentIdx] || null;

    // Load instructions when component changes
    //   useEffect(() => {
    //     if (!current) return;
    //     setInstructions(null);
    //     setVerdict(null);
    //     setMeasured('');
    //     setNominal('');
    //     setActiveStep(2);
    //     getInstructions(current.class_name)
    //       .then(setInstructions)
    //       .catch(() => setInstructions(null));
    //   }, [currentIdx, current?.id]);
    // Nominal display label (e.g. "10kΩ")
    const [nominalLabel, setNominalLabel] = useState('');

    useEffect(() => {
        if (!current) return;
        setInstructions(null);
        setVerdict(null);
        setMeasured('');
        setActiveStep(2);

        // Auto-fill nominal from OCR
        const ocrText = current.ocr_text || current.ocr_matched_part || '';
        const parsed = parseMarking(ocrText, current.class_name);

        if (parsed !== null) {
            setNominal(String(parsed));
            setNominalLabel(formatNominal(parsed, current.class_name));
        } else {
            setNominal('');
            setNominalLabel('');
        }

        getInstructions(current.class_name)
            .then(setInstructions)
            .catch(() => setInstructions(null));
    }, [currentIdx, current?.id]);

    // Group components for sidebar
    const groups = components.reduce((acc, c, idx) => {
        if (!acc[c.class_name]) acc[c.class_name] = [];
        acc[c.class_name].push({ ...c, _idx: idx });
        return acc;
    }, {});

    const pending = components.filter(c => !c.diagnosis).length;
    const good = components.filter(c => c.diagnosis?.toLowerCase().includes('good')).length;
    const bad = components.filter(c => c.diagnosis && !c.diagnosis.toLowerCase().includes('good')).length;

    const diagnose = async () => {
        if (!measured || !current) return;
        setLoading(true);
        try {
            const res = await diagnoseComponent(
                current.class_name,
                parseFloat(measured),
                nominal ? parseFloat(nominal) : null,
                UNITS[current.class_name] || ''
            );
            setVerdict(res);
            // Update local component diagnosis
            const updated = components.map((c, i) =>
                i === currentIdx ? { ...c, diagnosis: res.verdict } : c
            );
            setComponents(updated);
        } catch (e) {
            setVerdict({ verdict: 'Error', message: e?.response?.data?.detail || 'API error', action: '' });
        } finally {
            setLoading(false);
        }
    };

    const skip = () => {
        if (currentIdx < components.length - 1) setCurrentIdx(currentIdx + 1);
    };

    const noData = !result || components.length === 0;

    return (
        <div style={{
            display: 'grid', gridTemplateColumns: '220px 1fr 1fr', gap: 12,
            height: 'calc(100vh - 88px)', overflow: 'hidden'
        }}>

            {/* ── Col 1: Component instance list ─────────────────────────── */}
            <div style={{
                background: '#fff', border: '0.5px solid var(--border)',
                borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }}>

                <div style={{ padding: '10px 12px', borderBottom: '0.5px solid var(--border)' }}>
                    <div style={{ fontSize: 12, fontWeight: 500 }}>Components</div>
                    {components.length > 0 && (
                        <>
                            <div style={{
                                display: 'flex', justifyContent: 'space-between',
                                fontSize: 10, color: 'var(--text-muted)', margin: '5px 0 3px'
                            }}>
                                <span>Progress</span><span>{good + bad}/{components.length}</span>
                            </div>
                            <div style={{ height: 3, background: 'var(--page-bg)', borderRadius: 2 }}>
                                <div style={{
                                    height: '100%', background: '#22c55e', borderRadius: 2,
                                    width: components.length ? `${((good + bad) / components.length) * 100}%` : '0%'
                                }} />
                            </div>
                        </>
                    )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {noData
                        ? <div style={{ padding: 16, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
                            No inspection loaded.<br />
                            <span onClick={() => navigate('/inspect')}
                                style={{ color: '#185fa5', cursor: 'pointer' }}>Start one →</span>
                        </div>
                        : Object.entries(groups).map(([cls, items]) => (
                            <div key={cls}>
                                <div style={{
                                    padding: '6px 12px 2px', fontSize: 9,
                                    color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8,
                                    display: 'flex', alignItems: 'center', gap: 5
                                }}>
                                    {cls}
                                    <span style={{
                                        background: 'var(--page-bg)', border: '0.5px solid var(--border)',
                                        padding: '0 4px', borderRadius: 3, fontSize: 9
                                    }}>{items.length}</span>
                                </div>
                                {items.map((comp, i) => {
                                    const badge = getBadge(comp.diagnosis);
                                    const isCur = comp._idx === currentIdx;
                                    return (
                                        <div key={comp.id}
                                            onClick={() => setCurrentIdx(comp._idx)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 7,
                                                padding: '6px 12px', cursor: 'pointer',
                                                background: isCur ? '#e6f1fb' : 'transparent'
                                            }}>
                                            <div style={{
                                                width: 22, height: 22, borderRadius: 4, background: '#e6f1fb',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: 11, flexShrink: 0
                                            }}>◈</div>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div style={{ fontSize: 11, fontWeight: 500 }}>{cls} #{i + 1}</div>
                                                <div style={{
                                                    fontSize: 9, color: 'var(--text-muted)',
                                                    fontFamily: 'monospace'
                                                }}>{comp.id.slice(0, 6)}</div>
                                            </div>
                                            <span style={{
                                                fontSize: 9, padding: '1px 5px', borderRadius: 8,
                                                background: badge.bg, color: badge.color, flexShrink: 0
                                            }}>
                                                {badge.label}
                                            </span>
                                        </div>
                                    );
                                })}
                                <div style={{ height: '0.5px', background: 'var(--border)', margin: '2px 12px' }} />
                            </div>
                        ))
                    }
                </div>

                {/* Summary */}
                {!noData && (
                    <div style={{
                        padding: '6px 12px', borderTop: '0.5px solid var(--border)',
                        background: 'var(--page-bg)', display: 'flex', gap: 10
                    }}>
                        {[['#22c55e', `Good:${good}`], ['#ef4444', `Bad:${bad}`], ['#94a3b8', `Pend:${pending}`]]
                            .map(([dot, lbl]) => (
                                <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
                                    <span style={{ color: 'var(--text-secondary)' }}>{lbl}</span>
                                </div>
                            ))}
                    </div>
                )}
            </div>

            {/* ── Col 2: Multimeter steps ─────────────────────────────────── */}
            <div style={{
                background: '#fff', border: '0.5px solid var(--border)',
                borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }}>

                <div style={{ padding: '10px 14px', borderBottom: '0.5px solid var(--border)' }}>
                    <div style={{
                        fontSize: 11, fontWeight: 500, color: 'var(--text-muted)',
                        textTransform: 'uppercase', letterSpacing: 0.5
                    }}>
                        Testing procedure
                    </div>
                    {current && (
                        <div style={{ fontSize: 13, fontWeight: 500, marginTop: 3 }}>
                            {current.class_name}
                        </div>
                    )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                    {!current
                        ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Select a component</div>
                        : !instructions
                            ? <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading steps...</div>
                            : (
                                <>
                                    {/* Description */}
                                    <div style={{
                                        fontSize: 12, color: 'var(--text-secondary)',
                                        marginBottom: 14, lineHeight: 1.6
                                    }}>
                                        {instructions.description}
                                    </div>

                                    {/* Steps */}
                                    {(instructions.steps || []).map((step, i) => {
                                        const done = i < activeStep - 1;
                                        const active = i === activeStep - 1;
                                        return (
                                            <div key={i} onClick={() => setActiveStep(i + 1)}
                                                style={{
                                                    display: 'flex', gap: 10, marginBottom: 10,
                                                    cursor: 'pointer', padding: '4px 0'
                                                }}>
                                                <div style={{
                                                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                                                    marginTop: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 11, fontWeight: 500,
                                                    background: done ? '#f0fdf4' : active ? '#e6f1fb' : 'var(--page-bg)',
                                                    color: done ? '#15803d' : active ? '#185fa5' : 'var(--text-muted)',
                                                    border: active ? '0.5px solid #b5d4f4' : '0.5px solid transparent'
                                                }}>
                                                    {done ? '✓' : i + 1}
                                                </div>
                                                <div style={{
                                                    fontSize: 12, lineHeight: 1.5,
                                                    color: active ? 'var(--text-primary)' : done ? 'var(--text-muted)' : 'var(--text-secondary)',
                                                    fontWeight: active ? 500 : 400
                                                }}>
                                                    {step}
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Expected values */}
                                    <div style={{
                                        marginTop: 14, padding: '10px 12px',
                                        background: '#e6f1fb', borderRadius: 8,
                                        fontSize: 11, color: '#185fa5', lineHeight: 1.6
                                    }}>
                                        <div style={{ fontWeight: 500, marginBottom: 3 }}>Expected value</div>
                                        {instructions.expected}
                                    </div>
                                </>
                            )
                    }
                </div>
            </div>

            {/* ── Col 3: Measurement + Verdict ────────────────────────────── */}
            <div style={{
                background: '#fff', border: '0.5px solid var(--border)',
                borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column'
            }}>

                <div style={{
                    padding: '10px 14px', borderBottom: '0.5px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                }}>
                    <div>
                        <div style={{
                            fontSize: 11, fontWeight: 500, color: 'var(--text-muted)',
                            textTransform: 'uppercase', letterSpacing: 0.5
                        }}>Diagnosing</div>
                        <div style={{ fontSize: 13, fontWeight: 500, marginTop: 2 }}>
                            {current ? `${current.class_name} #${currentIdx + 1}` : '—'}
                        </div>
                    </div>
                    {current && (
                        <span style={{
                            fontSize: 10, padding: '2px 8px', borderRadius: 4,
                            background: '#e6f1fb', color: '#185fa5'
                        }}>
                            {(current.confidence * 100).toFixed(0)}% conf
                        </span>
                    )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
                    {/* Navigation */}
                    {components.length > 0 && (
                        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                            <button onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                                disabled={currentIdx === 0}
                                style={{
                                    padding: '5px 10px', borderRadius: 6,
                                    border: '0.5px solid var(--border)', fontSize: 11,
                                    background: currentIdx === 0 ? 'var(--page-bg)' : '#fff',
                                    color: currentIdx === 0 ? 'var(--text-muted)' : 'var(--text-secondary)',
                                    cursor: currentIdx === 0 ? 'not-allowed' : 'pointer'
                                }}>
                                ← Prev
                            </button>
                            <span style={{
                                flex: 1, textAlign: 'center', fontSize: 11,
                                color: 'var(--text-muted)', alignSelf: 'center'
                            }}>
                                {currentIdx + 1} of {components.length}
                            </span>
                            <button onClick={() => setCurrentIdx(Math.min(components.length - 1, currentIdx + 1))}
                                disabled={currentIdx === components.length - 1}
                                style={{
                                    padding: '5px 10px', borderRadius: 6,
                                    border: '0.5px solid var(--border)', fontSize: 11,
                                    background: currentIdx === components.length - 1 ? 'var(--page-bg)' : '#1e3a5f',
                                    color: currentIdx === components.length - 1 ? 'var(--text-muted)' : '#7dd3fc',
                                    cursor: currentIdx === components.length - 1 ? 'not-allowed' : 'pointer'
                                }}>
                                Next →
                            </button>
                        </div>
                    )}

                    {/* Inputs */}
                    <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 5 }}>
                            Measured value
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <input value={measured} onChange={e => setMeasured(e.target.value)}
                                type="number" step="0.001" placeholder="e.g. 0.65"
                                style={{
                                    flex: 1, padding: '8px 10px', borderRadius: 6,
                                    border: '0.5px solid var(--border)', fontSize: 12,
                                    background: 'var(--page-bg)', color: 'var(--text-primary)'
                                }} />
                            <div style={{
                                padding: '8px 10px', borderRadius: 6,
                                border: '0.5px solid var(--border)', fontSize: 12,
                                background: 'var(--page-bg)', color: 'var(--text-muted)',
                                minWidth: 36, textAlign: 'center'
                            }}>
                                {current ? (UNITS[current.class_name] || '—') : '—'}
                            </div>
                        </div>
                    </div>

                    {/* <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:'var(--text-muted)', marginBottom:5 }}>
              Nominal value <span style={{ color:'var(--text-muted)' }}>(optional)</span>
            </div>
            <input value={nominal} onChange={e => setNominal(e.target.value)}
              type="number" step="0.001" placeholder="Rated value from datasheet"
              style={{ width:'100%', padding:'8px 10px', borderRadius:6,
                border:'0.5px solid var(--border)', fontSize:12,
                background:'var(--page-bg)', color:'var(--text-primary)' }}/>
          </div> */}
                    {/* Nominal value input — auto-filled or manual */}
                    <div style={{ marginBottom: 14 }}>
                        <div style={{
                            fontSize: 11, color: 'var(--text-muted)', marginBottom: 5,
                            display: 'flex', alignItems: 'center', gap: 6
                        }}>
                            Nominal value
                            {nominalLabel && (
                                <span style={{
                                    fontSize: 10, padding: '1px 6px', borderRadius: 3,
                                    background: '#e6f1fb', color: '#185fa5'
                                }}>
                                    Auto: {nominalLabel}
                                </span>
                            )}
                            {!nominalLabel && (
                                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                                    (from marking or datasheet)
                                </span>
                            )}
                        </div>

                        {/* Marking input — type component code */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
                            <input
                                placeholder={`e.g. ${current?.class_name === 'Resistor' ? '10K or 4K7' :
                                        current?.class_name === 'Capacitor' ? '104 or 100nF' :
                                            current?.class_name === 'Inductor' ? '10mH' : 'marking code'
                                    }`}
                                onChange={e => {
                                    const parsed = parseMarking(e.target.value, current?.class_name || '');
                                    if (parsed !== null) {
                                        setNominal(String(parsed));
                                        setNominalLabel(formatNominal(parsed, current?.class_name));
                                    } else {
                                        setNominalLabel('');
                                    }
                                }}
                                style={{
                                    flex: 1, padding: '7px 10px', borderRadius: 6,
                                    border: '0.5px solid var(--border)', fontSize: 12,
                                    background: 'var(--page-bg)', color: 'var(--text-primary)'
                                }} />
                            <div style={{
                                padding: '7px 8px', borderRadius: 6, fontSize: 10,
                                border: '0.5px solid var(--border)', background: 'var(--page-bg)',
                                color: 'var(--text-muted)', alignSelf: 'center'
                            }}>
                                marking
                            </div>
                        </div>

                        {/* Direct numeric input */}
                        <div style={{ display: 'flex', gap: 6 }}>
                            <input
                                value={nominal}
                                onChange={e => {
                                    setNominal(e.target.value);
                                    setNominalLabel('');
                                }}
                                type="number" step="any"
                                placeholder="Or enter value directly"
                                style={{
                                    flex: 1, padding: '7px 10px', borderRadius: 6,
                                    border: '0.5px solid var(--border)', fontSize: 12,
                                    background: 'var(--page-bg)', color: 'var(--text-primary)'
                                }} />
                            <div style={{
                                padding: '7px 8px', borderRadius: 6, fontSize: 11,
                                border: '0.5px solid var(--border)', background: 'var(--page-bg)',
                                color: 'var(--text-muted)', alignSelf: 'center', minWidth: 30,
                                textAlign: 'center'
                            }}>
                                {current ? (UNITS[current.class_name] || '—') : '—'}
                            </div>
                        </div>

                        {/* Parsed value confirmation */}
                        {nominal && nominalLabel && (
                            <div style={{
                                marginTop: 5, fontSize: 11, color: '#185fa5',
                                background: '#e6f1fb', padding: '4px 8px', borderRadius: 5
                            }}>
                                ✓ Nominal: {nominalLabel} ({nominal} {UNITS[current?.class_name] || ''})
                            </div>
                        )}
                    </div>

                    {/* Diagnose button */}
                    <button onClick={diagnose}
                        disabled={loading || !measured || !current}
                        style={{
                            width: '100%', padding: '9px', borderRadius: 8, border: 'none',
                            background: !measured || !current ? 'var(--page-bg)' : '#1e3a5f',
                            color: !measured || !current ? 'var(--text-muted)' : '#7dd3fc',
                            fontSize: 13, fontWeight: 500,
                            cursor: !measured || !current ? 'not-allowed' : 'pointer',
                            marginBottom: 12
                        }}>
                        {loading ? '⟳ Analysing...' : '⚕ Diagnose Component'}
                    </button>

                    {/* Verdict */}
                    {verdict
                        ? (
                            <div style={{
                                borderRadius: 10, padding: '12px 14px', marginBottom: 12,
                                background: verdict.verdict?.toLowerCase().includes('good') ? '#f0fdf4' : '#fef2f2',
                                border: `0.5px solid ${verdict.verdict?.toLowerCase().includes('good') ? '#bbf7d0' : '#fca5a5'}`
                            }}>
                                <div style={{
                                    fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5,
                                    marginBottom: 4,
                                    color: verdict.verdict?.toLowerCase().includes('good') ? '#15803d' : '#b91c1c'
                                }}>
                                    {verdict.verdict?.toLowerCase().includes('good') ? '✓ Result' : '✗ Result'}
                                </div>
                                <div style={{
                                    fontSize: 18, fontWeight: 500,
                                    color: verdict.verdict?.toLowerCase().includes('good') ? '#15803d' : '#b91c1c'
                                }}>
                                    {verdict.verdict}
                                </div>
                                <div style={{
                                    fontSize: 12, marginTop: 6, color: 'var(--text-secondary)',
                                    lineHeight: 1.5
                                }}>
                                    {verdict.message}
                                </div>
                                {verdict.action && (
                                    <div style={{
                                        marginTop: 8, fontSize: 11, padding: '6px 10px',
                                        background: verdict.verdict?.toLowerCase().includes('good')
                                            ? 'rgba(0,0,0,0.04)' : 'rgba(0,0,0,0.04)',
                                        borderRadius: 6, color: 'var(--text-secondary)'
                                    }}>
                                        Action: {verdict.action}
                                    </div>
                                )}
                            </div>
                        )
                        : (
                            <div style={{
                                borderRadius: 10, padding: '12px 14px', marginBottom: 12,
                                background: 'var(--page-bg)', border: '0.5px solid var(--border)'
                            }}>
                                <div style={{
                                    fontSize: 10, color: 'var(--text-muted)',
                                    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4
                                }}>
                                    Awaiting measurement
                                </div>
                                <div style={{ fontSize: 18, fontWeight: 500, color: 'var(--text-muted)' }}>—</div>
                                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                                    Enter multimeter reading above
                                </div>
                            </div>
                        )
                    }

                    {/* Heatmap */}
                    {current?.heatmap_url && (
                        <div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
                                Grad-CAM heatmap
                            </div>
                            <img src={staticUrl(current.heatmap_url)} alt="heatmap"
                                style={{ width: '100%', borderRadius: 8, border: '0.5px solid var(--border)' }} />
                        </div>
                    )}

                    {!current?.heatmap_url && (
                        <div style={{
                            border: '0.5px solid var(--border)', borderRadius: 8,
                            height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--text-muted)', fontSize: 12
                        }}>
                            🔥 Grad-CAM heatmap
                        </div>
                    )}
                </div>

                {/* Bottom actions */}
                <div style={{
                    padding: '10px 14px', borderTop: '0.5px solid var(--border)',
                    display: 'flex', gap: 8
                }}>
                    <button onClick={skip}
                        style={{
                            flex: 1, padding: '7px', borderRadius: 6,
                            border: '0.5px solid var(--border)', fontSize: 11,
                            background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)'
                        }}>
                        Skip
                    </button>
                    <button onClick={() => result && downloadReport(result.inspection_id || result.id)}
                        style={{
                            flex: 1, padding: '7px', borderRadius: 6,
                            border: '0.5px solid var(--border)', fontSize: 11,
                            background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)'
                        }}>
                        ⊡ PDF Report
                    </button>
                </div>
            </div>
        </div>
    );
}