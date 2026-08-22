import { useState, useEffect } from 'react';
import { LayoutDashboard, Cpu, Image as ImageIcon, Gauge } from 'lucide-react';
import AdminSidebar from '../../components/AdminSidebar';
import { getAdminStats } from '../../services/adminApi';

const CLASSES_17 = [
  "Button","Capacitor","Connector","Diode","Zener_Diode",
  "Fuse","IC","Inductor","Jumper","LED","MOSFET","MOV",
  "Potentiometer","Resistor","Switch","Transformer","Transistor"
];

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAdminStats().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0d1520' }}>
      <AdminSidebar active="/admin" />

      <div style={{ flex: 1, overflow: 'auto', padding: 26, background: 'var(--page-bg)' }} className="fade-in">
        <div style={{
          fontSize: 21, fontWeight: 800, color: 'var(--text-primary)',
          letterSpacing: -0.4, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <LayoutDashboard size={22} color="var(--accent-strong)" /> Admin Dashboard
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', marginBottom: 22 }}>
          Model performance and dataset overview
        </div>

        {loading ? (
          <div className="skeleton" style={{ height: 300, borderRadius: 18 }} />
        ) : stats && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
              {[
                { label: 'Total Inspections', value: stats.total_inspections, Icon: Gauge, color: '#38bdf8' },
                { label: 'Total Components',  value: stats.total_components,  Icon: Cpu,   color: '#a855f7' },
                { label: 'Dataset Images',    value: stats.dataset_images,    Icon: ImageIcon, color: '#f59e0b' },
                { label: 'Active Model mAP',  value: stats.active_model ? `${(stats.active_model.map50*100).toFixed(1)}%` : '—', Icon: Gauge, color: '#22c55e' },
              ].map(({ label, value, Icon, color }, i) => (
                <div key={label} className={`card card-hover fade-in-up stagger-${i+1}`} style={{ padding: '18px 20px', borderTop: `3px solid ${color}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 10 }}>{label}</div>
                      <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>{value}</div>
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: 11, background: `${color}18`, color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={17} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {stats.active_model && (
              <div className="card fade-in-up stagger-2" style={{ padding: 20, marginBottom: 16 }}>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 }}>
                  Active Model
                </div>
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  {[
                    ['Version', stats.active_model.version],
                    ['mAP@50', `${(stats.active_model.map50*100||0).toFixed(1)}%`],
                    ['Created', new Date(stats.active_model.created_at).toLocaleDateString()],
                    ['Path', stats.active_model.model_path?.split('\\').pop()],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4, fontWeight: 600 }}>{k}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { title: 'Detection Count per Class', data: stats.class_distribution, delay: 3 },
                { title: 'Training Images per Class', data: stats.dataset_by_class, delay: 4 },
              ].map(({ title, data, delay }) => (
                <div key={title} className={`card fade-in-up stagger-${delay}`} style={{ padding: 18 }}>
                  <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 }}>
                    {title}
                  </div>
                  {CLASSES_17.map(cls => {
                    const count = data?.[cls] || 0;
                    const max = Math.max(...Object.values(data || {}), 1);
                    const pct = Math.round((count / max) * 100);
                    const color = title.includes('Training') ? (count === 0 ? '#ef4444' : count < 10 ? '#f59e0b' : '#22c55e') : 'var(--accent-bg)';
                    return (
                      <div key={cls} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                        <div style={{ width: 92, fontSize: 11, color: 'var(--text-secondary)', flexShrink: 0 }}>{cls}</div>
                        <div style={{ flex: 1, height: 6, background: 'var(--page-bg)', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', background: color, borderRadius: 999, width: `${pct}%`, transition: 'width 400ms ease' }} />
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', width: 36, textAlign: 'right', fontWeight: 600 }}>{count}</div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
