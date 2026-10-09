import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FiHome, FiCalendar, FiBookOpen, FiActivity, FiTarget, FiAward, FiSettings, FiLoader, FiLogOut, FiMenu } from 'react-icons/fi';
import axios from 'axios';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { toast } from 'react-hot-toast';
import ConfirmModal from './ConfirmModal';
import { FiFilm } from 'react-icons/fi';

const Sidebar = ({ user, isOpen, closeSidebar }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [aiAdvice, setAiAdvice] = useState('');
  const [loadingAdvice, setLoadingAdvice] = useState(true);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  
  useEffect(() => {
    const fetchAiCoachOptions = async () => {
      try {
        const payload = { weakTopics: ['Geography (Physical)', 'Trigonometry'], mockScore: 72 };
        const res = await axios.post('https://mpsc-manager.onrender.com/api/ai/coach', payload);
        if (res.data.success) setAiAdvice(res.data.advice);
      } catch (err) {
        setAiAdvice("Focus on your weak topics like Geography today. You can do this!");
      } finally {
        setLoadingAdvice(false);
      }
    };
    fetchAiCoachOptions();
  }, []);
  
  const handleApplyAdvice = async () => {
    const tId = toast.loading('Applying AI instructions...');
    try {
      const today = new Date().toISOString().split('T')[0];
      await axios.post('https://mpsc-manager.onrender.com/api/tasks', {
        title: 'Revise Weak Topics: Geography & Trigonometry',
        status: 'pending',
        estimatedMinutes: 60,
        date: today,
        startTime: '10:00',
        userId: user?.uid || 'testUser'
      });
      toast.success("AI advice successfully scheduled for today!", { id: tId });
    } catch(err) {
      toast.error('Failed to sync. Server error.', { id: tId });
    }
  };
  
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <FiHome /> },
    { name: 'Study Planner', path: '/planner', icon: <FiCalendar /> },
    { name: 'Study Reels', path: '/reels', icon: <FiFilm /> },
    { name: 'Practice & PYQ', path: '/practice', icon: <FiBookOpen /> },
    { name: 'Mock Tests', path: '/mock', icon: <FiTarget /> },
    { name: 'Analytics', path: '/analytics', icon: <FiActivity /> },
    { name: 'Mistake Book', path: '/mistakes', icon: <FiAward /> },
    { name: 'Custom Test Tool', path: '/test-maker', icon: <FiSettings /> },
  ];

  return (
    <>
      <div className={`sidebar-overlay ${isOpen ? 'open' : ''}`} onClick={closeSidebar}></div>
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="flex-row justify-between align-center" style={{ padding: '0 8px', width: '100%' }}>
          <div className="flex-row gap-4 align-center">
            <div style={{
              background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))',
              padding: '8px',
              borderRadius: '12px',
              color: 'white'
            }}>
              <FiTarget size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Study OS</h2>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pro Environment</span>
            </div>
          </div>
          <button onClick={closeSidebar} className="btn" style={{ background: 'transparent', border: 'none', padding: '8px', color: 'var(--text-secondary)' }} title="Close Sidebar">
             <FiMenu size={24} />
          </button>
        </div>

      <nav className="flex-col gap-2" style={{ marginTop: '24px', flex: 1 }}>
        {navItems.map((item) => (
          <Link
            key={item.name}
            to={item.path}
            onClick={() => closeSidebar && closeSidebar()}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
      </nav>

      <div className="glass-card" style={{ padding: '16px', background: 'var(--accent-glow)', borderColor: 'var(--border-color)' }}>
        <div className="flex-col gap-2">
          <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>🤖 AI Study Coach</span>
          {loadingAdvice ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiLoader className="spin-animation" /> Generating advice...
            </span>
          ) : (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              "{aiAdvice}"
            </span>
          )}
          <button onClick={handleApplyAdvice} className="btn btn-primary" style={{ marginTop: '8px', padding: '8px', fontSize: '0.75rem' }}>Apply to Schedule</button>
        </div>
      </div>
      
      {/* Bottom User Area */}
      <div className="user-profile flex-row align-center gap-4" style={{ marginTop: 'auto', padding: '16px 0', borderTop: '1px solid var(--border-color)', justifyContent: 'space-between' }}>
        <div className="flex-row gap-4 align-center">
          <div className="avatar">
            {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="flex-col">
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{user?.displayName || 'Student'}</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Pro Plan</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowLogoutModal(true)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', outline: 'none' }} title="Logout">
            <FiLogOut size={20} />
          </button>
        </div>
      </div>
      </aside>
      <ConfirmModal 
        isOpen={showLogoutModal}
        title="Ready to leave?"
        message="Are you sure you want to log out of your Study OS session?"
        confirmText="Log Out"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={async () => {
          setShowLogoutModal(false);
          await signOut(auth);
          navigate('/login');
        }}
        onCancel={() => setShowLogoutModal(false)}
      />
    </>
  );
};

export default Sidebar;
