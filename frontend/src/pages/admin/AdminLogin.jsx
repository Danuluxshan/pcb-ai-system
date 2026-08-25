import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Gem, User, Lock, Eye, EyeOff, LogIn, Loader2, AlertCircle } from 'lucide-react';
import { adminLogin } from '../../services/adminApi';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [loading,  setLoading]  = useState(false);

  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');

  const navigate = useNavigate();

  const clearErrors = () => { setUsernameError(''); setPasswordError(''); };

  const login = async (e) => {
    e.preventDefault();
    clearErrors();

    let hasError = false;
    if (!username.trim()) { setUsernameError('Username is required'); hasError = true; }
    if (!password) { setPasswordError('Password is required'); hasError = true; }
    if (hasError) return;

    setLoading(true);
    try {
      await adminLogin(username, password);
      // Navigate with a flag so the Dashboard shows a one-time success popup
      navigate('/admin', { state: { justLoggedIn: true, loggedInUser: username } });
    } catch {
      setUsernameError(' ');   // marks the border red without duplicate text
      setPasswordError('Incorrect username or password');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = (hasError) => ({
    width: '100%', padding: '11px 14px 11px 38px', borderRadius: 12,
    border: `1px solid ${hasError ? '#ef4444' : 'rgba(255,255,255,0.12)'}`,
    fontSize: 13.5, background: hasError ? 'rgba(239,68,68,0.07)' : 'rgba(255,255,255,0.05)',
    color: '#fff', outline: 'none', transition: 'border-color 200ms ease, background 200ms ease',
  });

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
        animation: 'float1 8s ease-in-out infinite',
      }} />
      <div style={{
        position: 'absolute', bottom: '-15%', right: '-10%', width: 450, height: 450,
        borderRadius: '50%', background: 'radial-gradient(circle, rgba(34,197,94,0.10) 0%, transparent 70%)',
        animation: 'float2 10s ease-in-out infinite',
      }} />

      <style>{`
        @keyframes float1 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(30px,-20px); } }
        @keyframes float2 { 0%,100% { transform: translate(0,0); } 50% { transform: translate(-25px,25px); } }
        @keyframes cardIn { from { opacity:0; transform: translateY(16px) scale(0.98); } to { opacity:1; transform: translateY(0) scale(1); } }
        @keyframes shake { 0%,100% { transform: translateX(0); } 20% { transform: translateX(-6px); } 40% { transform: translateX(6px); } 60% { transform: translateX(-4px); } 80% { transform: translateX(4px); } }
        @keyframes pulseDot { 0%,100% { opacity:1; } 50% { opacity:0.4; } }
      `}</style>

      <div style={{
        width: 400, position: 'relative', zIndex: 1,
        background: 'rgba(20, 30, 45, 0.65)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 24, padding: '38px 36px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        animation: (usernameError || passwordError) && !loading
          ? 'cardIn 500ms cubic-bezier(0.4,0,0.2,1) both, shake 400ms ease 500ms'
          : 'cardIn 500ms cubic-bezier(0.4,0,0.2,1) both',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 30 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: '0 auto 16px',
            background: 'linear-gradient(135deg, #1e3a5f, #16496b)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(30,58,95,0.5)',
          }}>
            <Gem size={26} color="#7dd3fc" />
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: -0.4 }}>
            PCB AI Admin
          </div>
          <div style={{ fontSize: 12.5, color: '#8aa4ba', marginTop: 5 }}>
            Sign in to manage models and training
          </div>
        </div>

        <form onSubmit={login} noValidate>
          {/* Username */}
          <div style={{ marginBottom: usernameError ? 6 : 16 }}>
            <div style={{
              fontSize: 10.5, color: usernameError ? '#fca5a5' : '#7dd3fc', marginBottom: 6, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 0.6,
            }}>Username</div>
            <div style={{ position: 'relative' }}>
              <User size={15} color={usernameError ? '#ef4444' : '#5c7086'} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={username}
                onChange={e => { setUsername(e.target.value); if (usernameError) setUsernameError(''); }}
                placeholder="admin" autoFocus
                style={inputStyle(!!usernameError)}
                onFocus={e => { if (!usernameError) { e.target.style.borderColor = '#7dd3fc'; e.target.style.background = 'rgba(255,255,255,0.08)'; } }}
                onBlur={e => { if (!usernameError) { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.05)'; } }} />
            </div>
            {usernameError && usernameError.trim() && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, color: '#fca5a5', fontSize: 11 }}>
                <AlertCircle size={12} /> {usernameError}
              </div>
            )}
          </div>

          {/* Password */}
          <div style={{ marginBottom: passwordError ? 6 : 22, marginTop: usernameError ? 14 : 0 }}>
            <div style={{
              fontSize: 10.5, color: passwordError ? '#fca5a5' : '#7dd3fc', marginBottom: 6, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 0.6,
            }}>Password</div>
            <div style={{ position: 'relative' }}>
              <Lock size={15} color={passwordError ? '#ef4444' : '#5c7086'} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={password}
                onChange={e => { setPassword(e.target.value); if (passwordError) setPasswordError(''); }}
                type={showPw ? 'text' : 'password'} placeholder="••••••••"
                style={{ ...inputStyle(!!passwordError), paddingRight: 40 }}
                onFocus={e => { if (!passwordError) { e.target.style.borderColor = '#7dd3fc'; e.target.style.background = 'rgba(255,255,255,0.08)'; } }}
                onBlur={e => { if (!passwordError) { e.target.style.borderColor = 'rgba(255,255,255,0.12)'; e.target.style.background = 'rgba(255,255,255,0.05)'; } }} />
              <div onClick={() => setShowPw(v => !v)} style={{
                position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                color: '#5c7086', cursor: 'pointer', display: 'flex',
              }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </div>
            </div>
            {passwordError && passwordError.trim() && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 6, color: '#fca5a5', fontSize: 11 }}>
                <AlertCircle size={12} /> {passwordError}
              </div>
            )}
          </div>

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '13px', borderRadius: 12, border: 'none',
            background: loading ? 'rgba(255,255,255,0.1)' : 'linear-gradient(120deg, #1e3a5f, #16496b)',
            color: loading ? '#5c7086' : '#7dd3fc',
            fontSize: 13.5, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: loading ? 'none' : '0 8px 20px rgba(30,58,95,0.4)',
            transition: 'all 200ms ease', marginTop: 6,
          }}
          onMouseEnter={e => { if (!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}>
            {loading ? <><Loader2 size={15} style={{ animation: 'pulseDot 1s ease infinite' }} /> Signing in...</> : <><LogIn size={15} /> Sign In</>}
          </button>
        </form>

        <div onClick={() => navigate('/admin/forgot-password')} style={{
          textAlign: 'center', fontSize: 11.5, color: '#7dd3fc', cursor: 'pointer', marginTop: 14,
        }}>
          Forgot password?
        </div>

        <div style={{
          marginTop: 18, textAlign: 'center', fontSize: 10.5, color: '#465971',
          paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)',
        }}>
          Default: admin / admin123
        </div>
      </div>
    </div>
  );
}
