import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Gem, LayoutDashboard, Database, Settings, Boxes, BookOpen, Film,
  ArrowLeftCircle, LogOut,
} from 'lucide-react';
import { getAdminUser, adminLogout } from '../services/adminApi';

import { Settings as SettingsIcon } from 'lucide-react';
import AdminSettingsModal from './AdminSettingsModal';

const NAV_ITEMS = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/dataset', icon: Database, label: 'Dataset' },
  { to: '/admin/train', icon: Settings, label: 'Training' },
  { to: '/admin/models', icon: Boxes, label: 'Models' },
  { to: '/admin/learn', icon: BookOpen, label: 'Learn Content' },
  { to: '/admin/media', icon: Film, label: 'Learning Media' },
];

export default function AdminSidebar({ active }) {
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <div style={{
      width: 210, background: 'linear-gradient(180deg, #0d1520 0%, #0a1119 100%)',
      borderRight: '0.5px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      position: 'relative',
    }}>
      {/* Logo */}
      <div style={{
        padding: '18px 16px 14px', borderBottom: '0.5px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'linear-gradient(135deg, #1e3a5f, #16496b)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Gem size={16} color="#7dd3fc" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>PCB AI Admin</div>
          <div style={{ color: '#5c7086', fontSize: 10 }}>{getAdminUser()}</div>
        </div>
        <div onClick={() => setSettingsOpen(true)} style={{ color: '#5c7086', cursor: 'pointer', padding: 4 }}>
          <SettingsIcon size={15} />
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '14px 10px', flex: 1 }}>
        <div style={{
          fontSize: 9.5, color: '#3f5266', textTransform: 'uppercase',
          letterSpacing: 1, padding: '4px 10px 8px', fontWeight: 700,
        }}>Administration</div>

        {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
          const isActive = active === to;
          return (
            <div key={to} onClick={() => navigate(to)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 11, marginBottom: 3,
                cursor: 'pointer', fontSize: 12.5, fontWeight: isActive ? 700 : 500,
                background: isActive ? 'linear-gradient(120deg, #1e3a5f, #16496b)' : 'transparent',
                color: isActive ? '#7dd3fc' : '#94a5ba',
                boxShadow: isActive ? '0 4px 14px rgba(30,58,95,0.4)' : 'none',
                transition: 'all 180ms ease',
              }}
              onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#d3dbe6'; } }}
              onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a5ba'; } }}>
              <Icon size={16} strokeWidth={isActive ? 2.3 : 2} />
              {label}
            </div>
          );
        })}

        <div style={{ height: 1, background: 'rgba(255,255,255,0.07)', margin: '12px 4px' }} />

        <div onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
            borderRadius: 11, cursor: 'pointer', fontSize: 12.5, color: '#94a5ba',
            transition: 'all 180ms ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#d3dbe6'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a5ba'; }}>
          <ArrowLeftCircle size={16} />
          Back to App
        </div>
      </nav>

      {/* Sign out trigger */}
      <div style={{ padding: '12px 16px', borderTop: '0.5px solid rgba(255,255,255,0.07)' }}>
        <div onClick={() => setConfirmOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5,
            color: '#ef4444', cursor: 'pointer', fontWeight: 600,
            padding: '6px 8px', borderRadius: 8, transition: 'background 150ms ease',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(239,68,68,0.1)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
          <LogOut size={13} /> Sign out
        </div>
      </div>

      {/* Confirmation modal */}
      {confirmOpen && (
        <div onClick={() => setConfirmOpen(false)} style={{
          position: 'fixed', inset: 0, background: 'rgba(13,21,32,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
          animation: 'fadeIn 150ms ease',
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: '#fff', borderRadius: 18, padding: 26, maxWidth: 340, width: '90%',
            textAlign: 'center', boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            animation: 'scaleIn 180ms cubic-bezier(0.4,0,0.2,1) both',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16, background: '#fef2f2',
              color: '#b91c1c', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <LogOut size={22} />
            </div>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Sign out of Admin Panel?
            </div>
            <div style={{ fontSize: 12.5, color: '#64748b', lineHeight: 1.6, marginBottom: 22 }}>
              You'll need to log in again to access dataset, training, and model management.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setConfirmOpen(false)} style={{
                flex: 1, padding: 11, borderRadius: 10, border: '1px solid #e2e8f0',
                background: '#fff', color: '#475569', fontSize: 12.5, fontWeight: 600,
                cursor: 'pointer',
              }}>
                Cancel
              </button>
              <button onClick={adminLogout} style={{
                flex: 1, padding: 11, borderRadius: 10, border: 'none',
                background: '#b91c1c', color: '#fff', fontSize: 12.5, fontWeight: 700,
                cursor: 'pointer',
              }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
      {settingsOpen && <AdminSettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
