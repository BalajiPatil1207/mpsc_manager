import React, { useState, useEffect } from 'react';
import { FiBookOpen, FiZap, FiPlayCircle, FiCheckCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../firebase';

const Practice = () => {
  const [hasPlan, setHasPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const uid = auth.currentUser?.uid || 'testUser';
        const res = await axios.get(`https://mpsc-manager.onrender.com/api/plans/user/${uid}`);
        if(res.data.success && res.data.hasPlan) {
          setHasPlan(true);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchPlan();
  }, []);

  if (loading) return null;

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      <div className="flex-row justify-between" style={{ alignItems: 'center' }}>
        <h1 className="heading-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>Practice & PYQ</h1>
        {hasPlan && <button onClick={() => navigate('/test-maker')} className="btn btn-primary"><FiPlayCircle className="inline mr-2" /> Daily Challenge</button>}
      </div>
      <p style={{ color: 'var(--text-secondary)' }}>Targeted daily practice based on your active study plan.</p>

      {!hasPlan ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <FiZap size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>No Active Practice Sets</h2>
          <p style={{ color: 'var(--text-muted)' }}>Generate a Study Plan in the planner to unlock personalized PYQs and daily MCQ drills.</p>
          <button onClick={() => navigate('/planner')} className="btn btn-primary" style={{ marginTop: '16px' }}>Go to Study Planner</button>
        </div>
      ) : (
        <div className="dashboard-grid">
          <div className="glass-panel" style={{ padding: '24px' }}>
             <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Today's Assigned PYQs</h2>
             <div className="flex-col gap-4">
                <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--accent-primary)' }}>
                   <div className="flex-row justify-between" style={{ alignItems: 'center' }}>
                     <div>
                       <h3 style={{ fontSize: '1.125rem', color: 'var(--text-primary)' }}>Phase 1 Foundation</h3>
                       <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>15 Questions • MPSC History</p>
                     </div>
                     <button onClick={() => navigate('/test-maker')} className="btn btn-primary" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)' }}>Start</button>
                   </div>
                </div>
                <div className="glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--success)' }}>
                   <div className="flex-row justify-between" style={{ alignItems: 'center' }}>
                     <div>
                       <h3 style={{ fontSize: '1.125rem', color: 'var(--text-primary)' }}>Geography Basics</h3>
                       <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>20 Questions • Completed Today</p>
                     </div>
                     <FiCheckCircle size={24} color="var(--success)" />
                   </div>
                </div>
             </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Topic Wise Mastery</h2>
            <div className="flex-col gap-4">
              {['Polity', 'Economics', 'Science', 'Current Affairs'].map((subject) => (
                 <div key={subject} className="flex-row justify-between" style={{ alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                   <span style={{ color: 'var(--text-primary)' }}>{subject}</span>
                   <button className="btn" onClick={() => navigate('/test-maker')} style={{ padding: '6px 16px', fontSize: '0.75rem', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>Drill</button>
                 </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Practice;
