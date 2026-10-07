import React, { useState, useEffect } from 'react';
import { FiTarget, FiBarChart2, FiPlay, FiShare2 } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../firebase';
import { toast } from 'react-hot-toast';

const MockTests = () => {
  const [hasPlan, setHasPlan] = useState(false);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [filterDate, setFilterDate] = useState('');
  const [editingTest, setEditingTest] = useState(null);
  const navigate = useNavigate();

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.put(`https://mpsc-manager.onrender.com/api/custom-tests/${editingTest.id}`, {
        title: editingTest.title,
        subject: editingTest.subject,
        timeLimit: editingTest.timeLimit
      });
      if(res.data.success) {
        toast.success("Test updated successfully!");
        setHistory(history.map(h => h.id === editingTest.id ? editingTest : h));
        setEditingTest(null);
      }
    } catch(err) {
      toast.error("Failed to update test");
    }
  };

  const startMockTest = async () => {
    toast.success("Ready to create your Mock Exam!");
    navigate('/test-maker');
  };

  const copyShareLink = (testId) => {
    const link = `${window.location.origin}/test/${testId}`;
    navigator.clipboard.writeText(link);
    toast.success("Test link copied to clipboard! 📋");
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
                      <div className="flex-row gap-2">
                        <button title="Share Test" className="btn" onClick={() => copyShareLink(test.id)} style={{ padding: '8px 16px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}><FiShare2 /> Share</button>
                        <button title="Edit Test" className="btn" onClick={() => setEditingTest(test)} style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--info)', display: 'flex', alignItems: 'center' }}>Edit</button>
                        <button title="Delete Test" className="btn" onClick={async () => {
                          if(window.confirm('Delete this generated test permanently?')) {
                            try {
                              const res = await axios.delete(`https://mpsc-manager.onrender.com/api/custom-tests/${test.id}`);
                              if(res.data.success) {
                                toast.success('Test deleted successfully');
                                setHistory(history.filter(h => h.id !== test.id));
                              }
                            } catch(err) {
                              toast.error('Failed to delete test');
                            }
                          }
                        }} style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>Delete</button>
                        <button title="Take Test" className="btn btn-primary" onClick={() => navigate(`/test/${test.id}`)} style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '8px' }}><FiPlay /> Start</button>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
           )}

        </div>
      )}

      {/* Edit Test Modal */}
      {editingTest && (
        <div className="modal-overlay" onClick={() => setEditingTest(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', textAlign: 'left', minWidth: '300px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>✏️ Edit Test Details</h2>
            <form onSubmit={handleEditSubmit} className="flex-col gap-4">
              <div className="flex-col gap-1">
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Test Title</label>
                <input type="text" required value={editingTest.title} onChange={e => setEditingTest({...editingTest, title: e.target.value})} className="glass-card" style={{ padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div className="flex-col gap-1">
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Test Subject</label>
                <input type="text" required value={editingTest.subject || ''} onChange={e => setEditingTest({...editingTest, subject: e.target.value})} className="glass-card" style={{ padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div className="flex-col gap-1">
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Time Limit (Minutes)</label>
                <input type="number" required min="1" value={editingTest.timeLimit} onChange={e => setEditingTest({...editingTest, timeLimit: parseInt(e.target.value) || 0})} className="glass-card" style={{ padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
              </div>
              <div className="flex-row gap-4" style={{ marginTop: '12px' }}>
                <button type="button" onClick={() => setEditingTest(null)} className="btn" style={{ flex: 1, background: 'var(--glass-bg)' }}>Cancel</button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default MockTests;
