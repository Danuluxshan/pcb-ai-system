import { useState, useEffect } from 'react';
import axios from 'axios';
import { BookOpen, Image as ImageIcon, Plus, Save, Trash2, Camera } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import { getAdminUser } from '../../services/adminApi';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}` });
const staticUrl = (p) => `${API_BASE}${p}`;

const getEducationListAdmin  = async () => (await axios.get(`${API_BASE}/api/education`)).data;
const updateEducationAdmin   = async (id, data) => (await axios.put(`${API_BASE}/api/education/${id}`, data, { headers: authHeaders() })).data;
const uploadEducationImageAdmin = async (id, file) => { const f = new FormData(); f.append('file', file); return (await axios.post(`${API_BASE}/api/education/${id}/image`, f, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } })).data; };
const seedEducationAdmin     = async () => (await axios.post(`${API_BASE}/api/education/seed`, {}, { headers: authHeaders() })).data;
const createVariant          = async (cid, name, description) => (await axios.post(`${API_BASE}/api/education/${cid}/variants`, { name, description }, { headers: authHeaders() })).data;
const updateVariant          = async (vid, data) => (await axios.put(`${API_BASE}/api/education/variants/${vid}`, data, { headers: authHeaders() })).data;
const uploadVariantImage     = async (vid, file) => { const f = new FormData(); f.append('file', file); return (await axios.post(`${API_BASE}/api/education/variants/${vid}/image`, f, { headers: { ...authHeaders(), 'Content-Type': 'multipart/form-data' } })).data; };
const deleteVariant          = async (vid) => (await axios.delete(`${API_BASE}/api/education/variants/${vid}`, { headers: authHeaders() })).data;

export default function AdminLearnContent() {
  const [components, setComponents] = useState([]);
  const [selected,    setSelected]   = useState(null);
  const [form,        setForm]       = useState(null);
  const [loading,     setLoading]    = useState(true);
  const [saving,      setSaving]     = useState(false);
  const [uploading,   setUploading]  = useState(false);
  const [msg,         setMsg]        = useState('');
  const [newVarName, setNewVarName]  = useState('');
  const [newVarDesc, setNewVarDesc]  = useState('');
  const [addingVar,  setAddingVar]   = useState(false);
  const [varUploading, setVarUploading] = useState(null);
  const [cacheBust, setCacheBust] = useState(Date.now());

  const load = async (keepId) => {
    setLoading(true);
    try {
      let d = await getEducationListAdmin();
      let list = d.components || [];
      if (list.length === 0) { await seedEducationAdmin(); d = await getEducationListAdmin(); list = d.components || []; }
      setComponents(list);
      const keep = keepId && list.find(c => c.id === keepId);
      selectComp(keep || list[0]);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const selectComp = (comp) => {
    if (!comp) return;
    setSelected(comp);
    setForm({ short: comp.short, function: comp.function, how_it_works: comp.how_it_works, uses: comp.uses.join('\n'), identification: comp.identification, fun_fact: comp.fun_fact });
    setNewVarName(''); setNewVarDesc(''); setMsg('');
  };

  const save = async () => {
    if (!selected) return;
    setSaving(true); setMsg('');
    try {
      const payload = { ...form, uses: form.uses.split('\n').map(s => s.trim()).filter(Boolean) };
      const res = await updateEducationAdmin(selected.id, payload);
      setMsg('✅ Saved successfully');
      setComponents(prev => prev.map(c => c.id === selected.id ? res.component : c));
      setSelected(res.component);
    } catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Save failed'}`); }
    finally { setSaving(false); }
  };

  const uploadMainImage = async (file) => {
    if (!selected || !file) return;
    setUploading(true); setMsg('');
    try {
      const res = await uploadEducationImageAdmin(selected.id, file);
      const updated = { ...selected, image_path: res.image_path };
      setSelected(updated);
      setComponents(prev => prev.map(c => c.id === selected.id ? updated : c));
      setCacheBust(Date.now());
      setMsg('✅ Photo uploaded');
    } catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Upload failed'}`); }
    finally { setUploading(false); }
  };

  const addVariant = async () => {
    if (!selected || !newVarName.trim()) return;
    setAddingVar(true); setMsg('');
    try { await createVariant(selected.id, newVarName.trim(), newVarDesc.trim()); setNewVarName(''); setNewVarDesc(''); await load(selected.id); setMsg('✅ Type added'); }
    catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Failed to add type'}`); }
    finally { setAddingVar(false); }
  };

  const editVariantField = (vid, field, value) => setSelected(prev => ({ ...prev, variants: prev.variants.map(v => v.id === vid ? { ...v, [field]: value } : v) }));

  const saveVariant = async (variant) => {
    setMsg('');
    try { await updateVariant(variant.id, { name: variant.name, description: variant.description }); setMsg(`✅ "${variant.name}" saved`); }
    catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Save failed'}`); }
  };

  const handleVariantImage = async (vid, file) => {
    if (!file) return;
    setVarUploading(vid); setMsg('');
    try {
      const res = await uploadVariantImage(vid, file);
      setSelected(prev => ({ ...prev, variants: prev.variants.map(v => v.id === vid ? { ...v, image_path: res.image_path } : v) }));
      setCacheBust(Date.now());
      setMsg('✅ Type photo uploaded');
    } catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Upload failed'}`); }
    finally { setVarUploading(null); }
  };

  const removeVariant = async (vid, name) => {
    if (!window.confirm(`Delete type "${name}"?`)) return;
    try { await deleteVariant(vid); setSelected(prev => ({ ...prev, variants: prev.variants.filter(v => v.id !== vid) })); }
    catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Delete failed'}`); }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0d1520' }}>
      <AdminSidebar active="/admin/learn" />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', background: 'var(--page-bg)' }}>
        {loading ? (
          <div style={{ padding: 26, color: 'var(--text-muted)' }}>Loading...</div>
        ) : (
          <>
            <div className="card" style={{ width: 230, margin: '16px 0 16px 16px', overflowY: 'auto', flexShrink: 0, borderRadius: 16 }}>
              <div style={{ padding: '14px 16px', fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', borderBottom: '0.5px solid var(--border)' }}>
                Learn Content ({components.length})
              </div>
              {components.map(comp => {
                const isSel = selected?.id === comp.id;
                return (
                  <div key={comp.id} onClick={() => selectComp(comp)} style={{
                    padding: '10px 16px', cursor: 'pointer',
                    background: isSel ? 'var(--info-bg)' : 'transparent',
                    borderLeft: isSel ? '3px solid var(--accent-strong)' : '3px solid transparent',
                    transition: 'background 150ms ease',
                  }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{comp.id.replace('_', ' ')}</div>
                    <div style={{ fontSize: 9.5, color: comp.image_path ? 'var(--success-text)' : 'var(--warning-text)' }}>
                      {comp.variants?.length || 0} types{!comp.image_path && ' · no photo'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 26 }} className="fade-in">
              {selected && form && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 9 }}>
                        <BookOpen size={20} color="var(--accent-strong)" /> {selected.id.replace('_', ' ')}
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={save} disabled={saving} style={{ padding: '9px 22px' }}>
                      <Save size={14} /> {saving ? 'Saving...' : 'Save Description'}
                    </button>
                  </div>

                  {msg && <div className="badge fade-in" style={{ display: 'block', padding: '9px 14px', marginBottom: 14, fontSize: 12, background: msg.startsWith('✅') ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.startsWith('✅') ? 'var(--success-text)' : 'var(--danger-text)' }}>{msg}</div>}

                  <div className="card fade-in-up" style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, padding: 20, marginBottom: 24 }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 7, fontWeight: 700, textTransform: 'uppercase' }}>Main Photo</div>
                      <div style={{ width: 200, height: 150, borderRadius: 12, background: 'var(--page-bg)', border: '1.5px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 8 }}>
                        {selected.image_path ? <img src={`${staticUrl(selected.image_path)}?v=${cacheBust}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={26} color="var(--text-muted)" />}
                      </div>
                      <label className="btn btn-ghost" style={{ display: 'flex', width: 200, justifyContent: 'center', padding: 8, fontSize: 11, cursor: 'pointer' }}>
                        <Camera size={12} /> {uploading ? 'Uploading...' : 'Upload Photo'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading} onChange={e => e.target.files[0] && uploadMainImage(e.target.files[0])} />
                      </label>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                      {[
                        { key: 'short', label: 'Short Description', rows: 2 },
                        { key: 'function', label: 'Function', rows: 3 },
                        { key: 'how_it_works', label: 'How It Works', rows: 3 },
                        { key: 'uses', label: 'Common Uses (one per line)', rows: 5 },
                        { key: 'identification', label: 'How to Identify It', rows: 2 },
                        { key: 'fun_fact', label: 'Fun Fact', rows: 2 },
                      ].map(({ key, label, rows }) => (
                        <div key={key}>
                          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                          <textarea value={form[key]} rows={rows} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                            className="input-modern" style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical', fontSize: 12.5 }} />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="fade-in-up stagger-1" style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                    🧩 Component Types ({selected.variants?.length || 0})
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 16 }}>
                    Different physical packages this component can appear as, each with its own photo.
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px,1fr))', gap: 14, marginBottom: 20 }}>
                    {(selected.variants || []).map((v, i) => (
                      <div key={v.id} className={`card fade-in-up stagger-${Math.min(i + 1, 6)}`} style={{ overflow: 'hidden', display: 'flex' }}>
                        <div style={{ width: 84, height: 84, background: 'var(--page-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, overflow: 'hidden' }}>
                          {v.image_path ? <img src={`${staticUrl(v.image_path)}?v=${cacheBust}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIcon size={18} color="var(--text-muted)" />}
                        </div>
                        <div style={{ flex: 1, padding: '9px 11px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                          <input value={v.name} onChange={e => editVariantField(v.id, 'name', e.target.value)} style={{ width: '100%', fontSize: 11.5, fontWeight: 700, border: 'none', outline: 'none', color: 'var(--text-primary)', padding: 0, marginBottom: 4, background: 'transparent' }} />
                          <textarea value={v.description} rows={2} onChange={e => editVariantField(v.id, 'description', e.target.value)} style={{ width: '100%', fontSize: 10, border: 'none', outline: 'none', color: 'var(--text-muted)', resize: 'none', padding: 0, background: 'transparent', fontFamily: 'inherit', flex: 1 }} />
                          <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                            <button onClick={() => saveVariant(v)} className="badge badge-success" style={{ cursor: 'pointer', border: 'none' }}>Save</button>
                            <label className="badge badge-neutral" style={{ cursor: 'pointer' }}>{varUploading === v.id ? '...' : 'Photo'}<input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleVariantImage(v.id, e.target.files[0])} /></label>
                            <button onClick={() => removeVariant(v.id, v.name)} className="badge badge-danger" style={{ cursor: 'pointer', border: 'none', marginLeft: 'auto' }}><Trash2 size={9} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="card fade-in-up stagger-2" style={{ padding: 16, border: '1.5px dashed var(--border-strong)' }}>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={13} /> Add a new type</div>
                    <input value={newVarName} onChange={e => setNewVarName(e.target.value)} placeholder="Type name (e.g. 'SMD Chip Resistor')"
                      className="input-modern" style={{ width: '100%', marginBottom: 8, fontSize: 11.5 }} />
                    <textarea value={newVarDesc} onChange={e => setNewVarDesc(e.target.value)} placeholder="Short description..." rows={2}
                      className="input-modern" style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical', marginBottom: 10, fontSize: 11.5 }} />
                    <button className="btn btn-primary" onClick={addVariant} disabled={addingVar || !newVarName.trim()} style={{ padding: '8px 20px' }}>
                      <Plus size={13} /> {addingVar ? 'Adding...' : 'Add Type'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
