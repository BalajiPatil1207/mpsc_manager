import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'react-hot-toast';
import { FiEye, FiEyeOff } from 'react-icons/fi';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if(!email || !password) return toast.error("All fields are required!");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("Login successful!");
      navigate('/');
    } catch (err) {
      toast.error("Invalid credentials or user not found.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-dark)' }}>
      <div className="glass-panel flex-col gap-4" style={{ width: '400px', padding: '32px' }}>
        <h2 className="heading-gradient" style={{ fontSize: '2rem', textAlign: 'center' }}>Study OS</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '16px' }}>Welcome back! Login to continue.</p>
        
        <form onSubmit={handleLogin} className="flex-col gap-4">
          <input 
            type="email" 
            placeholder="Email Address" 
            className="glass-card" 
            style={{ padding: '12px', color: 'var(--text-primary)', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', outline: 'none' }}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <div style={{ position: 'relative', width: '100%' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              className="glass-card"
              style={{ width: '100%', padding: '12px 44px 12px 12px', color: 'var(--text-primary)', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', outline: 'none' }}
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              title={showPassword ? 'Hide password' : 'Show password'}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', border: 0, padding: '4px', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            >
              {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
            </button>
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '12px', fontSize: '1rem', marginTop: '8px' }}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
          
          <button 
            type="button" 
            onClick={() => {
              localStorage.setItem('guest_user', 'true');
              window.location.href = '/';
            }} 
            className="btn" 
            style={{ 
              padding: '12px', 
              fontSize: '0.95rem', 
              background: 'rgba(255, 255, 255, 0.06)', 
              color: 'var(--text-primary)',
              border: '1px solid var(--border-color)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px'
            }}
          >
            ⚡ Demo Mode / तात्काळ सुरू करा
          </button>
        </form>
        
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
          Don't have an account? <Link to="/register" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Sign Up</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
