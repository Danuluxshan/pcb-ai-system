import { useState, useEffect } from 'react';
import { CheckCircle, Lightbulb, Gauge, AlertTriangle, BookOpen, HelpCircle } from 'lucide-react';
import api from '../services/api';

const ARCHETYPE_LABEL = {
  tolerance:      'Numeric Tolerance Check',
  capacitor:      'Capacitance + ESR Check',
  diode_pattern:  'Diode-Pattern Check',
  continuity:     'Continuity Check',
  checklist:      'Guided Checklist (no direct multimeter test)',
};

const ARCHETYPE_COLOR = {
  tolerance:      { bg: '#e6f1fb', color: '#185fa5' },
  capacitor:      { bg: '#f0fdf4', color: '#15803d' },
  diode_pattern:  { bg: '#fdf4ff', color: '#86198f' },
  continuity:     { bg: '#fffbeb', color: '#b45309' },
  checklist:      { bg: '#f1f5f9', color: '#475569' },
};

// Quick-reference legend so a user immediately understands what a verdict
// label means, independent of which archetype/component they're viewing.
const FAILURE_MODE_LEGEND = [
  { label: 'Good',             desc: 'Reading matches the expected healthy pattern.',                 color: '#15803d', bg: '#eefcf3' },
  { label: 'Open Circuit',     desc: 'No continuity / OL where a reading was expected — broken path.', color: '#b91c1c', bg: '#fef2f2' },
  { label: 'Short Circuit',    desc: 'Conducts where it should block — junction or path shorted.',     color: '#b91c1c', bg: '#fef2f2' },
  { label: 'Leaky',            desc: 'Partial reverse conduction — degraded junction.',                color: '#b45309', bg: '#fffaeb' },
  { label: 'Out of Tolerance', desc: 'Value measurable, but outside the acceptable band.',              color: '#b45309', bg: '#fffaeb' },
  { label: 'High ESR',         desc: 'Capacitance may look fine — series resistance has degraded.',    color: '#b45309', bg: '#fffaeb' },
];

/**
 * Displays the step-by-step professional testing procedure for the
 * selected component, driven by GET /knowledge/{class_name}'s new
 * archetype-based schema (multimeter_mode, in_circuit_reliable,
 * in_circuit_note, steps, expected) — replaces the old free-text
 * `description` field, which no longer exists in the response.
 */
export default function TestingProcedurePanel({ componentClass, instructions, activeStep, onStepClick }) {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    setInfo(null);
    if (!componentClass) return;
    api.get(`/knowledge/${componentClass}/info`)
      .then(res => setInfo(res.data))
      .catch(() => setInfo(null));
  }, [componentClass]);

  if (!instructions) {
    return <div className="skeleton" style={{ height: 200, borderRadius: 12 }} />;
  }

  const archColor = ARCHETYPE_COLOR[instructions.archetype] || ARCHETYPE_COLOR.checklist;

  return (
    <div>
      {/* Plain-language "What is this?" card — for users with no prior
          electronics knowledge, shown before any technical detail. */}
      {info && (
        <div style={{
          padding: '12px 14px', borderRadius: 12, background: 'var(--page-bg)',
          border: '1px solid var(--border)', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
            <HelpCircle size={13} /> What is a {componentClass}?
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 6 }}>
            {info.what_it_does}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', lineHeight: 1.55 }}>
            <strong>Common uses:</strong> {info.common_uses}<br />
            <strong>Look for:</strong> {info.how_to_identify}
          </div>
        </div>
      )}
      {/* Archetype badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <span className="badge" style={{ background: archColor.bg, color: archColor.color }}>
          <Gauge size={11} /> {ARCHETYPE_LABEL[instructions.archetype] || 'Guided Check'}
        </span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{instructions.multimeter_mode}</span>
      </div>

      {!instructions.in_circuit_reliable && instructions.in_circuit_note && (
        <div style={{
          display: 'flex', gap: 8, padding: '9px 12px', borderRadius: 10,
          background: 'var(--warning-bg)', color: 'var(--warning-text)',
          fontSize: 11, lineHeight: 1.5, marginBottom: 16,
        }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
          {instructions.in_circuit_note}
        </div>
      )}

      {/* Step-by-step procedure */}
      {(instructions.steps || []).map((step, i) => {
        const done = i < activeStep - 1;
        const active = i === activeStep - 1;
        return (
          <div key={i} onClick={() => onStepClick(i + 1)} style={{
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

      {/* Expected reading summary */}
      <div style={{
        marginTop: 16, padding: '12px 14px', background: 'var(--info-bg)', borderRadius: 12,
        fontSize: 11.5, color: 'var(--info-text)', lineHeight: 1.6,
        display: 'flex', gap: 9, alignItems: 'flex-start',
      }}>
        <Lightbulb size={14} style={{ flexShrink: 0, marginTop: 1 }} />
        <div><strong>Healthy reading looks like</strong><br />{instructions.expected}</div>
      </div>

      {/* Failure-mode legend — collapsible reference */}
      <details style={{ marginTop: 16 }}>
        <summary style={{
          fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600,
        }}>
          <BookOpen size={12} /> Verdict reference (what each label means)
        </summary>
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {FAILURE_MODE_LEGEND.map(item => (
            <div key={item.label} style={{
              display: 'flex', gap: 8, alignItems: 'baseline',
              padding: '6px 9px', borderRadius: 8, background: item.bg,
            }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, color: item.color, minWidth: 100 }}>{item.label}</span>
              <span style={{ fontSize: 10.5, color: 'var(--text-secondary)' }}>{item.desc}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
