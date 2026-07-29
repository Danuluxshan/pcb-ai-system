import { NavLink, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/',          icon: '⊞',  label: 'Dashboard' },
  { to: '/inspect',   icon: '↑',  label: 'New Inspection' },
  { to: '/results',   icon: '⊡',  label: 'Results' },
  { to: '/diagnosis', icon: '⚕',  label: 'Diagnosis' },
  { to: '/history',   icon: '⏱',  label: 'History' },
];

export default function Layout({ children }) {
  const loc = useLocation();
  const pageLabel = NAV.find(n => n.to === loc.pathname)?.label || 'PCB AI';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 200, background: 'var(--sidebar-bg)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{ padding: '16px 14px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.1)' }}>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 13, letterSpacing: 0.3 }}>
            ◈ PCB AI
          </div>
          <div style={{ color: '#6b8099', fontSize: 10, marginTop: 2 }}>
            Inspection System v1.0
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          <div style={{ fontSize: 9, color: '#4a6278', textTransform: 'uppercase',
                        letterSpacing: 1, padding: '8px 8px 4px' }}>Main</div>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 10px', borderRadius: 6, marginBottom: 2,
                textDecoration: 'none', fontSize: 12,
                background: isActive ? 'var(--sidebar-active)' : 'transparent',
                color:      isActive ? 'var(--accent)' : '#8aa4ba',
              })}>
              <span style={{ fontSize: 14 }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Status */}
        <div style={{ padding: '10px 14px', borderTop: '0.5px solid rgba(255,255,255,0.08)',
                      display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%',
                         background: '#22c55e', display: 'inline-block' }} />
          <span style={{ fontSize: 11, color: '#6b8099' }}>API Connected</span>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          height: 48, borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 20px',
          background: '#fff', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, fontWeight: 500 }}>{pageLabel}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4,
                           background: '#e6f1fb', color: '#185fa5' }}>17 Classes</span>
            <span style={{ fontSize: 16, color: 'var(--text-muted)', cursor: 'pointer' }}>🔔</span>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 20 }}>
          {children}
        </main>
      </div>
    </div>
  );
}