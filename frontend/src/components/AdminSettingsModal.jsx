import { useState } from 'react';
import { Settings, Lock, User, X, Loader2, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { changeCredentials } from '../services/adminApi';

export default function AdminSettingsModal({ onClose }) {
  const [currentPw, setCurrentPw] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (!currentPw) { setError('Enter your current password to confirm changes'); return; }
    if (!newUsername.trim() && !newPw) { setError('Change at least the username or password'); return; }
    if (newPw && newPw.length < 6) { setError('New password must be at least 6 characters'); return; }
    if (newPw && newPw !== confirmPw) { setError('New passwords do not match'); return; }

    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await changeCredentials(currentPw, newUsername.trim() || undefined, newPw || undefined);
      setSuccess(`Updated successfully. Username: ${res.username}`);
      setCurrentPw(''); setNewUsername(''); setNewPw(''); setConfirmPw('');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Update failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(13,21,32,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000,
    }}>
      <div onClick={e => e.stopPropagation()} className="scale-in" style={{
        background: '#fff', borderRadius: 18, padding: 26, maxWidth: 380, width: '90%',
        boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, background: 'var(--info-bg)',
              color: 'var(--info-text)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}><Settings size={18} /></div>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--text-primary)' }}>Account Settings</div>
          </div>
          <div onClick={onClose} style={{ cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
            <X size={18} />
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', marginBottom: 18 }}>
          Change your admin username and/or password
        </div>

        {error && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '9px 12px',
            background: 'var(--danger-bg)', borderRadius: 9, marginBottom: 14, fontSize: 11.5, color: 'var(--danger-text)' }}>
            <ShieldAlert size={13} /> {error}
          </div>
        )}
        {success && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '9px 12px',
            background: 'var(--success-bg)', borderRadius: 9, marginBottom: 14, fontSize: 11.5, color: 'var(--success-text)' }}>
            <CheckCircle2 size={13} /> {success}
          </div>
        )}

        <form onSubmit={submit}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600 }}>
              New Username <span style={{ fontWeight: 400 }}>(optional)</span>
            </div>
            <div style={{ position: 'relative' }}>
              <User size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                placeholder="Leave blank to keep current" className="input-modern"
                style={{ width: '100%', paddingLeft: 32 }} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600 }}>
              New Password <span style={{ fontWeight: 400 }}>(optional)</span>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={newPw} onChange={e => setNewPw(e.target.value)} type="password"
                placeholder="At least 6 characters" className="input-modern"
                style={{ width: '100%', paddingLeft: 32 }} />
            </div>
          </div>

          {newPw && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', marginBottom: 5, fontWeight: 600 }}>
                Confirm New Password
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
                <input value={confirmPw} onChange={e => setConfirmPw(e.target.value)} type="password"
                  placeholder="Re-enter new password" className="input-modern"
                  style={{ width: '100%', paddingLeft: 32 }} />
              </div>
            </div>
          )}

          <div style={{
            height: 1, background: 'var(--border)', margin: '16px 0',
          }} />

          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 10.5, color: 'var(--danger-text)', marginBottom: 5, fontWeight: 700 }}>
              Current Password <span style={{ fontWeight: 400 }}>(required to confirm)</span>
            </div>
            <div style={{ position: 'relative' }}>
              <Lock size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={currentPw} onChange={e => setCurrentPw(e.target.value)} type="password"
                placeholder="Your current password" className="input-modern"
                style={{ width: '100%', paddingLeft: 32, borderColor: 'var(--danger-border)' }} />
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: 11 }}>
            {loading ? <><Loader2 size={14} /> Saving...</> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
