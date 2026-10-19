import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { toast } from 'react-hot-toast';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if(!name || !email || !password) return toast.error("All fields are required!");
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      toast.success("Registration successful! Welcome to Study OS.");
      navigate('/');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', background: 'var(--bg-dark)' }}>
      <div className="glass-panel flex-col gap-4" style={{ width: '400px', padding: '32px' }}>
        <h2 className="heading-gradient" style={{ fontSize: '2rem', textAlign: 'center' }}>Study OS</h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '16px' }}>Create your competitive exam account.</p>
        
        <form onSubmit={handleRegister} className="flex-col gap-4">
          <input 
            type="text" 
            placeholder="Full Name" 
            className="glass-card" 
            style={{ padding: '12px', color: 'white', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--border-color)', outline: 'none' }}
            value={name} onChange={(e) => setName(e.target.value)}
          />
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
            {loading ? 'Creating Account...' : 'Sign Up'}
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
          Already have an account? <Link to="/login" style={{ color: 'var(--accent-primary)', textDecoration: 'none' }}>Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
