import { useState, useEffect } from 'react';
import { CheckCircle2, X } from 'lucide-react';

export default function LoginSuccessToast({ username }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 3500);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 3000,
      display: 'flex', alignItems: 'center', gap: 12,
      background: '#fff', borderRadius: 14, padding: '14px 18px',
      boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
      border: '1px solid var(--success-border)',
      borderLeft: '4px solid var(--success)',
      animation: 'toastIn 350ms cubic-bezier(0.4,0,0.2,1) both',
      maxWidth: 340,
    }}>
      <style>{`
        @keyframes toastIn { from { opacity:0; transform: translateX(20px); } to { opacity:1; transform: translateX(0); } }
      `}</style>
      <div style={{
        width: 34, height: 34, borderRadius: 10, background: 'var(--success-bg)',
        color: 'var(--success-text)', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <CheckCircle2 size={18} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)' }}>
          Login successful
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 1 }}>
          Welcome back{username ? `, ${username}` : ''}!
        </div>
      </div>
      <div onClick={() => setVisible(false)} style={{ cursor: 'pointer', color: 'var(--text-muted)', flexShrink: 0 }}>
        <X size={15} />
      </div>
    </div>
  );
}
