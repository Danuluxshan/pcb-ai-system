import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, Cpu,
  FileText, SkipForward, Flame,
} from 'lucide-react';
import { getInstructions, downloadReport, staticUrl, saveComponentDiagnosis } from '../services/api';
import DiagnosisPanel from '../components/DiagnosisPanel';
import TestingProcedurePanel from '../components/TestingProcedurePanel';

const COMP_ICON_COLOR = {
  IC: '#38bdf8', Capacitor: '#22c55e', Resistor: '#f59e0b',
  Diode: '#a855f7', LED: '#a855f7', Transistor: '#f97316',
  MOSFET: '#0ea5e9', Connector: '#64748b', default: '#94a3b8',
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

  const initResult   = location.state?.result   || null;
  const initSelected = location.state?.selected || null;

  const [result,      setResult]      = useState(initResult);
  const [components,  setComponents]  = useState(initResult?.components || []);
  const [currentIdx,  setCurrentIdx]  = useState(
    initSelected ? (initResult?.components?.findIndex(c => c.id === initSelected.id) || 0) : 0
  );
  const [instructions, setInstructions] = useState(null);
  const [activeStep,  setActiveStep]  = useState(2);

  const current = components[currentIdx] || null;

  useEffect(() => {
    if (!current) return;
    setInstructions(null);
    setActiveStep(2);
    getInstructions(current.class_name).then(setInstructions).catch(() => setInstructions(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIdx, current?.id]);

  const groups = components.reduce((acc, c, idx) => {
    if (!acc[c.class_name]) acc[c.class_name] = [];
    acc[c.class_name].push({ ...c, _idx: idx });
    return acc;
  }, {});

  const pending = components.filter(c => !c.diagnosis).length;
  const good    = components.filter(c => c.diagnosis?.toLowerCase().includes('good')).length;
  const bad     = components.filter(c => c.diagnosis && !c.diagnosis.toLowerCase().includes('good')).length;

  // Called by DiagnosisPanel once the archetype-aware verdict comes back.
  // Persists it to the database (fixes the "Pending forever" bug, D9) and
  // updates this page's own component-list state so the left column and
  // summary strip reflect the new status immediately.
  const handleDiagnosed = (verdictResult) => {
    const inspId = result?.inspection_id || result?.id;
    if (inspId && current?.id) {
      saveComponentDiagnosis(
        inspId, current.id, verdictResult.verdict,
        verdictResult.is_good ? 'none' : 'moderate'
      ).catch(err => console.error('Failed to save diagnosis:', err));
    }
    setComponents(prev => prev.map((c, i) =>
      i === currentIdx ? { ...c, diagnosis: verdictResult.verdict } : c
    ));
  };

  const skip = () => { if (currentIdx < components.length - 1) setCurrentIdx(currentIdx + 1); };
  const noData = !result || components.length === 0;

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
            {[['#22c55e', good], ['#ef4444', bad], ['#94a3b8', pending]].map(([dot, count]) => (
              <div key={dot} style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 10 }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: dot }} />
                <span style={{ color: 'var(--text-secondary)' }}>{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Col 2: Testing Procedure (archetype-aware) ─────────────── */}
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
          ) : (
            <TestingProcedurePanel
              componentClass={current.class_name}
              instructions={instructions}
              activeStep={activeStep}
              onStepClick={setActiveStep}
            />
          )}
        </div>
      </div>

      {/* ── Col 3: Measurement + Verdict (archetype-aware) ─────────── */}
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

          {current && (
            <DiagnosisPanel
              component={current}
              instructions={instructions}
              onDiagnosed={handleDiagnosed}
            />
          )}

          {current?.heatmap_url ? (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Flame size={12} /> Grad-CAM heatmap
              </div>
              <img src={staticUrl(current.heatmap_url)} alt="heatmap" style={{ width: '100%', borderRadius: 12, border: '1px solid var(--border)' }} />
            </div>
          ) : current && (
            <div style={{
              marginTop: 16, border: '1px dashed var(--border-strong)', borderRadius: 12, height: 90,
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
