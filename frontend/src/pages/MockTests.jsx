import React, { useState, useEffect } from 'react';
import { FiTarget, FiBarChart2, FiPlay } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../firebase';
import { toast } from 'react-hot-toast';

const MockTests = () => {
  const [hasPlan, setHasPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const navigate = useNavigate();

  const startMockTest = async () => {
    toast.success("Ready to create your Mock Exam!");
    navigate('/test-maker');
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
    
    const fetchHistory = async () => {
      try {
        const res = await axios.get('https://mpsc-manager.onrender.com/api/custom-tests/all');
        if(res.data.success) {
          const mockTests = res.data.data.filter(t => (t.subject || '').includes('Mega') || (t.title || '').includes('Mock'));
          setHistory(mockTests);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchPlan();
    fetchHistory();
  }, []);

  const filteredHistory = history.filter(h => {
    return filterDate ? h.createdAt.includes(filterDate) : true;
  });

  if (loading) return null;

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      <h1 className="heading-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>Mock Test System</h1>
      <p style={{ color: 'var(--text-secondary)' }}>Full-length comprehensive mock exams.</p>

      {!hasPlan ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', marginTop: '24px' }}>
          <FiTarget size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>No Upcoming Mocks</h2>
          <p style={{ color: 'var(--text-muted)' }}>Generate a Study Plan to schedule your weekly mock tests.</p>
          <button onClick={() => navigate('/planner')} className="btn btn-primary" style={{ marginTop: '16px' }}>Go to Study Planner</button>
        </div>
      ) : (
        <div className="flex-col gap-6" style={{ marginTop: '16px' }}>
          <div className="glass-panel" style={{ padding: '24px' }}>
             <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Phase 1 Revision Mocks</h2>
             
             <div className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--accent-primary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
               <div className="flex-col gap-2">
                 <h3 style={{ fontSize: '1.125rem', color: 'var(--text-primary)', margin: 0 }}>MPSC Pre 2027 • Foundation Mock 1</h3>
                 <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>100 Questions • 120 Mins • Standard</span>
               </div>
               <button onClick={startMockTest} className="btn btn-primary" style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}><FiPlay /> Start</button>
             </div>
          </div>

           {filteredHistory.length > 0 && (
             <div className="glass-panel" style={{ padding: '24px', marginTop: '24px' }}>
                <div className="flex-row justify-between align-center" style={{ marginBottom: '16px' }}>
                  <h2 style={{ fontSize: '1.25rem', margin: 0 }}>🏆 Auto-Generated Mocks</h2>
                  <input type="date" className="glass-card" style={{ padding: '6px 12px', color: 'var(--text-primary)', background: 'rgba(255,255,255,0.05)', fontSize: '0.875rem', colorScheme: 'dark' }} 
                         value={filterDate} onChange={(e)=>setFilterDate(e.target.value)} />
                </div>
                
                <div className="flex-col gap-4">
                  {filteredHistory.map(test => (
                    <div key={test.id} className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--success)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div className="flex-col gap-2">
                        <div className="flex-row gap-2 align-center">
                           <h3 style={{ fontSize: '1.125rem', color: 'var(--text-primary)', margin: 0 }}>{test.title}</h3>
                           <span className="badge" style={{ background: 'rgba(34, 197, 94, 0.2)', color: 'var(--success)' }}>{test.timeLimit} Mins</span>
                        </div>
                        <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                          {test.questions?.length || 0} Questions • Mega Test Engine
                        </span>
                      </div>
                      <button title="Take Test" className="btn btn-primary" onClick={() => navigate(`/test/${test.id}`)} style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}><FiPlay /> Start</button>
                    </div>
                  ))}
                </div>
             </div>
           )}

        </div>
      )}
    </div>
  );
};

export default MockTests;
