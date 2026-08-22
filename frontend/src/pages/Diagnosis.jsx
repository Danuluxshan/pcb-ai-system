import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Stethoscope, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock,
  Circle, CheckCircle, Loader2, FileText, SkipForward, Flame, Cpu,
  Lightbulb, ClipboardCheck,
} from 'lucide-react';
import { getInstructions, diagnoseComponent, downloadReport, staticUrl, saveComponentDiagnosis } from '../services/api';

const UNITS = {
  Resistor: 'Ω', Capacitor: 'µF', Diode: 'V', Zener_Diode: 'V',
  Transistor: 'V', MOSFET: 'V', LED: 'V', IC: 'V', Inductor: 'Ω',
  Fuse: '', Connector: '', Jumper: '', Switch: '', Transformer: 'Ω',
  Potentiometer: 'Ω', MOV: 'Ω',
};

const COMP_ICON_COLOR = {
  IC: '#38bdf8', Capacitor: '#22c55e', Resistor: '#f59e0b',
  Diode: '#a855f7', LED: '#a855f7', Transistor: '#f97316',
  MOSFET: '#0ea5e9', Connector: '#64748b', default: '#94a3b8',
};

// ── Marking parser (unchanged logic) ─────────────────────────────────
const parseMarking = (text, className) => {
  if (!text) return null;
  const t = text.trim().toUpperCase().replace(/\s/g, '');

  const eMatch = t.match(/^(\d+\.?\d*)E(\d+)$/);
  if (eMatch && className === 'Resistor')
    return parseFloat(eMatch[1]) * Math.pow(10, parseInt(eMatch[2]));

  const rMatch = t.match(/^(\d+\.?\d*)([KMR])(\d*)$/);
  if (rMatch && className === 'Resistor') {
    const base = parseFloat(rMatch[1]);
    const frac = rMatch[3] ? parseFloat('0.' + rMatch[3]) : 0;
    const mult = { K: 1000, M: 1000000, R: 1 }[rMatch[2]];
    return (base + frac) * mult;
  }

  const numMatch = t.match(/^(\d+\.?\d*)$/);
  if (numMatch && className === 'Resistor') return parseFloat(numMatch[1]);

  if (className === 'Capacitor') {
    const cap3 = t.match(/^(\d{3})$/);
    if (cap3) {
      const pf = parseInt(t[0] + t[1]) * Math.pow(10, parseInt(t[2]));
      return pf / 1000000;
    }
    const capMatch = t.match(/^(\d+\.?\d*)(P|N|U|UF|NF|PF|µF)$/);
    if (capMatch) {
      const val = parseFloat(capMatch[1]);
      const mult = { P: 1e-6, PF: 1e-6, N: 0.001, NF: 0.001, U: 1, UF: 1, 'µF': 1 }[capMatch[2]];
      return val * (mult || 1);
    }
  }

  if (className === 'Inductor') {
    const indMatch = t.match(/^(\d+\.?\d*)(UH|MH|H)$/);
    if (indMatch) return parseFloat(indMatch[1]);
  }

  if (['Diode', 'Zener_Diode', 'LED'].includes(className)) {
    const vMatch = t.match(/^(\d+\.?\d*)V$/);
    if (vMatch) return parseFloat(vMatch[1]);
  }
  return null;
};

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

const getBadge = (diag) => {
  if (!diag) return { bg: 'var(--page-bg)', color: 'var(--text-muted)', label: 'Pending', Icon: Clock };
  if (diag.toLowerCase().includes('good'))
    return { bg: 'var(--success-bg)', color: 'var(--success-text)', label: 'Good', Icon: CheckCircle2 };
  return { bg: 'var(--danger-bg)', color: 'var(--danger-text)', label: 'Bad', Icon: XCircle };
};

export default function Diagnosis() {
  const location = useLocation();
  const navigate = useNavigate();

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
  const [nominalLabel, setNominalLabel] = useState('');
  const [verdict, setVerdict] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(2);

  const current = components[currentIdx] || null;

  useEffect(() => {
    if (!current) return;
    setInstructions(null);
    setVerdict(null);
    setMeasured('');
    setActiveStep(2);

    const ocrText = current.ocr_text || current.ocr_matched_part || '';
    const parsed = parseMarking(ocrText, current.class_name);
    if (parsed !== null) {
      setNominal(String(parsed));
      setNominalLabel(formatNominal(parsed, current.class_name));
    } else {
      setNominal('');
      setNominalLabel('');
    }

    getInstructions(current.class_name).then(setInstructions).catch(() => setInstructions(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, current?.id]);

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
        current.class_name, parseFloat(measured),
        nominal ? parseFloat(nominal) : null,
        UNITS[current.class_name] || ''
      );
      setVerdict(res);
      setComponents(prev => prev.map((c, i) => i === currentIdx ? { ...c, diagnosis: res.verdict } : c));

      // Persist to backend so the PDF report and History reflect the real verdict
      const inspId = result?.inspection_id || result?.id;
      if (inspId && current?.id) {
        try {
          const isGood = res.verdict?.toLowerCase().includes('good');
          await saveComponentDiagnosis(inspId, current.id, res.verdict, isGood ? 'none' : 'moderate');
        } catch (saveErr) {
          console.error('Failed to save diagnosis to database:', saveErr);
        }
      }
    } catch (e) {
      setVerdict({ verdict: 'Error', message: e?.response?.data?.detail || 'API error', action: '' });
    } finally {
      setLoading(false);
    }
  };

  const skip = () => { if (currentIdx < components.length - 1) setCurrentIdx(currentIdx + 1); };
  const noData = !result || components.length === 0;
  const isGoodVerdict = verdict?.verdict?.toLowerCase().includes('good');

  return (
    <div className="fade-in" style={{
      display: 'grid', gridTemplateColumns: '230px 1fr 1fr', gap: 14,
      height: 'calc(100vh - 88px)', minHeight: 0,
    }}>

      {/* ── Col 1: Component list ─────────────────────────────────── */}
      <div className="card fade-in-up" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ padding: '13px 14px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            Components
          </div>
          {components.length > 0 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                <span>Progress</span><span>{good + bad}/{components.length}</span>
              </div>
              <div style={{ height: 4, background: 'var(--page-bg)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', background: 'linear-gradient(90deg, #22c55e, #4ade80)', borderRadius: 999,
                  width: components.length ? `${((good + bad) / components.length) * 100}%` : '0%',
                  transition: 'width 400ms ease',
                }} />
              </div>
            </>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
          {noData ? (
            <div style={{ padding: 20, fontSize: 11.5, color: 'var(--text-muted)', textAlign: 'center' }}>
              No inspection loaded.<br />
              <span onClick={() => navigate('/inspect')} style={{ color: 'var(--accent-strong)', cursor: 'pointer', fontWeight: 600 }}>
                Start one →
              </span>
            </div>
          ) : Object.entries(groups).map(([cls, items]) => (
            <div key={cls}>
              <div style={{
                padding: '7px 8px 3px', fontSize: 9.5, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: 0.7, display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {cls}
                <span className="badge badge-neutral" style={{ padding: '0 6px', fontSize: 9 }}>{items.length}</span>
              </div>
              {items.map((comp, i) => {
                const badge = getBadge(comp.diagnosis);
                const isCur = comp._idx === currentIdx;
                const iconColor = COMP_ICON_COLOR[cls] || COMP_ICON_COLOR.default;
                return (
                  <div key={comp.id} onClick={() => setCurrentIdx(comp._idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px',
                      cursor: 'pointer', borderRadius: 10, marginBottom: 1,
                      background: isCur ? 'var(--info-bg)' : 'transparent',
                      transition: 'background 150ms ease',
                    }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: 7, background: `${iconColor}18`,
                      color: iconColor, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}><Cpu size={12} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)' }}>{cls} #{i + 1}</div>
                      <div className="font-mono" style={{ fontSize: 9, color: 'var(--text-muted)' }}>{comp.id.slice(0, 6)}</div>
                    </div>
                    <span className="badge" style={{ background: badge.bg, color: badge.color, flexShrink: 0, padding: '2px 6px', fontSize: 9 }}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {!noData && (
          <div style={{ padding: '9px 14px', borderTop: '0.5px solid var(--border)', background: 'var(--page-bg)', display: 'flex', gap: 10, flexShrink: 0 }}>
            {[['#22c55e', `${good}`], ['#ef4444', `${bad}`], ['#94a3b8', `${pending}`]].map(([dot, lbl]) => (
              <div key={dot} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
                <span style={{ color: 'var(--text-secondary)' }}>{lbl}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Col 2: Testing steps ─────────────────────────────────── */}
      <div className="card fade-in-up stagger-1" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{ padding: '14px 18px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
            Testing Procedure
          </div>
          {current && (
            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginTop: 4 }}>
              {current.class_name}
            </div>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {!current ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 12 }}>Select a component</div>
          ) : !instructions ? (
            <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />
          ) : (
            <>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 18, lineHeight: 1.65 }}>
                {instructions.description}
              </div>

              {(instructions.steps || []).map((step, i) => {
                const done = i < activeStep - 1;
                const active = i === activeStep - 1;
                return (
                  <div key={i} onClick={() => setActiveStep(i + 1)} style={{
                    display: 'flex', gap: 11, marginBottom: 12, cursor: 'pointer', padding: '3px 0',
                  }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: done ? 'var(--success-bg)' : active ? 'var(--info-bg)' : 'var(--page-bg)',
                      color: done ? 'var(--success-text)' : active ? 'var(--info-text)' : 'var(--text-muted)',
                      border: active ? '2px solid var(--accent-strong)' : 'none',
                      transition: 'all 200ms ease',
                    }}>
                      {done ? <CheckCircle size={13} /> : <span style={{ fontSize: 11, fontWeight: 700 }}>{i + 1}</span>}
                    </div>
                    <div style={{
                      fontSize: 12.5, lineHeight: 1.55,
                      color: active ? 'var(--text-primary)' : done ? 'var(--text-muted)' : 'var(--text-secondary)',
                      fontWeight: active ? 600 : 400,
                    }}>
                      {step}
                    </div>
                  </div>
                );
              })}

              <div style={{
                marginTop: 16, padding: '12px 14px', background: 'var(--info-bg)', borderRadius: 12,
                fontSize: 11.5, color: 'var(--info-text)', lineHeight: 1.6,
                display: 'flex', gap: 9, alignItems: 'flex-start',
              }}>
                <Lightbulb size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <div><strong>Expected value</strong><br />{instructions.expected}</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Col 3: Measurement + Verdict ─────────────────────────── */}
      <div className="card fade-in-up stagger-2" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flexShrink: 0 }}>
        <div style={{
          padding: '14px 18px', borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
        }}>
          <div>
            <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6 }}>
              Diagnosing
            </div>
            <div style={{ fontSize: 14.5, fontWeight: 800, color: 'var(--text-primary)', marginTop: 3 }}>
              {current ? `${current.class_name} #${currentIdx + 1}` : '—'}
            </div>
          </div>
          {current && <span className="badge badge-info">{(current.confidence * 100).toFixed(0)}% conf</span>}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 18 }}>
          {components.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              <button className="btn btn-ghost" onClick={() => setCurrentIdx(Math.max(0, currentIdx - 1))}
                disabled={currentIdx === 0} style={{ padding: '6px 12px', fontSize: 11 }}>
                <ChevronLeft size={13} /> Prev
              </button>
              <span style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', alignSelf: 'center' }}>
                {currentIdx + 1} of {components.length}
              </span>
              <button className="btn btn-primary" onClick={() => setCurrentIdx(Math.min(components.length - 1, currentIdx + 1))}
                disabled={currentIdx === components.length - 1} style={{ padding: '6px 12px', fontSize: 11 }}>
                Next <ChevronRight size={13} />
              </button>
            </div>
          )}

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
              Nominal value
              {nominalLabel && <span className="badge badge-info" style={{ padding: '1px 7px', fontSize: 9.5 }}>Auto: {nominalLabel}</span>}
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input placeholder={`e.g. ${current?.class_name === 'Resistor' ? '10K or 4K7' : current?.class_name === 'Capacitor' ? '104 or 100nF' : 'marking code'}`}
                onChange={e => {
                  const parsed = parseMarking(e.target.value, current?.class_name || '');
                  if (parsed !== null) { setNominal(String(parsed)); setNominalLabel(formatNominal(parsed, current?.class_name)); }
                  else setNominalLabel('');
                }}
                className="input-modern" style={{ flex: 1, padding: '7px 10px', fontSize: 11.5 }} />
              <div style={{ padding: '7px 8px', borderRadius: 8, fontSize: 9.5, border: '1px solid var(--border)', background: 'var(--page-bg)', color: 'var(--text-muted)', alignSelf: 'center' }}>
                marking
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={nominal} onChange={e => { setNominal(e.target.value); setNominalLabel(''); }}
                type="number" step="any" placeholder="Or enter value directly"
                className="input-modern" style={{ flex: 1, padding: '7px 10px', fontSize: 11.5 }} />
              <div style={{ padding: '7px 8px', borderRadius: 8, fontSize: 11, border: '1px solid var(--border)', background: 'var(--page-bg)', color: 'var(--text-muted)', alignSelf: 'center', minWidth: 30, textAlign: 'center' }}>
                {current ? (UNITS[current.class_name] || '—') : '—'}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>Measured value</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <input value={measured} onChange={e => setMeasured(e.target.value)}
                type="number" step="0.001" placeholder="e.g. 0.65"
                className="input-modern" style={{ flex: 1, padding: '8px 10px', fontSize: 12 }} />
              <div style={{ padding: '8px 8px', borderRadius: 8, fontSize: 11, border: '1px solid var(--border)', background: 'var(--page-bg)', color: 'var(--text-muted)', alignSelf: 'center', minWidth: 30, textAlign: 'center' }}>
                {current ? (UNITS[current.class_name] || '—') : '—'}
              </div>
            </div>
          </div>

          <button className="btn btn-primary" onClick={diagnose} disabled={loading || !measured || !current}
            style={{ width: '100%', padding: 11, fontSize: 12.5, marginBottom: 14 }}>
            {loading ? <><Loader2 size={14} className="pulse" /> Analysing...</> : <><Stethoscope size={14} /> Diagnose Component</>}
          </button>

          {verdict ? (
            <div className="scale-in" style={{
              borderRadius: 14, padding: '14px 16px', marginBottom: 14,
              background: isGoodVerdict ? 'var(--success-bg)' : 'var(--danger-bg)',
              border: `1px solid ${isGoodVerdict ? 'var(--success-border)' : 'var(--danger-border)'}`,
            }}>
              <div style={{
                fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5,
                color: isGoodVerdict ? 'var(--success-text)' : 'var(--danger-text)',
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {isGoodVerdict ? <CheckCircle2 size={12} /> : <XCircle size={12} />} Result
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: isGoodVerdict ? 'var(--success-text)' : 'var(--danger-text)' }}>
                {verdict.verdict}
              </div>
              <div style={{ fontSize: 12, marginTop: 7, color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                {verdict.message}
              </div>
              {verdict.action && (
                <div style={{ marginTop: 9, fontSize: 11, padding: '7px 10px', background: 'rgba(255,255,255,0.5)', borderRadius: 8, color: 'var(--text-secondary)' }}>
                  <ClipboardCheck size={11} style={{ display: 'inline', marginRight: 5 }} />
                  Action: {verdict.action}
                </div>
              )}
            </div>
          ) : (
            <div style={{ borderRadius: 14, padding: '14px 16px', marginBottom: 14, background: 'var(--page-bg)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 5 }}>
                Awaiting measurement
              </div>
              <div style={{ fontSize: 19, fontWeight: 800, color: 'var(--text-muted)' }}>—</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 5 }}>Enter multimeter reading above</div>
            </div>
          )}

          {current?.heatmap_url ? (
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Flame size={12} /> Grad-CAM heatmap
              </div>
              <img src={staticUrl(current.heatmap_url)} alt="heatmap" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }} />
            </div>
          ) : (
            <div style={{
              border: '1px dashed var(--border-strong)', borderRadius: 12, height: 90,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-muted)', fontSize: 11.5, gap: 6,
            }}><Flame size={14} /> Grad-CAM heatmap</div>
          )}
        </div>

        <div style={{ padding: '11px 18px', borderTop: '0.5px solid var(--border)', display: 'flex', gap: 8, flexShrink: 0 }}>
          <button className="btn btn-ghost" onClick={skip} style={{ flex: 1, padding: 8, fontSize: 11 }}>
            <SkipForward size={12} /> Skip
          </button>
          <button className="btn btn-ghost" onClick={() => result && downloadReport(result.inspection_id || result.id)}
            style={{ flex: 1, padding: 8, fontSize: 11 }}>
            <FileText size={12} /> PDF Report
          </button>
        </div>
      </div>
    </div>
  );
}
