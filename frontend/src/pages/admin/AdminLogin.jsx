import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminLogin } from '../../services/adminApi';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const navigate = useNavigate();

  const login = async (e) => {
    e.preventDefault();
    if (!username || !password) { setError('Enter credentials'); return; }
    setLoading(true); setError('');
    try {
      await adminLogin(username, password);
      navigate('/admin');
    } catch {
      setError('Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight:'100vh', background:'#0f1923',
      display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ width:380, background:'#1a2535',
        border:'0.5px solid rgba(255,255,255,0.1)',
        borderRadius:16, padding:32 }}>

        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:28 }}>
          <div style={{ fontSize:32, marginBottom:8 }}>◈</div>
          <div style={{ fontSize:18, fontWeight:600, color:'#fff' }}>PCB AI Admin</div>
          <div style={{ fontSize:12, color:'#6b8099', marginTop:4 }}>
            Sign in to manage models and training
          </div>
        </div>

        <form onSubmit={login}>
          <div style={{ marginBottom:14 }}>
            <div style={{ fontSize:11, color:'#6b8099', marginBottom:5,
              textTransform:'uppercase', letterSpacing:0.5 }}>Username</div>
            <input value={username} onChange={e => setUsername(e.target.value)}
              placeholder="admin" autoFocus
              style={{ width:'100%', padding:'10px 12px', borderRadius:8,
                border:'0.5px solid rgba(255,255,255,0.12)', fontSize:13,
                background:'rgba(255,255,255,0.06)', color:'#fff',
                outline:'none' }}/>
          </div>

          <div style={{ marginBottom:20 }}>
            <div style={{ fontSize:11, color:'#6b8099', marginBottom:5,
              textTransform:'uppercase', letterSpacing:0.5 }}>Password</div>
            <input value={password} onChange={e => setPassword(e.target.value)}
              type="password" placeholder="••••••••"
              style={{ width:'100%', padding:'10px 12px', borderRadius:8,
                border:'0.5px solid rgba(255,255,255,0.12)', fontSize:13,
                background:'rgba(255,255,255,0.06)', color:'#fff',
                outline:'none' }}/>
          </div>

          {error && (
            <div style={{ padding:'8px 12px', background:'rgba(239,68,68,0.15)',
              border:'0.5px solid rgba(239,68,68,0.3)', borderRadius:8,
              color:'#fca5a5', fontSize:12, marginBottom:14 }}>
              ⚠ {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'11px', borderRadius:8,
              border:'none', background: loading ? '#334155':'#1e3a5f',
              color: loading ? '#64748b':'#7dd3fc',
              fontSize:13, fontWeight:500,
              cursor: loading ? 'not-allowed':'pointer' }}>
            {loading ? '⟳ Signing in...' : 'Sign In →'}
          </button>
        </form>

        <div style={{ marginTop:20, textAlign:'center',
          fontSize:11, color:'#4a6278' }}>
          Default: admin / admin123
        </div>
      </div>
    </div>
  );
}