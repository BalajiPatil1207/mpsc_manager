import React, { useState, useEffect } from 'react';
import { FiBookOpen, FiZap, FiPlayCircle, FiCheckCircle, FiShare2, FiEdit, FiTrash2 } from 'react-icons/fi';
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
  const [history, setHistory] = useState([]);
  const [filterSubject, setFilterSubject] = useState('');
  const [editingTest, setEditingTest] = useState(null);
  const [deletingTest, setDeletingTest] = useState(null);
  
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
    // Navigate to Custom Maker since AI API generation requires detailed input
    toast.success("Ready to create your targeted Drill!");
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
          const practiceTests = res.data.data.filter(t => !(t.subject || '').includes('Mega') && !(t.title || '').includes('Mock'));
          setHistory(practiceTests);
        }
      } catch (e) {
        console.error(e);
      }
    };
    
    fetchPlan();
    fetchHistory();
  }, []);

  const currentUser = auth.currentUser?.uid || 'anonymous';
  const filteredHistory = history.filter(h => {
    return filterSubject ? (h.subject || '').toLowerCase().includes(filterSubject.toLowerCase()) : true;
  }).sort((a, b) => {
    const aSolved = a.attemptedBy?.includes(currentUser) ? 1 : 0;
    const bSolved = b.attemptedBy?.includes(currentUser) ? 1 : 0;
    return aSolved - bSolved;
  });

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
          <div className="glass-panel" style={{ padding: '24px', maxWidth: '100%', overflowX: 'hidden' }}>
             <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Today's Assigned PYQs</h2>
             <div className="flex-row gap-4 horizontal-scroll" style={{ overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: '8px', scrollPadding: '0', width: '100%' }}>
               {pyqs.map(p => (
                 <div key={p.id} className="glass-card" style={{ minWidth: '280px', flex: '0 0 auto', scrollSnapAlign: 'start', padding: '16px', borderLeft: `4px solid ${p.completed ? 'var(--success)' : 'var(--accent-primary)'}`, transition: 'all 0.3s ease' }}>
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
                        <div className="flex-col gap-2">
                          <button onClick={() => startTest(p.title, p.title.includes('History') ? 'History' : 'Geography')} className="btn btn-primary" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)', border: '1px solid var(--accent-primary)', padding: '6px 12px', fontSize: '0.75rem' }}>Start</button>
                          <button onClick={() => togglePyq(p.id)} className="btn" style={{ padding: '6px 12px', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', fontSize: '0.75rem' }}>Done</button>
                        </div>
                      )}
                    </div>
                 </div>
               ))}
             </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>Topic Wise Mastery</h2>
            <div className="flex-col gap-0" style={{ maxHeight: '180px', overflowY: 'auto', paddingRight: '8px' }}>
              {['Polity', 'Economics', 'Science', 'Current Affairs', 'History', 'Geography'].map((subject) => {
                 const xp = parseFloat(localStorage.getItem(`xp_${subject}`)) || 0;
                 return (
                 <div key={subject} className="flex-row justify-between" style={{ alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-color)' }}>
                   <div style={{ display: 'flex', flexDirection: 'column' }}>
                     <span style={{ color: 'var(--text-primary)' }}>{subject}</span>
                     <span style={{ color: 'var(--accent-secondary)', fontSize: '0.75rem', fontWeight: 'bold' }}>{xp} XP Earned</span>
                   </div>
                   <button className="btn" onClick={() => startTest(`${subject} Drill`, subject)} style={{ padding: '6px 16px', fontSize: '0.75rem', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>Drill</button>
                 </div>
                 );
              })}
            </div>
          </div>
          
          <div className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1' }}>
             <div className="flex-row justify-between align-center" style={{ marginBottom: '16px' }}>
               <h2 style={{ fontSize: '1.25rem', margin: 0 }}>🔍 Auto-Generated Daily Tests</h2>
               <select className="glass-card" value={filterSubject} onChange={(e)=>setFilterSubject(e.target.value)} style={{ padding: '6px 12px', fontSize: '0.875rem', outline: 'none', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', cursor: 'pointer' }}>
                 <option value="">All Subjects</option>
                 <option value="Current Affairs">Current Affairs</option>
                 <option value="Economics">Economics</option>
                 <option value="Geography">Geography</option>
                 <option value="History">History</option>
                 <option value="Polity">Polity</option>
                 <option value="Science">Science (विज्ञान)</option>
                 <option value="GK">GK / GS</option>
                 <option value="Math">Maths (गणित)</option>
                 <option value="Reasoning">Reasoning (बुद्धिमत्ता)</option>
                 <option value="Marathi">Marathi</option>
                 <option value="Mixed">Mixed</option>
               </select>
             </div>
             
             <div className="flex-col gap-4">
               {filteredHistory.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No auto-generated tests found.</p> : null}
               {filteredHistory.map(test => {
                 const isSolved = test.attemptedBy?.includes(currentUser);
                 return (
                 <div key={test.id} className="glass-card" style={{ padding: '16px', borderLeft: isSolved ? '4px solid var(--success)' : '4px solid var(--accent-primary)', background: isSolved ? 'rgba(34, 197, 94, 0.05)' : 'var(--glass-bg)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                   <div className="flex-col gap-2">
                     <div className="flex-row gap-2 align-center">
                       <h3 style={{ fontSize: '1.125rem', margin: 0, textDecoration: isSolved ? 'line-through' : 'none', color: isSolved ? 'var(--text-muted)' : 'var(--text-primary)' }}>{test.title}</h3>
                       <span className="badge pending" style={{ background: isSolved ? 'rgba(34, 197, 94, 0.2)' : 'var(--accent-glow)', color: isSolved ? 'var(--success)' : 'var(--accent-primary)' }}>{test.timeLimit} Mins</span>
                     </div>
                     <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                       {test.subject} • {test.questions?.length || 0} Qs • {new Date(test.createdAt).toLocaleDateString()} {isSolved && <span style={{color:'var(--success)', fontWeight:'bold'}}> • Solved ✅</span>}
                     </p>
                   </div>
                   <div className="flex-row gap-2">
                     <button title="Share Test" className="btn task-action-btn" onClick={() => copyShareLink(test.id)} style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <span className="desktop-text" style={{display:'flex', alignItems:'center', gap:'6px'}}><FiShare2 /> Share</span>
                       <FiShare2 className="mobile-icon" size={16} />
                     </button>
                     <button title="Edit Test" className="btn task-action-btn" onClick={() => setEditingTest(test)} style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--info)', display: 'flex', alignItems: 'center' }}>
                       <span className="desktop-text">Edit</span>
                       <FiEdit className="mobile-icon" size={16} />
                     </button>
                     <button title="Delete Test" className="btn task-action-btn" onClick={() => setDeletingTest(test)} style={{ padding: '6px 12px', fontSize: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                       <span className="desktop-text">Delete</span>
                       <FiTrash2 className="mobile-icon" size={16} />
                     </button>
                     <button title="Take Test" className="btn btn-primary task-action-btn" onClick={() => navigate(`/test/${test.id}`)} style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                       <span className="desktop-text" style={{display:'flex', alignItems:'center', gap:'6px'}}><FiPlayCircle /> Start</span>
                       <FiPlayCircle className="mobile-icon" size={16} />
                     </button>
                   </div>
                 </div>
                 );
               })}
             </div>
          </div>

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

      {/* Delete Confirmation Modal */}
      {deletingTest && (
        <div className="modal-overlay" onClick={() => setDeletingTest(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-primary)', border: '1px solid var(--danger)', textAlign: 'left', minWidth: '300px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--danger)' }}>⚠️ Delete Test?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Are you sure you want to permanently delete "{deletingTest.title}"? This cannot be undone.</p>
            <div className="flex-row gap-4">
              <button type="button" onClick={() => setDeletingTest(null)} className="btn" style={{ flex: 1, background: 'var(--glass-bg)' }}>Cancel</button>
              <button 
                type="button" 
                onClick={async () => {
                   try {
                     const res = await axios.delete(`https://mpsc-manager.onrender.com/api/custom-tests/${deletingTest.id}`);
                     if(res.data.success) {
                       toast.success('Test deleted successfully');
                       setHistory(history.filter(h => h.id !== deletingTest.id));
                       setDeletingTest(null);
                     }
                   } catch(err) {
                     toast.error('Failed to delete test');
                   }
                }} 
                className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, var(--danger), #b91c1c)', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Practice;
