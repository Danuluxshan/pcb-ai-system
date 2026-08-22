import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Boxes, Zap, ShieldAlert, CircleCheck, Info, Trash2 } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import { getModels, activateModel, deleteModel } from '../../services/adminApi';

export default function AdminModels() {
  const [models, setModels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(null);
  const [msg, setMsg] = useState('');
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(null);

  const load = () => {
    setLoading(true);
    getModels().then(d => setModels(d.models || [])).catch(() => { }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const activate = async (id, version, force = false) => {
    const confirmMsg = force
      ? `Force replace with "${version}"?\n\nThis SKIPS blending entirely — the current active model will be completely discarded. Use only for clean restores.`
      : `Activate "${version}"?\n\nThis safely blends with the current model (70% current + 30% new) to protect against overfitting on small training data.`;
    if (!window.confirm(confirmMsg)) return;
    setActivating(id); setMsg('');
    try { const res = await activateModel(id, force); setMsg(`✅ ${res.message}`); load(); }
    catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Activation failed'}`); }
    finally { setActivating(null); }
  };

  const requestDelete = (id, version, isActive) => {
    if (isActive) {
      setMsg('❌ Cannot delete the active model — activate a different version first');
      return;
    }
    setConfirmDelete({ id, version });
  };

  const confirmRemove = async () => {
    if (!confirmDelete) return;
    const { id } = confirmDelete;
    setActivating(id);
    setConfirmDelete(null);
    setMsg('');
    try { const res = await deleteModel(id); setMsg(`✅ ${res.message}`); load(); }
    catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Delete failed'}`); }
    finally { setActivating(null); }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0d1520' }}>
      <AdminSidebar active="/admin/models" />

      <div style={{ flex: 1, overflow: 'auto', padding: 26, background: 'var(--page-bg)' }} className="fade-in">
        <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.4, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Boxes size={22} color="var(--accent-strong)" /> Model Versions
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 18 }}>
          Manage and activate trained model versions
        </div>

        {msg && (
          <div className="badge fade-in" style={{ display: 'block', padding: '10px 14px', marginBottom: 16, fontSize: 12, background: msg.startsWith('✅') ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.startsWith('✅') ? 'var(--success-text)' : 'var(--danger-text)' }}>
            {msg}
          </div>
        )}

        <div className="card fade-in-up" style={{
          padding: '14px 18px', marginBottom: 18, fontSize: 12, color: 'var(--info-text)',
          background: 'var(--info-bg)', border: '0.5px solid var(--info-border)', lineHeight: 1.65,
          display: 'flex', gap: 10,
        }}>
          <Info size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <div>
            <strong>Activate (safe blend)</strong> combines 70% of the current model with 30% of the selected one — protects against overfitting on small admin-training datasets.<br />
            <strong>Force replace</strong> skips blending entirely and fully swaps the model. Use only to restore a known-good version (e.g. the base model) — not for regular fine-tuned models.
          </div>
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 200, borderRadius: 18 }} />
        ) : models.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 44 }}>
            <div style={{ width: 52, height: 52, borderRadius: 15, background: 'var(--page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px', color: 'var(--text-muted)' }}><Boxes size={22} /></div>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>No models yet</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>Train a model from the Training page to see it here</div>
            <button className="btn btn-primary" onClick={() => navigate('/admin/train')} style={{ margin: '0 auto', padding: '9px 20px' }}>Go to Training →</button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {models.map((m, i) => {
              const isAdminFineTune = m.version.includes('admin') && !m.version.includes('blended');
              return (
                <div key={m.id} className={`card card-hover fade-in-up stagger-${Math.min(i + 1, 6)}`} style={{
                  padding: 20, position: 'relative', overflow: 'hidden',
                  border: m.is_active ? '1.5px solid var(--accent-strong)' : undefined,
                }}>
                  {m.is_active && (
                    <div className="badge" style={{ position: 'absolute', top: 0, right: 0, background: 'var(--accent-bg)', color: 'var(--accent)', borderRadius: '0 0 0 12px', padding: '5px 14px' }}>
                      <CircleCheck size={11} /> ACTIVE
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                        <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)' }}>{m.version}</div>
                        {m.is_active && <span className="badge badge-info">Current</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap', marginBottom: 8 }}>
                        {[
                          ['mAP@50', m.map50 ? `${(m.map50 * 100).toFixed(1)}%` : '—', m.map50 >= 0.7 ? 'var(--success-text)' : m.map50 >= 0.5 ? 'var(--warning-text)' : 'var(--text-muted)'],
                          ['Epochs', m.epochs || '—', 'var(--text-secondary)'],
                          ['Created', new Date(m.created_at).toLocaleDateString(), 'var(--text-secondary)'],
                        ].map(([k, v, color]) => (
                          <div key={k}>
                            <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 3, fontWeight: 600 }}>{k}</div>
                            <div style={{ fontSize: 14, fontWeight: 700, color }}>{v}</div>
                          </div>
                        ))}
                      </div>
                      {isAdminFineTune && (
                        <div className="badge badge-warning" style={{ marginBottom: 8 }}>
                          <ShieldAlert size={10} /> mAP from small validation split — use safe blend
                        </div>
                      )}
                      {m.notes && <div style={{ fontSize: 11.5, color: 'var(--text-muted)', fontStyle: 'italic', marginBottom: 8 }}>{m.notes}</div>}
                      <div className="font-mono" style={{ fontSize: 10, color: 'var(--text-muted)', background: 'var(--page-bg)', padding: '4px 9px', borderRadius: 6, display: 'inline-block' }}>
                        {m.model_path?.split('\\').pop() || m.model_path?.split('/').pop()}
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0, minWidth: 170 }}>
                      {!m.is_active ? (
                        <>
                          <button className="btn btn-primary" onClick={() => activate(m.id, m.version, false)} disabled={activating === m.id} style={{ padding: '9px 16px', fontSize: 12 }}>
                            <Zap size={13} /> {activating === m.id ? 'Working...' : 'Activate (safe)'}
                          </button>
                          <button className="btn btn-ghost" onClick={() => activate(m.id, m.version, true)} disabled={activating === m.id}
                            style={{ padding: '8px 16px', fontSize: 11, color: 'var(--warning-text)', borderColor: 'var(--warning-border)' }}>
                            <ShieldAlert size={12} /> Force replace
                          </button>
                          <button className="btn btn-ghost" onClick={() => requestDelete(m.id, m.version, m.is_active)} disabled={activating === m.id}
                            style={{ padding: '8px 16px', fontSize: 11, color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}>
                            <Trash2 size={12} /> Delete
                          </button>
                        </>
                      ) : (
                        <div className="badge badge-neutral" style={{ padding: '8px 16px', textAlign: 'center', justifyContent: 'center' }}>✓ In use</div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {confirmDelete && (
        <div onClick={() => setConfirmDelete(null)} className="fade-in" style={{
          position: 'fixed', inset: 0, background: 'rgba(13,21,32,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div onClick={e => e.stopPropagation()} className="scale-in card" style={{
            padding: 26, maxWidth: 380, width: '90%', textAlign: 'center',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, background: 'var(--danger-bg)',
              color: 'var(--danger-text)', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <Trash2 size={24} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
              Delete "{confirmDelete.version}"?
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 22 }}>
              This permanently removes the model file from disk. This action cannot be undone.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: 10 }}>
                Cancel
              </button>
              <button className="btn" onClick={confirmRemove} style={{
                flex: 1, padding: 10, background: 'var(--danger-text)', color: '#fff',
              }}>
                <Trash2 size={13} /> Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
