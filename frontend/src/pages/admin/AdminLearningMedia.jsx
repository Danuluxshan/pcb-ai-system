import { useState, useEffect } from 'react';
import axios from 'axios';
import { Film, PlayCircle, NotebookText, Plus, Trash2, Save, Camera } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem('admin_token')}` });
const staticUrl = (p) => `${API_BASE}${p}`;
const api = {
  get: (url) => axios.get(`${API_BASE}/api${url}`, { headers: authHeaders() }),
  post: (url, data, cfg = {}) => axios.post(`${API_BASE}/api${url}`, data, { ...cfg, headers: { ...authHeaders(), ...(cfg.headers || {}) } }),
  put: (url, data) => axios.put(`${API_BASE}/api${url}`, data, { headers: authHeaders() }),
  del: (url) => axios.delete(`${API_BASE}/api${url}`, { headers: authHeaders() }),
};

const LEVELS = ['Basic', 'Intermediate'];
const CATEGORIES = ["Component Basics", "Symbols & Diagrams", "Soldering & Desoldering", "PCB Handling & Safety", "Tools & Equipment", "Circuit Diagrams"];

export default function AdminLearningMedia() {
  const [tab, setTab] = useState('videos');

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0d1520' }}>
      <AdminSidebar active="/admin/media" />

      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', background: 'var(--page-bg)' }}>
        <div style={{ padding: '22px 26px 0' }} className="fade-in">
          <div style={{ fontSize: 21, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.4, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Film size={22} color="var(--accent-strong)" /> Learning Media
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 16 }}>Manage video lessons and step-by-step guides</div>
          <div style={{ display: 'flex', gap: 6, marginBottom: 18 }}>
            {[{ key: 'videos', label: 'Video Lessons', Icon: PlayCircle }, { key: 'guides', label: 'Guides & Articles', Icon: NotebookText }].map(t => (
              <div key={t.key} onClick={() => setTab(t.key)} style={{
                padding: '9px 18px', borderRadius: 12, fontSize: 12, cursor: 'pointer', fontWeight: 700,
                display: 'flex', alignItems: 'center', gap: 7,
                background: tab === t.key ? 'linear-gradient(120deg,#1e3a5f,#16496b)' : '#fff',
                color: tab === t.key ? '#7dd3fc' : 'var(--text-secondary)',
                boxShadow: tab === t.key ? 'var(--shadow-md)' : 'var(--shadow-xs)',
              }}><t.Icon size={15} /> {t.label}</div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1, overflow: 'hidden', padding: '0 26px 26px' }}>
          {tab === 'videos' ? <VideosPanel /> : <GuidesPanel />}
        </div>
      </div>
    </div>
  );
}

// ── VIDEOS ──────────────────────────────────────────────────────────────
function VideosPanel() {
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ title: '', description: '', level: 'Basic', category: CATEGORIES[0], youtube_url: '' });
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const load = () => { setLoading(true); api.get('/learning/videos').then(res => setVideos(res.data.videos || [])).catch(() => { }).finally(() => setLoading(false)); };
  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.title.trim() || !form.youtube_url.trim()) { setMsg('❌ Title and YouTube URL required'); return; }
    setSaving(true); setMsg('');
    try {
      if (editingId) { await api.put(`/learning/videos/${editingId}`, form); setMsg('✅ Video updated'); }
      else { await api.post('/learning/videos', form); setMsg('✅ Video added'); }
      setForm({ title: '', description: '', level: 'Basic', category: CATEGORIES[0], youtube_url: '' });
      setEditingId(null); load();
    } catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Failed'}`); }
    finally { setSaving(false); }
  };

  const editVideo = (v) => { setEditingId(v.id); setForm({ title: v.title, description: v.description, level: v.level, category: v.category, youtube_url: `https://www.youtube.com/watch?v=${v.youtube_id}` }); setMsg(''); };
  const cancelEdit = () => { setEditingId(null); setForm({ title: '', description: '', level: 'Basic', category: CATEGORIES[0], youtube_url: '' }); };
  const removeVideo = async (id, title) => { if (!window.confirm(`Delete "${title}"?`)) return; try { await api.del(`/learning/videos/${id}`); load(); } catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Delete failed'}`); } };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 16, height: '100%' }}>
      <div className="card fade-in-up" style={{ padding: 18, height: 'fit-content' }}>
        <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>{editingId ? 'Edit Video' : 'Add a Real YouTube Video'}</div>
        <div className="badge badge-warning" style={{ display: 'block', padding: '8px 10px', marginBottom: 12, lineHeight: 1.5, fontSize: 10.5 }}>
          📹 Only add videos you've verified yourself.
        </div>
        {[{ k: 'title', l: 'Title' }, { k: 'youtube_url', l: 'YouTube URL', p: 'https://www.youtube.com/watch?v=...' }].map(({ k, l, p }) => (
          <div key={k} style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>{l}</div>
            <input value={form[k]} placeholder={p} onChange={e => setForm(f => ({ ...f, [k]: e.target.value }))} className="input-modern" style={{ width: '100%', fontSize: 11.5 }} />
          </div>
        ))}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Description</div>
          <textarea value={form.description} rows={2} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="input-modern" style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical', fontSize: 11.5 }} />
        </div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <div style={{ flex: 1 }}><div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 4 }}>Level</div>
            <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className="input-modern" style={{ width: '100%', fontSize: 11.5 }}>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
          <div style={{ flex: 1 }}><div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 4 }}>Category</div>
            <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-modern" style={{ width: '100%', fontSize: 10.5 }}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
        </div>
        {msg && <div className="badge" style={{ display: 'block', padding: '7px 10px', marginBottom: 10, fontSize: 11, background: msg.startsWith('✅') ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.startsWith('✅') ? 'var(--success-text)' : 'var(--danger-text)' }}>{msg}</div>}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-primary" onClick={submit} disabled={saving} style={{ flex: 1, padding: 9 }}>{saving ? 'Saving...' : editingId ? <><Save size={13} /> Update</> : <><Plus size={13} /> Add Video</>}</button>
          {editingId && <button className="btn btn-ghost" onClick={cancelEdit} style={{ padding: '9px 14px' }}>Cancel</button>}
        </div>
      </div>

      <div style={{ overflowY: 'auto' }}>
        {loading ? <div className="skeleton" style={{ height: 200, borderRadius: 16 }} /> : videos.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--text-muted)' }}>No videos added yet</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px,1fr))', gap: 12 }}>
            {videos.map((v, i) => (
              <div key={v.id} className={`card card-hover fade-in-up stagger-${Math.min(i + 1, 6)}`} style={{ overflow: 'hidden' }}>
                <img src={v.thumbnail} alt={v.title} style={{ width: '100%', height: 115, objectFit: 'cover' }} />
                <div style={{ padding: '11px 13px' }}>
                  <div className="badge badge-info" style={{ marginBottom: 6, fontSize: 9.5 }}>{v.level} · {v.category}</div>
                  <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 9, lineHeight: 1.35 }}>{v.title}</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => editVideo(v)} className="btn btn-ghost" style={{ flex: 1, padding: 6, fontSize: 10.5 }}>Edit</button>
                    <button onClick={() => removeVideo(v.id, v.title)} className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 10.5, color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}><Trash2 size={11} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── GUIDES ──────────────────────────────────────────────────────────────
function GuidesPanel() {
  const [guides, setGuides] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [newSecHeading, setNewSecHeading] = useState('');
  const [newSecText, setNewSecText] = useState('');
  const [addingSec, setAddingSec] = useState(false);
  const [secImgUploading, setSecImgUploading] = useState(null);
  const [showNewGuide, setShowNewGuide] = useState(false);
  const [newGuide, setNewGuide] = useState({ title: '', level: 'Basic', category: CATEGORIES[0], summary: '' });
  const [editingSectionId, setEditingSectionId] = useState(null);
  const [editDraft, setEditDraft] = useState({ heading: '', text: '' });
  const [editingGuideMeta, setEditingGuideMeta] = useState(false);

  const load = async (keepId) => {
    setLoading(true);
    try {
      const res = await api.get('/learning/guides');
      let list = res.data.guides || [];
      if (list.length === 0) { await api.post('/learning/seed-guide-topics', {}); const r2 = await api.get('/learning/guides'); list = r2.data.guides || []; }
      setGuides(list);
      const target = keepId ? list.find(g => g.id === keepId) : list[0];
      if (target) selectGuide(target.id);
    } catch { }
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const selectGuide = async (id) => {
    try { const res = await api.get(`/learning/guides/${id}`); setSelected(res.data); setForm({ title: res.data.title, level: res.data.level, category: res.data.category, summary: res.data.summary }); setMsg(''); setEditingGuideMeta(false); } catch { }
  };
  const saveMeta = async () => {
    if (!selected) return;
    setSaving(true); setMsg('');
    try { await api.put(`/learning/guides/${selected.id}`, form); setMsg('✅ Saved'); setEditingGuideMeta(false); load(selected.id); }
    catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Save failed'}`); }
    finally { setSaving(false); }
  };

  const cancelMetaEdit = () => {
    setForm({ title: selected.title, level: selected.level, category: selected.category, summary: selected.summary });
    setEditingGuideMeta(false);
  };
  const uploadCover = async (file) => {
    if (!selected || !file) return;
    setUploadingCover(true);
    try { const f = new FormData(); f.append('file', file); const res = await api.post(`/learning/guides/${selected.id}/cover`, f, { headers: { 'Content-Type': 'multipart/form-data' } }); setSelected(prev => ({ ...prev, cover_image: res.data.cover_image })); setMsg('✅ Cover uploaded'); }
    catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Upload failed'}`); }
    finally { setUploadingCover(false); }
  };
  const createGuide = async () => {
    if (!newGuide.title.trim()) return;
    try { const res = await api.post('/learning/guides', newGuide); setShowNewGuide(false); setNewGuide({ title: '', level: 'Basic', category: CATEGORIES[0], summary: '' }); await load(res.data.guide.id); }
    catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Failed'}`); }
  };
  const deleteGuide = async () => {
    if (!selected || !window.confirm(`Delete "${selected.title}" and all sections?`)) return;
    try { await api.del(`/learning/guides/${selected.id}`); setSelected(null); load(); }
    catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Delete failed'}`); }
  };
  const addSection = async () => {
    if (!selected || !newSecHeading.trim()) return;
    setAddingSec(true);
    try { await api.post(`/learning/guides/${selected.id}/sections`, { heading: newSecHeading.trim(), text: newSecText.trim() }); setNewSecHeading(''); setNewSecText(''); await selectGuide(selected.id); }
    catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Failed'}`); }
    finally { setAddingSec(false); }
  };
  const startEditSection = (s) => { setEditingSectionId(s.id); setEditDraft({ heading: s.heading, text: s.text }); };
  const cancelEditSection = () => { setEditingSectionId(null); setEditDraft({ heading: '', text: '' }); };
  const saveSectionEdit = async (sectionId) => {
    try {
      await api.put(`/learning/sections/${sectionId}`, { heading: editDraft.heading, text: editDraft.text });
      setSelected(prev => ({ ...prev, sections: prev.sections.map(s => s.id === sectionId ? { ...s, ...editDraft } : s) }));
      setEditingSectionId(null);
      setMsg('✅ Section saved');
    } catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Save failed'}`); }
  };
  const uploadSectionImg = async (sid, file) => {
    if (!file) return;
    setSecImgUploading(sid);
    try { const f = new FormData(); f.append('file', file); const res = await api.post(`/learning/sections/${sid}/image`, f, { headers: { 'Content-Type': 'multipart/form-data' } }); setSelected(prev => ({ ...prev, sections: prev.sections.map(s => s.id === sid ? { ...s, image_path: res.data.image_path } : s) })); }
    catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Failed'}`); }
    finally { setSecImgUploading(null); }
  };
  const removeSection = async (sid) => { if (!window.confirm('Delete this section?')) return; try { await api.del(`/learning/sections/${sid}`); setSelected(prev => ({ ...prev, sections: prev.sections.filter(s => s.id !== sid) })); } catch (e) { setMsg(`❌ ${e?.response?.data?.detail || 'Failed'}`); } };

  if (loading) return <div className="skeleton" style={{ height: 300, borderRadius: 16 }} />;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '230px 1fr', gap: 16, height: '100%' }}>
      <div className="card fade-in-up" style={{ overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '12px 14px', borderBottom: '0.5px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-primary)' }}>Guides ({guides.length})</span>
          <span onClick={() => setShowNewGuide(v => !v)} style={{ fontSize: 11, color: 'var(--accent-strong)', cursor: 'pointer', fontWeight: 700 }}>+ New</span>
        </div>
        {showNewGuide && (
          <div className="fade-in" style={{ padding: 12, borderBottom: '0.5px solid var(--border)', background: 'var(--page-bg)' }}>
            <input value={newGuide.title} placeholder="Guide title" onChange={e => setNewGuide(f => ({ ...f, title: e.target.value }))} className="input-modern" style={{ width: '100%', fontSize: 11, marginBottom: 6, padding: '6px 8px' }} />
            <select value={newGuide.level} onChange={e => setNewGuide(f => ({ ...f, level: e.target.value }))} className="input-modern" style={{ width: '100%', fontSize: 11, marginBottom: 6, padding: '6px 8px' }}>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select>
            <select value={newGuide.category} onChange={e => setNewGuide(f => ({ ...f, category: e.target.value }))} className="input-modern" style={{ width: '100%', fontSize: 10.5, marginBottom: 6, padding: '6px 8px' }}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <button className="btn btn-primary" onClick={createGuide} style={{ width: '100%', padding: 6, fontSize: 11 }}>Create</button>
          </div>
        )}
        {guides.map(g => (
          <div key={g.id} onClick={() => selectGuide(g.id)} style={{ padding: '9px 14px', cursor: 'pointer', background: selected?.id === g.id ? 'var(--info-bg)' : 'transparent', borderLeft: selected?.id === g.id ? '3px solid var(--accent-strong)' : '3px solid transparent' }}>
            <div style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.35 }}>{g.title}</div>
            <div style={{ fontSize: 9.5, color: 'var(--text-muted)' }}>{g.level} · {g.section_count || 0} sections</div>
          </div>
        ))}
      </div>

      <div style={{ overflowY: 'auto' }} className="fade-in">
        {selected && form && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{selected.title}</div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                {!editingGuideMeta && (
                  <button className="btn btn-ghost" onClick={() => setEditingGuideMeta(true)} style={{ padding: '8px 16px', fontSize: 11.5 }}>
                    ✎ Edit
                  </button>
                )}
                <button className="btn btn-ghost" onClick={deleteGuide} style={{ padding: '8px 16px', fontSize: 11.5, color: 'var(--danger-text)', borderColor: 'var(--danger-border)' }}><Trash2 size={12} /> Delete</button>
              </div>
            </div>
            {msg && <div className="badge" style={{ display: 'block', padding: '8px 12px', marginBottom: 14, fontSize: 11.5, background: msg.startsWith('✅') ? 'var(--success-bg)' : 'var(--danger-bg)', color: msg.startsWith('✅') ? 'var(--success-text)' : 'var(--danger-text)' }}>{msg}</div>}

            <div className="card" style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: 18, padding: 18, marginBottom: 22 }}>
              <div>
                <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 6, fontWeight: 700 }}>Cover Image</div>
                <div style={{ width: 160, height: 110, borderRadius: 10, background: 'var(--page-bg)', border: '1.5px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 7 }}>
                  {selected.cover_image ? <img src={staticUrl(selected.cover_image)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIconFallback />}
                </div>
                <label className="btn btn-ghost" style={{ display: 'flex', width: 160, justifyContent: 'center', padding: 6, fontSize: 10.5, cursor: 'pointer' }}>
                  <Camera size={11} /> {uploadingCover ? '...' : 'Upload'}
                  <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadCover(e.target.files[0])} />
                </label>
              </div>

              {editingGuideMeta ? (
                <div>
                  <div style={{ marginBottom: 9 }}><div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>Title</div>
                    <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="input-modern" style={{ width: '100%', fontSize: 12 }} autoFocus /></div>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 9 }}>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 4 }}>Level</div>
                      <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))} className="input-modern" style={{ width: '100%', fontSize: 11.5 }}>{LEVELS.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                    <div style={{ flex: 1 }}><div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 4 }}>Category</div>
                      <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} className="input-modern" style={{ width: '100%', fontSize: 10.5 }}>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                  </div>
                  <div style={{ marginBottom: 12 }}><div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 4 }}>Summary</div>
                    <textarea value={form.summary} rows={3} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} className="input-modern" style={{ width: '100%', minHeight: 90, fontFamily: 'inherit', resize: 'vertical', fontSize: 12 }} /></div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-primary" onClick={saveMeta} disabled={saving} style={{ padding: '8px 18px', fontSize: 11.5 }}><Save size={12} /> {saving ? 'Saving...' : 'Save'}</button>
                    <button className="btn btn-ghost" onClick={cancelMetaEdit} style={{ padding: '8px 16px', fontSize: 11.5 }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
                    <span className="badge badge-info">{selected.level}</span>
                    <span className="badge badge-neutral">{selected.category}</span>
                  </div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {selected.summary || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No summary yet</span>}
                  </div>
                </div>
              )}
            </div>

            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>📑 Sections ({selected.sections?.length || 0})</div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 14 }}>Each section is one step with its own heading, text, and photo.</div>

            {(selected.sections || []).map((s, i) => {
              const isEditing = editingSectionId === s.id;
              return (
                <div key={s.id} className="card fade-in-up" style={{ padding: 14, marginBottom: 12, display: 'flex', gap: 12 }}>
                  <div style={{ width: 100, flexShrink: 0 }}>
                    <div style={{ width: 100, height: 80, borderRadius: 10, background: 'var(--page-bg)', border: '1.5px dashed var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 6 }}>
                      {s.image_path ? <img src={staticUrl(s.image_path)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <ImageIconFallback size={16} />}
                    </div>
                    <label className="btn btn-ghost" style={{ display: 'flex', width: '100%', justifyContent: 'center', padding: 4, fontSize: 9.5, cursor: 'pointer' }}>
                      {secImgUploading === s.id ? '...' : 'Photo'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => e.target.files[0] && uploadSectionImg(s.id, e.target.files[0])} />
                    </label>
                  </div>

                  <div style={{ flex: 1 }}>
                    {isEditing ? (
                      <>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', paddingTop: 6 }}>{i + 1}.</span>
                          <input value={editDraft.heading} onChange={e => setEditDraft(d => ({ ...d, heading: e.target.value }))}
                            className="input-modern" style={{ flex: 1, fontSize: 12, fontWeight: 700, padding: '6px 9px' }} autoFocus />
                        </div>
                        <textarea value={editDraft.text} rows={8} onChange={e => setEditDraft(d => ({ ...d, text: e.target.value }))}
                          className="input-modern" style={{ width: '100%', minHeight: 160, fontFamily: 'inherit', resize: 'vertical', marginBottom: 8, fontSize: 12, lineHeight: 1.6 }} />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => saveSectionEdit(s.id)} className="btn btn-primary" style={{ padding: '6px 16px', fontSize: 11 }}><Save size={11} /> Save</button>
                          <button onClick={cancelEditSection} className="btn btn-ghost" style={{ padding: '6px 16px', fontSize: 11 }}>Cancel</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ display: 'flex', gap: 8, marginBottom: 6, alignItems: 'baseline' }}>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{i + 1}.</span>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{s.heading}</div>
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 10, whiteSpace: 'pre-line' }}>
                          {s.text || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No content yet</span>}
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => startEditSection(s)} className="badge badge-info" style={{ cursor: 'pointer', border: 'none' }}>✎ Edit</button>
                          <button onClick={() => removeSection(s.id)} className="badge badge-danger" style={{ cursor: 'pointer', border: 'none' }}>Delete</button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            <div className="card" style={{ padding: 14, border: '1.5px dashed var(--border-strong)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}><Plus size={12} /> Add a new section</div>
              <input value={newSecHeading} onChange={e => setNewSecHeading(e.target.value)} placeholder="Section heading" className="input-modern" style={{ width: '100%', marginBottom: 8, fontSize: 11.5 }} />
              <textarea value={newSecText} onChange={e => setNewSecText(e.target.value)} placeholder="Explanation text..." rows={3} className="input-modern" style={{ width: '100%', fontFamily: 'inherit', resize: 'vertical', marginBottom: 8, fontSize: 11.5 }} />
              <button className="btn btn-primary" onClick={addSection} disabled={addingSec || !newSecHeading.trim()} style={{ padding: '7px 18px' }}><Plus size={12} /> {addingSec ? 'Adding...' : 'Add Section'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ImageIconFallback({ size = 20 }) {
  return <div style={{ color: 'var(--text-muted)' }}>◈</div>;
}
