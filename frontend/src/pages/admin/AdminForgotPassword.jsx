import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Gem, Mail, KeyRound, Lock, ArrowLeft, Loader2, ShieldAlert, CheckCircle2,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const requestOTP = async (email) =>
  (await axios.post(`${API_BASE}/api/admin/forgot-password/request`, { email })).data;

const verifyOTP = async (email, otp_code, new_password, new_username) =>
  (await axios.post(`${API_BASE}/api/admin/forgot-password/verify`, {
    email, otp_code, new_password, new_username: new_username || null,
  })).data;

export default function AdminForgotPassword() {
  const [step,     setStep]     = useState(1); // 1 = enter email, 2 = enter OTP + new password
  const [email,    setEmail]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [newUser,  setNewUser]  = useState('');
  const [newPw,    setNewPw]    = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [success,  setSuccess]  = useState('');
  const navigate = useNavigate();

  const sendCode = async (e) => {
    e.preventDefault();
    if (!email) { setError('Enter your registered email'); return; }
    setLoading(true); setError('');
    try {
      await requestOTP(email);
      setStep(2);
      setSuccess('If that email is registered, a code has been sent — check your inbox.');
    } catch (e) {
      setError(e?.response?.data?.detail || 'Failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) { setError('Enter the 6-digit code'); return; }
    if (newPw.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (newPw !== confirmPw) { setError('Passwords do not match'); return; }
    setLoading(true); setError('');
    try {
      await verifyOTP(email, otp, newPw, newUser.trim() || null);
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => navigate('/admin/login'), 1800);
    } catch (e) {
      setError(e?.response?.data?.detail || 'Reset failed — check your code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', position: 'relative', overflow: 'hidden',
      background: 'linear-gradient(135deg, #0a1119 0%, #0d1520 45%, #16496b 100%)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', -apple-system, sans-serif",
    }}>
      <div style={{
        position: 'absolute', top: '-15%', left: '-10%', width: 500, height: 500,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(125,211,252,0.14) 0%, transparent 70%)',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', right: '-10%', width: 450, height: 450,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 70%)',
      }} />

      <style>{`
        @keyframes cardIn { from { opacity:0; transform: translateY(16px) scale(0.98); } to { opacity:1; transform: translateY(0) scale(1); } }
      `}</style>

      <div style={{
        width: 400, position: 'relative', zIndex: 1,
        background: 'rgba(20, 30, 45, 0.65)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 24,
        padding: '38px 36px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        animation: 'cardIn 500ms cubic-bezier(0.4,0,0.2,1) both',
      }}>
        <div onClick={() => navigate('/admin/login')} style={{
          display: 'flex', alignItems: 'center', gap: 6, fontSize: 12,
          color: '#7dd3fc', cursor: 'pointer', marginBottom: 20, fontWeight: 600,
        }}>
          <ArrowLeft size={13} /> Back to Login
        </div>

        <div style={{ textAlign: 'center', marginBottom: 26 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 15, margin: '0 auto 14px',
            background: 'linear-gradient(135deg, #1e3a5f, #16496b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Gem size={24} color="#7dd3fc" />
          </div>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>
            {step === 1 ? 'Forgot Password' : 'Reset Password'}
          </div>
          <div style={{ fontSize: 12, color: '#8aa4ba', marginTop: 5 }}>
            {step === 1 ? "We'll email you a verification code" : `Enter the code sent to ${email}`}
          </div>
        </div>

        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px',
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.25)',
            borderRadius: 10, color: '#fca5a5', fontSize: 12, marginBottom: 16,
          }}><ShieldAlert size={14} style={{ flexShrink: 0 }} /> {error}</div>
        )}
        {success && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8, padding: '10px 13px',
            background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)',
            borderRadius: 10, color: '#86efac', fontSize: 12, marginBottom: 16,
          }}><CheckCircle2 size={14} style={{ flexShrink: 0 }} /> {success}</div>
        )}

        {step === 1 ? (
          <form onSubmit={sendCode}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10.5, color: '#7dd3fc', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Registered Email
              </div>
              <div style={{ position: 'relative' }}>
                <Mail size={15} color="#5c7086" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
                <input value={email} onChange={e => setEmail(e.target.value)} type="email"
                  placeholder="admin@pcbai.local" autoFocus
                  style={{
                    width: '100%', padding: '11px 14px 11px 38px', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)', fontSize: 13.5,
                    background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none',
                  }} />
              </div>
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none',
              background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(120deg, #1e3a5f, #16496b)',
              color: loading ? '#5c7086' : '#7dd3fc', fontSize: 13.5, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? <><Loader2 size={15} /> Sending...</> : 'Send Reset Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={resetPassword}>
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, color: '#7dd3fc', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                6-Digit Code
              </div>
              <div style={{ position: 'relative' }}>
                <KeyRound size={15} color="#5c7086" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
                <input value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                  placeholder="123456" autoFocus
                  style={{
                    width: '100%', padding: '11px 14px 11px 38px', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)', fontSize: 15, letterSpacing: 4,
                    background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none',
                  }} />
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, color: '#7dd3fc', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                New Username <span style={{ color: '#5c7086', fontWeight: 400, textTransform: 'none' }}>(optional)</span>
              </div>
              <input value={newUser} onChange={e => setNewUser(e.target.value)} placeholder="Leave blank to keep current"
                style={{
                  width: '100%', padding: '11px 14px', borderRadius: 12,
                  border: '1px solid rgba(255,255,255,0.12)', fontSize: 13,
                  background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none',
                }} />
            </div>

            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10.5, color: '#7dd3fc', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                New Password
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#5c7086" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
                <input value={newPw} onChange={e => setNewPw(e.target.value)} type="password" placeholder="At least 6 characters"
                  style={{
                    width: '100%', padding: '11px 14px 11px 38px', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)', fontSize: 13.5,
                    background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none',
                  }} />
              </div>
            </div>

            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 10.5, color: '#7dd3fc', marginBottom: 6, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                Confirm Password
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} color="#5c7086" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
                <input value={confirmPw} onChange={e => setConfirmPw(e.target.value)} type="password" placeholder="Re-enter password"
                  style={{
                    width: '100%', padding: '11px 14px 11px 38px', borderRadius: 12,
                    border: '1px solid rgba(255,255,255,0.12)', fontSize: 13.5,
                    background: 'rgba(255,255,255,0.05)', color: '#fff', outline: 'none',
                  }} />
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: 12, border: 'none',
              background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(120deg, #1e3a5f, #16496b)',
              color: loading ? '#5c7086' : '#7dd3fc', fontSize: 13.5, fontWeight: 700,
              cursor: loading ? 'not-allowed' : 'pointer', marginBottom: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            }}>
              {loading ? <><Loader2 size={15} /> Resetting...</> : 'Reset Password'}
            </button>

            <div onClick={() => setStep(1)} style={{
              textAlign: 'center', fontSize: 11.5, color: '#8aa4ba', cursor: 'pointer',
            }}>
              Didn't get a code? Try a different email
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
