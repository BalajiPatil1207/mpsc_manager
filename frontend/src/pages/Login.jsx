import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'react-hot-toast';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
            style={{ padding: '12px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', outline: 'none' }}
            value={email} onChange={(e) => setEmail(e.target.value)}
          />
          <input 
            type="password" 
            placeholder="Password" 
            className="glass-card" 
            style={{ padding: '12px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', outline: 'none' }}
            value={password} onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" disabled={loading} className="btn btn-primary" style={{ padding: '12px', fontSize: '1rem', marginTop: '8px' }}>
            {loading ? 'Logging in...' : 'Login'}
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
