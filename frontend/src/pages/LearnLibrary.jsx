import { useState, useMemo, useEffect } from 'react';
import { Search, Layers, Package } from 'lucide-react';
import api, { staticUrl } from '../services/api';

const CATEGORIES = ["All", "Passive Components", "Semiconductors", "Protection & Power", "Electromechanical", "Connectivity"];
const CAT_COLOR = {
    "Passive Components": { bg: 'var(--success-bg)', color: 'var(--success-text)' },
    "Semiconductors": { bg: 'var(--info-bg)', color: 'var(--info-text)' },
    "Protection & Power": { bg: 'var(--danger-bg)', color: 'var(--danger-text)' },
    "Electromechanical": { bg: 'var(--warning-bg)', color: 'var(--warning-text)' },
    "Connectivity": { bg: '#fdf4ff', color: '#86198f' },
};
const ICONS = {
    Resistor: '⏦', Capacitor: '⎓', Inductor: '◌', Potentiometer: '◎', Diode: '▷|', Zener_Diode: '▷|z',
    IC: '▭', LED: '☀', MOSFET: '⏚', Transistor: '⏛', Fuse: '⌇', MOV: '◍', Switch: '⏻', Transformer: '∾',
    Button: '◉', Connector: '⊞', Jumper: '⊢⊣',
};

export default function LearnLibrary() {
    const [components, setComponents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeCat, setActiveCat] = useState('All');
    const [selected, setSelected] = useState(null);
    const [tab, setTab] = useState('types');
    const [imgError, setImgError] = useState(false);
    const [zoomVariant, setZoomVariant] = useState(null);
    const [cacheBust] = useState(Date.now());

    useEffect(() => {
        api.get('/education')
            .then(res => {
                const list = res.data.components || [];
                setComponents(list);
                if (list.length) { setSelected(list[0]); setTab(list[0].variants?.length ? 'types' : 'function'); }
            })
            .catch(() => { }).finally(() => setLoading(false));
    }, []);

    const filtered = useMemo(() => {
        let list = activeCat === 'All' ? components : components.filter(c => c.category === activeCat);
        if (search.trim()) {
            const q = search.trim().toLowerCase();
            list = list.filter(c => c.id.toLowerCase().includes(q) || c.short.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
        }
        return list;
    }, [components, search, activeCat]);

    const selectComponent = (comp) => {
        setSelected(comp); setTab(comp.variants?.length ? 'types' : 'function');
        setImgError(false); setZoomVariant(null);
    };

    if (loading) return <div style={{ padding: 40 }}><div className="skeleton" style={{ height: 300, borderRadius: 18 }} /></div>;

    return (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, height: '100%', minHeight: 0 }}>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden', minHeight: 0 }}>

                <div className="fade-in-up" style={{
                    position: 'relative', overflow: 'hidden', borderRadius: 18, flexShrink: 0,
                    background: 'linear-gradient(120deg, #0d1520 0%, #1e3a5f 60%, #16496b 100%)',
                    padding: '18px 20px', color: '#fff',
                }}>
                    <div style={{ position: 'absolute', top: -40, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'radial-gradient(circle, rgba(125,211,252,0.16) 0%, transparent 70%)' }} />
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(125,211,252,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Package size={19} color="#7dd3fc" />
                        </div>
                        <div>
                            <div style={{ fontSize: 16, fontWeight: 800 }}>Component Library</div>
                            <div style={{ fontSize: 11.5, color: '#b8cfe6' }}>{components.length} components with real photos & physical types</div>
                        </div>
                    </div>
                </div>

                <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Search size={13} color="var(--text-muted)" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search components..."
                        className="input-modern" style={{ width: '100%', paddingLeft: 32 }} />
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0 }}>
                    {CATEGORIES.map(cat => {
                        const active = activeCat === cat, c = CAT_COLOR[cat];
                        return (
                            <div key={cat} onClick={() => setActiveCat(cat)} className="badge" style={{
                                cursor: 'pointer', padding: '6px 13px', fontSize: 11,
                                background: active ? 'var(--accent-bg)' : (c ? c.bg : 'var(--page-bg)'),
                                color: active ? 'var(--accent)' : (c ? c.color : 'var(--text-muted)'),
                                transition: 'all 150ms ease',
                            }}>{cat}</div>
                        );
                    })}
                </div>

                <div style={{
                    flex: 1, overflowY: 'auto', display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px,1fr))',
                    gap: 10, alignContent: 'start', alignItems: 'start',
                    gridAutoRows: 'min-content', paddingBottom: 8, minHeight: 0
                }}>
                    {filtered.map((comp, i) => {
                        const c = CAT_COLOR[comp.category], isSel = selected?.id === comp.id, vc = comp.variants?.length || 0;
                        return (
                            <div key={comp.id} onClick={() => selectComponent(comp)}
                                className={`card card-hover card-interactive fade-in-up stagger-${Math.min(i % 6 + 1, 6)}`}
                                style={{
                                    overflow: 'hidden', display: 'flex', flexDirection: 'column',
                                    border: isSel ? '2px solid var(--accent-strong)' : undefined
                                }}>
                                <div style={{ height: 78, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', overflow: 'hidden' }}>
                                    {comp.image_path
                                        ? <img src={`${staticUrl(comp.image_path)}?v=${cacheBust}`} alt={comp.id} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                        : <span style={{ fontSize: 26, color: c.color }}>{ICONS[comp.id] || '◈'}</span>}
                                    {vc > 0 && <div className="badge" style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(13,21,32,0.75)', color: '#fff', fontSize: 9 }}><Layers size={9} /> {vc}</div>}
                                </div>
                                <div style={{ padding: '9px 10px' }}>
                                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 2 }}>{comp.id.replace('_', ' ')}</div>
                                    <div style={{ fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{comp.short}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* RIGHT — Detail panel */}
            <div className="card fade-in-up stagger-1" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
                {selected && (() => {
                    const c = CAT_COLOR[selected.category], hasImg = selected.image_path && !imgError, variants = selected.variants || [];
                    return (
                        <>
                            <div style={{ height: 150, background: hasImg ? '#0d1520' : c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {hasImg
                                    ? <img src={`${staticUrl(selected.image_path)}?v=${cacheBust}`} alt={selected.id} onError={() => setImgError(true)} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                    : <span style={{ fontSize: 50, color: c.color, opacity: 0.8 }}>{ICONS[selected.id] || '◈'}</span>}
                            </div>

                            <div style={{ padding: '14px 20px 12px', borderBottom: '0.5px solid var(--border)', flexShrink: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                    <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--text-primary)' }}>{selected.id.replace('_', ' ')}</div>
                                    <span className="badge" style={{ background: c.bg, color: c.color }}>{selected.category}</span>
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{selected.short}</div>
                            </div>

                            <div style={{ display: 'flex', borderBottom: '0.5px solid var(--border)', overflowX: 'auto', flexShrink: 0 }}>
                                {[
                                    variants.length ? { key: 'types', label: `Types (${variants.length})` } : null,
                                    { key: 'function', label: 'Function' }, { key: 'how', label: 'How It Works' },
                                    { key: 'uses', label: 'Uses' }, { key: 'id', label: 'Identify' },
                                ].filter(Boolean).map(t => (
                                    <div key={t.key} onClick={() => setTab(t.key)} style={{
                                        flex: 1, textAlign: 'center', padding: '10px 6px', fontSize: 10.5, cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap',
                                        borderBottom: tab === t.key ? '2px solid var(--accent-strong)' : '2px solid transparent',
                                        color: tab === t.key ? 'var(--text-primary)' : 'var(--text-muted)',
                                    }}>{t.label}</div>
                                ))}
                            </div>

                            <div style={{ flex: 1, overflowY: 'auto', padding: 18 }} className="fade-in">
                                {tab === 'types' && (
                                    <div>
                                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 12 }}>Common physical forms on a real board:</div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(125px,1fr))', gap: 10 }}>
                                            {variants.map(v => (
                                                <div key={v.id} onClick={() => setZoomVariant(v)} className="card card-hover card-interactive" style={{ overflow: 'hidden' }}>
                                                   <div style={{ height: 80, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                                                        {v.image_path
                                                            ? <img src={`${staticUrl(v.image_path)}?v=${cacheBust}`} alt={v.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                                            : <span style={{ fontSize: 17, color: c.color, opacity: 0.6 }}>{ICONS[selected.id] || '◈'}</span>}
                                                    </div>
                                                    <div style={{ padding: '7px 8px' }}>
                                                        <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3, marginBottom: 2 }}>{v.name}</div>
                                                        <div style={{ fontSize: 9, color: 'var(--text-muted)', lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.description}</div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {tab === 'function' && <div style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--text-secondary)' }}>{selected.function}</div>}
                                {tab === 'how' && <div style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--text-secondary)' }}>{selected.how_it_works}</div>}
                                {tab === 'uses' && (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                                        {selected.uses.map((u, i) => (
                                            <div key={i} style={{ display: 'flex', gap: 9, padding: '9px 11px', background: c.bg, borderRadius: 10 }}>
                                                <span style={{ color: c.color, fontWeight: 800, fontSize: 12 }}>{i + 1}</span>
                                                <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{u}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {tab === 'id' && <div style={{ fontSize: 13, lineHeight: 1.75, color: 'var(--text-secondary)' }}>{selected.identification}</div>}
                                {tab !== 'types' && (
                                    <div style={{ marginTop: 18, padding: '12px 14px', background: 'var(--warning-bg)', borderRadius: 12, fontSize: 11.5, color: 'var(--warning-text)', lineHeight: 1.6 }}>
                                        💡 <strong>Did you know?</strong> {selected.fun_fact}
                                    </div>
                                )}
                            </div>
                        </>
                    );
                })()}
            </div>

            {zoomVariant && (
                <div onClick={() => setZoomVariant(null)} className="fade-in" style={{ position: 'fixed', inset: 0, background: 'rgba(13,21,32,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                    <div onClick={e => e.stopPropagation()} className="scale-in card" style={{ overflow: 'hidden', maxWidth: 420, width: '100%' }}>
                        <div style={{ height: 200, background: '#0d1520', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            {zoomVariant.image_path
                                ? <img src={`${staticUrl(zoomVariant.image_path)}?v=${cacheBust}`} alt={zoomVariant.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                : <span style={{ fontSize: 56, color: '#4a6278' }}>◈</span>}
                        </div>
                        <div style={{ padding: 18 }}>
                            <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>{zoomVariant.name}</div>
                            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 14 }}>{zoomVariant.description}</div>
                            <button className="btn btn-ghost" onClick={() => setZoomVariant(null)} style={{ width: '100%', padding: 10 }}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
