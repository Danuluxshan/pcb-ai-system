import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ScanLine, Settings, Boxes, Check } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';

const TYPE_ICON = {
  inspection_complete: { Icon: ScanLine, color: '#38bdf8' },
  training_complete:   { Icon: Settings, color: '#22c55e' },
  model_activated:      { Icon: Boxes,   color: '#a855f7' },
};

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff/60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff/3600)}h ago`;
  return `${Math.floor(diff/86400)}d ago`;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  const loadList = () => {
    setLoading(true);
    getNotifications(20)
      .then(d => { setItems(d.notifications || []); setUnread(d.unread_count || 0); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadList();
    const poll = setInterval(loadList, 30000); // poll every 30s
    return () => clearInterval(poll);
  }, []);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const openItem = async (n) => {
    if (!n.is_read) {
      try { await markNotificationRead(n.id); } catch {}
    }
    setOpen(false);
    if (n.link) navigate(n.link);
    loadList();
  };

  const markAll = async (e) => {
    e.stopPropagation();
    try { await markAllNotificationsRead(); loadList(); } catch {}
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen(o => !o)}
        style={{ position: 'relative', color: 'var(--text-muted)', cursor: 'pointer' }}>
        <Bell size={16} />
        {unread > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -5, minWidth: 14, height: 14,
            borderRadius: 7, background: 'var(--danger)', border: '1.5px solid #fff',
            fontSize: 8.5, color: '#fff', display: 'flex', alignItems: 'center',
            justifyContent: 'center', padding: '0 3px', fontWeight: 700,
          }}>{unread > 9 ? '9+' : unread}</span>
        )}
      </div>

      {open && (
        <div className="scale-in card" style={{
          position: 'absolute', top: 28, right: 0, width: 320, maxHeight: 400,
          overflow: 'hidden', display: 'flex', flexDirection: 'column',
          boxShadow: 'var(--shadow-lg)', zIndex: 1000,
        }}>
          <div style={{
            padding: '10px 14px', borderBottom: '0.5px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)' }}>
              Notifications
            </span>
            {unread > 0 && (
              <span onClick={markAll} style={{
                fontSize: 10.5, color: 'var(--accent-strong)', cursor: 'pointer',
                fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3,
              }}>
                <Check size={11} /> Mark all read
              </span>
            )}
          </div>

          <div style={{ overflowY: 'auto', flex: 1 }}>
            {loading && items.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', fontSize: 11.5, color: 'var(--text-muted)' }}>
                Loading...
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: 30, textAlign: 'center' }}>
                <Bell size={22} color="var(--text-muted)" style={{ marginBottom: 8 }} />
                <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>No notifications yet</div>
              </div>
            ) : (
              items.map(n => {
                const meta = TYPE_ICON[n.type] || { Icon: Bell, color: '#94a3b8' };
                return (
                  <div key={n.id} onClick={() => openItem(n)}
                    style={{
                      display: 'flex', gap: 10, padding: '10px 14px', cursor: 'pointer',
                      background: n.is_read ? 'transparent' : 'var(--info-bg)',
                      borderBottom: '0.5px solid var(--border)',
                      transition: 'background 150ms ease',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--page-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = n.is_read ? 'transparent' : 'var(--info-bg)'}>
                    <div style={{
                      width: 30, height: 30, borderRadius: 9, flexShrink: 0,
                      background: `${meta.color}18`, color: meta.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}><meta.Icon size={14} /></div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: n.is_read ? 500 : 700, color: 'var(--text-primary)' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.4, marginTop: 2 }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: 9.5, color: 'var(--text-muted)', marginTop: 4 }}>
                        {timeAgo(n.created_at)}
                      </div>
                    </div>
                    {!n.is_read && (
                      <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent-strong)', flexShrink: 0, marginTop: 4 }} />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
