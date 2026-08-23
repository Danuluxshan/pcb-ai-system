import { NavLink, useLocation } from 'react-router-dom';
import { Gem, LayoutDashboard, Upload, ScanLine, Stethoscope, History, BookOpen } from 'lucide-react';
import NotificationBell from './NotificationBell';
import ChatWidget from './ChatWidget';

const NAV = [
  { to: '/',          icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/inspect',   icon: Upload,          label: 'New Inspection' },
  { to: '/results',   icon: ScanLine,        label: 'Results' },
  { to: '/diagnosis', icon: Stethoscope,     label: 'Diagnosis' },
  { to: '/history',   icon: History,         label: 'History' },
  { to: '/learn',     icon: BookOpen,        label: 'Learn' },
];

export default function Layout({ children }) {
  const loc = useLocation();
  const pageLabel = NAV.find(n => n.to === loc.pathname)?.label || 'PCB AI';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 210, background: 'linear-gradient(180deg, #0d1520 0%, #0a1119 100%)',
        borderRight: '0.5px solid rgba(255,255,255,0.06)',
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        {/* Logo */}
        <div style={{
          padding: '18px 16px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: 'linear-gradient(135deg, #1e3a5f, #16496b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Gem size={16} color="#7dd3fc" />
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 13, letterSpacing: -0.2 }}>PCB AI</div>
            <div style={{ color: '#5c7086', fontSize: 10 }}>Inspection System v1.0</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '14px 10px', flex: 1 }}>
          <div style={{
            fontSize: 9.5, color: '#3f5266', textTransform: 'uppercase',
            letterSpacing: 1, padding: '4px 10px 8px', fontWeight: 700,
          }}>Main</div>

          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 11, marginBottom: 3,
                textDecoration: 'none', fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                background: isActive ? 'linear-gradient(120deg, #1e3a5f, #16496b)' : 'transparent',
                color: isActive ? '#7dd3fc' : '#94a5ba',
                boxShadow: isActive ? '0 4px 14px rgba(30,58,95,0.4)' : 'none',
                transition: 'all 180ms ease',
              })}>
              {({ isActive }) => (
                <>
                  <Icon size={16} strokeWidth={isActive ? 2.3 : 2} />
                  {label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Status */}
        <div style={{ padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: '#5c7086' }}>
            <span style={{
              width: 6, height: 6, borderRadius: '50%', background: '#22c55e',
              boxShadow: '0 0 0 3px rgba(34,197,94,0.15)', flexShrink: 0,
            }} />
            API Connected
          </div>
        </div>
      </aside>

      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          height: 52, borderBottom: '0.5px solid var(--border)',
          display: 'flex', alignItems: 'center', padding: '0 22px',
          background: '#fff', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: -0.2 }}>
            {pageLabel}
          </span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="badge badge-info">17 Classes</span>
            <NotificationBell />
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, overflow: 'auto', padding: 20, background: 'var(--page-bg)' }}>
          {children}
        </main>
      </div>

      <ChatWidget />
    </div>
  );
}
