import { useState, useEffect } from 'react';
import {
  Stethoscope, Loader2, CheckCircle2, XCircle, AlertTriangle, Info, Zap, ScanText,
} from 'lucide-react';
import api from '../services/api';

// ── OCR marking parser (relocated here since this component now owns
// the nominal-value field it auto-fills) ────────────────────────────
//
// Resistor codes follow the EIA/SMD marking convention, NOT a literal
// ohm value:
//   R-notation   4R7 = 4.7Ω, 0R5 = 0.5Ω, R47 = 0.47Ω  (R = decimal point)
//   K/M suffix   4K7 = 4700Ω, 10K = 10000Ω, 2M2 = 2,200,000Ω
//   3-digit EIA  223 = 22 × 10^3 = 22,000Ω   (first 2 digits = significant
//                                              figures, 3rd = multiplier)
//   4-digit EIA  1002 = 100 × 10^2 = 10,000Ω  (precision resistors)
// A plain "223" is virtually always the EIA code, not literally 223Ω —
// SMD resistors are marked this way specifically because there is no
// room for a full written-out value.
const parseMarking = (text, className) => {
  if (!text) return null;
  const t = text.trim().toUpperCase().replace(/\s/g, '');

  if (className === 'Resistor') {
    // R-notation: R acts as the decimal point
    const rNotation = t.match(/^(\d*)R(\d+)$/);
    if (rNotation) {
      const whole = rNotation[1] || '0';
      return parseFloat(`${whole}.${rNotation[2]}`);
    }

    // Explicit K/M suffix multiplier
    const kmMatch = t.match(/^(\d+)([KM])(\d*)$/);
    if (kmMatch) {
      const base = parseFloat(kmMatch[1]);
      const frac = kmMatch[3] ? parseFloat('0.' + kmMatch[3]) : 0;
      const mult = { K: 1000, M: 1000000 }[kmMatch[2]];
      return (base + frac) * mult;
    }

    // 4-digit EIA code (precision resistors): first 3 = significant figures, 4th = multiplier
    const eia4 = t.match(/^(\d{3})(\d)$/);
    if (eia4) return parseFloat(eia4[1]) * Math.pow(10, parseInt(eia4[2]));

    // 3-digit EIA code (standard SMD): first 2 = significant figures, 3rd = multiplier
    const eia3 = t.match(/^(\d{2})(\d)$/);
    if (eia3) return parseFloat(eia3[1]) * Math.pow(10, parseInt(eia3[2]));

    // Plain 1-2 digit literal value (too short to be an EIA code)
    const plainMatch = t.match(/^(\d{1,2})$/);
    if (plainMatch) return parseFloat(plainMatch[1]);

    // Rare scientific-style marking, e.g. "4E7"
    const eMatch = t.match(/^(\d+\.?\d*)E(\d+)$/);
    if (eMatch) return parseFloat(eMatch[1]) * Math.pow(10, parseInt(eMatch[2]));

    return null;
  }

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
  return null;
};

const VERDICT_STYLE = {
  "Good":                          { color: 'var(--success-text)', bg: 'var(--success-bg)', border: 'var(--success-border)', Icon: CheckCircle2 },
  "Open Circuit":                  { color: 'var(--danger-text)',  bg: 'var(--danger-bg)',  border: 'var(--danger-border)',  Icon: XCircle },
  "Short Circuit":                 { color: 'var(--danger-text)',  bg: 'var(--danger-bg)',  border: 'var(--danger-border)',  Icon: Zap },
  "Leaky / Reverse Leakage":       { color: '#b45309', bg: '#fff3e6', border: '#fde3ad', Icon: AlertTriangle },
  "Out of Tolerance":              { color: '#b45309', bg: '#fff3e6', border: '#fde3ad', Icon: AlertTriangle },
  "High ESR (Degraded)":           { color: '#b45309', bg: '#fff3e6', border: '#fde3ad', Icon: AlertTriangle },
  "Low Gain":                      { color: '#b45309', bg: '#fff3e6', border: '#fde3ad', Icon: AlertTriangle },
  "Worn / Intermittent":           { color: '#b45309', bg: '#fff3e6', border: '#fde3ad', Icon: AlertTriangle },
  "Inconclusive — Manual Inspection Required": { color: 'var(--text-muted)', bg: 'var(--page-bg)', border: 'var(--border)', Icon: Info },
};

const fieldStyle = {
  width: '100%', padding: '8px 10px', borderRadius: 8,
  border: '1px solid var(--border)', fontSize: 12.5,
};
const labelStyle = { fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600 };

function OLToggle({ isOL, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, color: 'var(--text-muted)', marginTop: 5, cursor: 'pointer' }}>
      <input type="checkbox" checked={isOL} onChange={e => onChange(e.target.checked)} style={{ margin: 0 }} />
      No reading (OL / open)
    </label>
  );
}

/**
 * Renders the correct measurement inputs for the component's diagnosis
 * archetype (from GET /knowledge/{class}), submits to the archetype-aware
 * /knowledge/diagnose endpoint, and surfaces the verdict with its
 * failure-mode name and recommended action.
 *
 * Props:
 *   component   — the selected detection object (must include class_name, id)
 *   instructions — result of GET /knowledge/{class_name} (archetype, steps, etc.)
 *   onDiagnosed(verdictResult) — called after a verdict is returned, so the
 *                                 parent page can persist it (PATCH .../diagnosis)
 *                                 and update its own component list state.
 */
export default function DiagnosisPanel({ component, instructions, onDiagnosed }) {
  const archetype = instructions?.archetype;

  // Tolerance / capacitor shared fields
  const [nominal,  setNominal]  = useState('');
  const [measured, setMeasured] = useState('');
  const [esr,          setEsr]         = useState('');
  const [esrReference, setEsrReference] = useState('');

  // Diode-pattern fields
  const [forward, setForward] = useState('');
  const [forwardOL, setForwardOL] = useState(false);
  const [reverse, setReverse] = useState('');
  const [reverseOL, setReverseOL] = useState(true);

  // Continuity field (binary)
  const [continuityState, setContinuityState] = useState(null); // 'closed' | 'open' | null

  // Checklist fields (IC)
  const [visualOk, setVisualOk] = useState(true);
  const [railOk, setRailOk] = useState(null);
  const [shortDetected, setShortDetected] = useState(false);

  const [loading, setLoading] = useState(false);
  const [verdict, setVerdict] = useState(null);
  const [autoFilled, setAutoFilled] = useState(false);

  const [referenceParts, setReferenceParts] = useState([]);
  const [selectedPartIdx, setSelectedPartIdx] = useState('');
  const [expectedForwardV, setExpectedForwardV] = useState(null); // from selected diode-type part

  useEffect(() => {
    // Reset all fields when the selected component changes
    setMeasured(''); setEsr(''); setEsrReference('');
    setForward(''); setForwardOL(false); setReverse(''); setReverseOL(true);
    setContinuityState(null);
    setVisualOk(true); setRailOk(null); setShortDetected(false);
    setVerdict(null);
    setAutoFilled(false);
    setSelectedPartIdx('');
    setExpectedForwardV(null);
    setReferenceParts([]);

    if (component?.class_name) {
      api.get(`/knowledge/${component.class_name}/parts`)
        .then(res => setReferenceParts(res.data.parts || []))
        .catch(() => setReferenceParts([]));
    }

    // OCR-based nominal auto-fill for archetypes that have a nominal field
    const ocrText = component?.ocr_text || component?.ocr_matched_part || '';
    const parsed = parseMarking(ocrText, component?.class_name);
    if (parsed !== null) {
      setNominal(String(parsed));
      setAutoFilled(true);
    } else {
      setNominal('');
    }
  }, [component?.id]);

  const handlePartSelect = (idx) => {
    setSelectedPartIdx(idx);
    if (idx === '') { setExpectedForwardV(null); return; }
    const part = referenceParts[idx];
    if (!part) return;
    if (part.nominal_value != null) {
      setNominal(String(part.nominal_value));
      setAutoFilled(true);
    }
    if (part.expected_forward_v != null) {
      setExpectedForwardV(part.expected_forward_v);
    } else {
      setExpectedForwardV(null);
    }
  };

  const selectedPart = selectedPartIdx !== '' ? referenceParts[selectedPartIdx] : null;

  const canSubmit = () => {
    if (archetype === 'tolerance') return measured !== '';
    if (archetype === 'capacitor') return measured !== '';
    if (archetype === 'diode_pattern') return !forwardOL || !reverseOL; // at least one real reading
    if (archetype === 'continuity') return continuityState !== null;
    if (archetype === 'checklist') return railOk !== null;
    return false;
  };

  const buildPayload = () => {
    const base = { component_name: component.class_name };
    if (archetype === 'tolerance') {
      return { ...base, measured_value: parseFloat(measured), nominal_value: nominal ? parseFloat(nominal) : null, unit: instructions?.unit || '' };
    }
    if (archetype === 'capacitor') {
      return {
        ...base,
        measured_value: parseFloat(measured),
        nominal_value: nominal ? parseFloat(nominal) : null,
        esr_ohms: esr ? parseFloat(esr) : null,
        esr_reference_ohms: esrReference ? parseFloat(esrReference) : null,
        unit: 'µF',
      };
    }
    if (archetype === 'diode_pattern') {
      return {
        ...base,
        forward_reading: forwardOL ? null : parseFloat(forward),
        reverse_reading: reverseOL ? null : parseFloat(reverse),
        expected_forward_v: expectedForwardV,
      };
    }
    if (archetype === 'continuity') {
      return { ...base, reading_ohms: continuityState === 'closed' ? 0.5 : null };
    }
    if (archetype === 'checklist') {
      return { ...base, visual_ok: visualOk, rail_voltage_ok: railOk, short_detected: shortDetected };
    }
    return base;
  };

  const diagnose = async () => {
    setLoading(true);
    try {
      const res = await api.post('/knowledge/diagnose', buildPayload());
      setVerdict(res.data);
      onDiagnosed && onDiagnosed(res.data);
    } catch (e) {
      setVerdict({ verdict: 'Error', message: e?.response?.data?.detail || 'Diagnosis failed', is_good: false });
    } finally {
      setLoading(false);
    }
  };

  if (!instructions) return null;

  return (
    <div>
      {/* Multimeter mode + in-circuit reliability banner */}
      <div style={{
        padding: '9px 12px', borderRadius: 10, background: 'var(--info-bg)',
        marginBottom: 14, fontSize: 11, color: 'var(--info-text)', lineHeight: 1.5,
      }}>
        <strong>Mode:</strong> {instructions.multimeter_mode}
        {!instructions.in_circuit_reliable && instructions.in_circuit_note && (
          <div style={{ marginTop: 4, color: '#b45309' }}>
            ⚠ {instructions.in_circuit_note}
          </div>
        )}
      </div>

      {/* Reference part / marking selector — for non-expert users who can
          identify what's printed on the component but can't read a full
          datasheet. Selecting one auto-fills the nominal value / expected
          forward voltage in the fields below. */}
      {referenceParts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={labelStyle}>
            Not sure of the exact value? Select what's printed on it (optional)
          </div>
          <select value={selectedPartIdx} onChange={e => handlePartSelect(e.target.value)}
            style={{ ...fieldStyle, cursor: 'pointer' }}>
            <option value="">— No marking selected —</option>
            {referenceParts.map((p, i) => (
              <option key={i} value={i}>{p.label}</option>
            ))}
          </select>
          {selectedPart && (
            <div style={{
              marginTop: 7, padding: '8px 11px', borderRadius: 9,
              background: 'var(--info-bg)', color: 'var(--info-text)',
              fontSize: 10.5, lineHeight: 1.5, display: 'flex', gap: 7,
            }}>
              <Info size={12} style={{ flexShrink: 0, marginTop: 1 }} />
              {selectedPart.note}
            </div>
          )}
        </div>
      )}

      {/* ── TOLERANCE archetype ── */}
      {archetype === 'tolerance' && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
              Nominal value
              {autoFilled && <span className="badge badge-info" style={{ padding: '1px 7px', fontSize: 9 }}><ScanText size={9} /> Auto-filled</span>}
            </div>
            <input value={nominal} onChange={e => { setNominal(e.target.value); setAutoFilled(false); }} type="number" step="any"
              placeholder="From marking / datasheet" style={fieldStyle} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={labelStyle}>Measured value</div>
            <input value={measured} onChange={e => setMeasured(e.target.value)} type="number" step="any"
              placeholder="Multimeter reading" style={fieldStyle} />
          </div>
        </>
      )}

      {/* ── CAPACITOR (hybrid) archetype ── */}
      {archetype === 'capacitor' && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 6 }}>
              Nominal capacitance (µF)
              {autoFilled && <span className="badge badge-info" style={{ padding: '1px 7px', fontSize: 9 }}><ScanText size={9} /> Auto-filled</span>}
            </div>
            <input value={nominal} onChange={e => { setNominal(e.target.value); setAutoFilled(false); }} type="number" step="any" style={fieldStyle} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={labelStyle}>Measured capacitance (µF)</div>
            <input value={measured} onChange={e => setMeasured(e.target.value)} type="number" step="any" style={fieldStyle} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>ESR reading (Ω) — optional</div>
              <input value={esr} onChange={e => setEsr(e.target.value)} type="number" step="any" style={fieldStyle} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={labelStyle}>ESR reference (Ω)</div>
              <input value={esrReference} onChange={e => setEsrReference(e.target.value)} type="number" step="any" style={fieldStyle} />
            </div>
          </div>
        </>
      )}

      {/* ── DIODE_PATTERN archetype ── */}
      {archetype === 'diode_pattern' && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={labelStyle}>Forward reading (V)</div>
            <input value={forward} onChange={e => setForward(e.target.value)} type="number" step="any"
              disabled={forwardOL} style={{ ...fieldStyle, opacity: forwardOL ? 0.5 : 1 }} />
            <OLToggle isOL={forwardOL} onChange={setForwardOL} />
          </div>
          <div style={{ marginBottom: 10 }}>
            <div style={labelStyle}>Reverse reading (V)</div>
            <input value={reverse} onChange={e => setReverse(e.target.value)} type="number" step="any"
              disabled={reverseOL} style={{ ...fieldStyle, opacity: reverseOL ? 0.5 : 1 }} />
            <OLToggle isOL={reverseOL} onChange={setReverseOL} />
          </div>
        </>
      )}

      {/* ── CONTINUITY archetype (incl. inverted MOV) ── */}
      {archetype === 'continuity' && (
        <div style={{ marginBottom: 10 }}>
          <div style={labelStyle}>Continuity test result</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setContinuityState('closed')}
              className={continuityState === 'closed' ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ flex: 1, padding: 9, fontSize: 11.5 }}>
              🔊 Beeps (continuity)
            </button>
            <button type="button" onClick={() => setContinuityState('open')}
              className={continuityState === 'open' ? 'btn btn-primary' : 'btn btn-ghost'}
              style={{ flex: 1, padding: 9, fontSize: 11.5 }}>
              🔇 No beep (OL)
            </button>
          </div>
        </div>
      )}

      {/* ── CHECKLIST archetype (IC) ── */}
      {archetype === 'checklist' && (
        <>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={visualOk} onChange={e => setVisualOk(e.target.checked)} />
            No visual/thermal defect (crack, burn, excess heat)
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, fontSize: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={shortDetected} onChange={e => setShortDetected(e.target.checked)} />
            Excessive pin-to-pin continuity detected (possible internal short)
          </label>
          <div style={{ marginBottom: 10 }}>
            <div style={labelStyle}>Supply rail matches datasheet?</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setRailOk(true)}
                className={railOk === true ? 'btn btn-primary' : 'btn btn-ghost'} style={{ flex: 1, padding: 8, fontSize: 11.5 }}>Yes</button>
              <button type="button" onClick={() => setRailOk(false)}
                className={railOk === false ? 'btn btn-primary' : 'btn btn-ghost'} style={{ flex: 1, padding: 8, fontSize: 11.5 }}>No</button>
            </div>
          </div>
        </>
      )}

      <button className="btn btn-primary" onClick={diagnose} disabled={loading || !canSubmit()}
        style={{ width: '100%', padding: 11, fontSize: 12.5, marginBottom: 14 }}>
        {loading ? <><Loader2 size={14} className="pulse" /> Analysing...</> : <><Stethoscope size={14} /> Diagnose Component</>}
      </button>

      {verdict && (() => {
        const style = VERDICT_STYLE[verdict.verdict] || VERDICT_STYLE["Inconclusive — Manual Inspection Required"];
        const Icon = style.Icon;
        return (
          <div className="scale-in" style={{
            borderRadius: 14, padding: '14px 16px', background: style.bg,
            border: `1px solid ${style.border}`,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.6, color: style.color, marginBottom: 5 }}>
              <Icon size={13} /> {verdict.failure_mode && verdict.failure_mode !== 'Good' ? 'Failure Mode' : 'Result'}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: style.color }}>{verdict.verdict}</div>
            <div style={{ fontSize: 12, marginTop: 7, color: 'var(--text-secondary)', lineHeight: 1.55 }}>{verdict.message}</div>
            {verdict.deviation_percent != null && (
              <div style={{ fontSize: 10.5, marginTop: 5, color: 'var(--text-muted)' }}>Deviation: {verdict.deviation_percent}%</div>
            )}
            {verdict.action && (
              <div style={{ marginTop: 9, fontSize: 11, padding: '7px 10px', background: 'rgba(255,255,255,0.5)', borderRadius: 8, color: 'var(--text-secondary)' }}>
                <strong>Action:</strong> {verdict.action}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
