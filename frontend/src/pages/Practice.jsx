import React, { useState, useEffect } from 'react';
import { FiBookOpen, FiZap, FiPlayCircle, FiCheckCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../firebase';
import { toast } from 'react-hot-toast';

const Practice = () => {
  const initialPyqs = [
    { id: 'his_foundation', title: 'Phase 1 Foundation', meta: '15 Questions • MPSC History', completed: false },
    { id: 'geo_basics', title: 'Geography Basics', meta: '20 Questions • Maharashtra Geo', completed: false },
    { id: 'polity_drill', title: 'Panchayat Raj Drill', meta: '30 Questions • Polity', completed: false }
  ];

  const [hasPlan, setHasPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pyqs, setPyqs] = useState(() => {
    const saved = localStorage.getItem('practice_pyqs');
    return saved ? JSON.parse(saved) : initialPyqs;
  });
  const navigate = useNavigate();

  const togglePyq = (id) => {
    const updated = pyqs.map(p => {
      if (p.id === id) return { ...p, completed: !p.completed };
      return p;
    });
    setPyqs(updated);
    localStorage.setItem('practice_pyqs', JSON.stringify(updated));
  };

  const startTest = async (title, subject) => {
    const tId = toast.loading(`Generating test for ${title}...`);
    try {
      const uid = auth.currentUser?.uid || 'testUser';
      const res = await axios.post('https://mpsc-manager.onrender.com/api/tests', {
        title: title,
        subject: subject || "General Studies",
        topics: "Revision and Practice Sets",
        difficulty: "medium",
        userId: uid
      });
      toast.success('Test Ready!', { id: tId });
      navigate(`/take-test/${res.data.test.id}`);
    } catch (e) {
      toast.error('Failed to generate test. Try again.', { id: tId });
    }
  };

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
               {pyqs.map(p => (
                 <div key={p.id} className="glass-card" style={{ padding: '16px', borderLeft: `4px solid ${p.completed ? 'var(--success)' : 'var(--accent-primary)'}`, transition: 'all 0.3s ease' }}>
                    <div className="flex-row justify-between" style={{ alignItems: 'center' }}>
                      <div className="flex-col gap-1">
                        <h3 style={{ fontSize: '1.125rem', color: p.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: p.completed ? 'line-through' : 'none' }}>{p.title}</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{p.completed ? 'Completed Today' : p.meta}</p>
                      </div>
                      {p.completed ? (
                        <button className="btn" onClick={() => togglePyq(p.id)} title="Undo" style={{ padding: '8px' }}>
                          <FiCheckCircle size={24} color="var(--success)" />
                        </button>
                      ) : (
                        <div className="flex-row gap-2">
                          <button onClick={() => startTest(p.title, p.title.includes('History') ? 'History' : 'Geography')} className="btn btn-primary" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', padding: '6px 12px' }}>Start</button>
                          <button onClick={() => togglePyq(p.id)} className="btn" style={{ padding: '6px 12px', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>Done</button>
                        </div>
                      )}
                    </div>
                 </div>
               ))}
             </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Topic Wise Mastery</h2>
            <div className="flex-col gap-4">
              {['Polity', 'Economics', 'Science', 'Current Affairs'].map((subject) => (
                 <div key={subject} className="flex-row justify-between" style={{ alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                   <span style={{ color: 'var(--text-primary)' }}>{subject}</span>
                   <button className="btn" onClick={() => startTest(`${subject} Drill`, subject)} style={{ padding: '6px 16px', fontSize: '0.75rem', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>Drill</button>
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
