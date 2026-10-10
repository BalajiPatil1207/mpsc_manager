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
        timeLimit: editingTest.timeLimit,
        topic: editingTest.topic
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
    if (!filterSubject) return true;
    const subj = (h.subject || '').toLowerCase();
    const filterId = filterSubject.toLowerCase();
    if (filterId === 'history') return subj.includes('history') || subj.includes('gk');
    return subj.includes(filterId);
  }).sort((a, b) => {
    const aSolved = a.attemptedBy?.includes(currentUser) ? 1 : 0;
    const bSolved = b.attemptedBy?.includes(currentUser) ? 1 : 0;
    return aSolved - bSolved;
  });

  if (loading) return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      <div className="flex-row justify-between" style={{ alignItems: 'center' }}>
        <div className="skeleton-box" style={{ height: '40px', width: '250px' }}></div>
      </div>
      <div className="skeleton-box" style={{ height: '20px', width: '60%' }}></div>
      
      <div className="dashboard-grid">
         <div className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1' }}>
            <div className="skeleton-box" style={{ height: '24px', width: '180px', marginBottom: '16px' }}></div>
            <div className="flex-row gap-4" style={{ overflow: 'hidden' }}>
               <div className="skeleton-box" style={{ height: '100px', minWidth: '280px' }}></div>
               <div className="skeleton-box" style={{ height: '100px', minWidth: '280px' }}></div>
               <div className="skeleton-box" style={{ height: '100px', minWidth: '280px' }}></div>
            </div>
         </div>
         <div className="glass-panel flex-col gap-4" style={{ padding: '24px' }}>
             <div className="skeleton-box" style={{ height: '24px', width: '150px' }}></div>
             <div className="skeleton-box" style={{ height: '50px', width: '100%' }}></div>
             <div className="skeleton-box" style={{ height: '50px', width: '100%' }}></div>
             <div className="skeleton-box" style={{ height: '50px', width: '100%' }}></div>
         </div>
      </div>
    </div>
  );

  const SUBJECTS = [
    { id: 'History', label: 'इतिहास', icon: '📖' },
    { id: 'Geography', label: 'भूगोल', icon: '🌍' },
    { id: 'Polity', label: 'राज्यव्यवस्था', icon: '🏛️' },
    { id: 'Economics', label: 'अर्थव्यवस्था', icon: '📈' },
    { id: 'Science', label: 'सामान्य विज्ञान', icon: '🧬' },
    { id: 'Math', label: 'गणित', icon: '🧮' },
    { id: 'Reasoning', label: 'बुद्धिमत्ता', icon: '🧠' },
    { id: 'Marathi', label: 'मराठी', icon: '🔠' },
    { id: 'English', label: 'इंग्रजी', icon: '🅰️' },
    { id: 'Current Affairs', label: 'चालू घडामोडी', icon: '📰' }
  ];

  const activeSubjectData = filterSubject ? SUBJECTS.find(s => s.id === filterSubject) : null;

  if (filterSubject && activeSubjectData) {
    return (
      <div className="flex-col gap-6" style={{ paddingBottom: '40px', animation: 'fadeIn 0.3s' }}>
        <div className="flex-row gap-4 align-center" style={{ marginBottom: '8px' }}>
          <button className="btn" onClick={() => setFilterSubject('')} style={{ background: 'var(--glass-bg)', padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>←</span> Back to All Subjects
          </button>
        </div>
        
        <div className="flex-row justify-between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h1 className="heading-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>
            <span style={{ marginRight: '12px' }}>{activeSubjectData.icon}</span> 
            {activeSubjectData.label} Practice
          </h1>
          <button onClick={() => navigate('/test-maker', { state: { defaultSubject: activeSubjectData.id === 'Math' ? 'Maths' : activeSubjectData.id } })} className="btn" style={{ padding: '8px 16px', fontSize: '0.875rem', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
             + Create Test
          </button>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>All available auto-generated practice tests and PYQs for {activeSubjectData.label}.</p>
        
        <div className="flex-col gap-6" style={{ gridColumn: '1 / -1' }}>
             {(() => {
               const testsForSubject = filteredHistory.filter(h => {
                 const subj = (h.subject || '').toLowerCase();
                 const activeId = activeSubjectData.id.toLowerCase();
                 if (activeId === 'history') return subj.includes('history') || subj.includes('gk');
                 return subj.includes(activeId);
               });
               
               if (testsForSubject.length === 0) {
                 return (
                   <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
                     <p style={{ color: 'var(--text-muted)' }}>No tests available for {activeSubjectData.label}.</p>
                   </div>
                 );
               }

               const groupedTests = testsForSubject.reduce((acc, test) => {
                 const topic = test.topic ? test.topic.trim() : 'General Practice';
                 if(!acc[topic]) acc[topic] = [];
                 acc[topic].push(test);
                 return acc;
               }, {});

               return Object.keys(groupedTests).map(topicName => (
                 <div key={topicName} className="glass-panel" style={{ padding: '24px' }}>
                   <h3 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--text-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' }}>📁 {topicName}</h3>
                   <div className="flex-row gap-4" style={{ overflowX: 'auto', paddingBottom: '16px', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'thin' }}>
                     {groupedTests[topicName].map(test => {
                       const isSolved = test.attemptedBy?.includes(currentUser);
                       return (
                       <div key={test.id} className="glass-card" style={{ padding: '16px', minWidth: '280px', maxWidth: '320px', flex: '0 0 auto', scrollSnapAlign: 'start', borderTop: isSolved ? '4px solid var(--success)' : '4px solid var(--accent-primary)', background: isSolved ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                         <div className="flex-col gap-2">
                           <div className="flex-row gap-2 align-center justify-between">
                             <h3 style={{ fontSize: '1.125rem', margin: 0, textDecoration: isSolved ? 'line-through' : 'none', color: isSolved ? 'var(--text-muted)' : 'var(--text-primary)' }}>{test.title}</h3>
                             <span className="badge pending" style={{ background: isSolved ? 'rgba(34, 197, 94, 0.2)' : 'var(--accent-glow)', color: isSolved ? 'var(--success)' : 'var(--accent-primary)', whiteSpace: 'nowrap' }}>{test.timeLimit} Mins</span>
                           </div>
                           <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                             {test.subject} • {test.questions?.length || 0} Qs • {new Date(test.createdAt).toLocaleDateString()} {isSolved && <span style={{color:'var(--success)', fontWeight:'bold'}}> • Solved ✅</span>}
                           </p>
                         </div>
                         <div className="flex-row gap-2" style={{ flexWrap: 'wrap' }}>
                           <button title="Share Test" className="btn task-action-btn" onClick={() => copyShareLink(test.id)} style={{ padding: '8px 16px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                             <span className="desktop-text"><FiShare2 /> Share</span>
                             <FiShare2 className="mobile-icon" size={16} />
                           </button>
                           <button title="Edit Test" className="btn task-action-btn" onClick={() => setEditingTest(test)} style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--info)', display: 'flex', alignItems: 'center' }}>
                             <span className="desktop-text">Edit</span>
                             <FiEdit className="mobile-icon" size={16} />
                           </button>
                           <button title="Delete Test" className="btn task-action-btn" onClick={() => setDeletingTest(test)} style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                             <span className="desktop-text">Delete</span>
                             <FiTrash2 className="mobile-icon" size={16} />
                           </button>
                           <button title="Take Test" className="btn btn-primary task-action-btn" onClick={() => navigate(`/test/${test.id}`)} style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '6px', background: isSolved ? 'var(--glass-bg)' : 'var(--accent-secondary)' }}>
                             <span className="desktop-text"><FiPlayCircle /> {isSolved ? 'Revise' : 'Take Test'}</span>
                             <FiPlayCircle className="mobile-icon" size={16} />
                           </button>
                         </div>
                       </div>
                       );
                     })}
                   </div>
                 </div>
               ));
             })()}
         </div>
      </div>
    );
  }

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px', animation: 'fadeIn 0.3s' }}>
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
             <h2 style={{ fontSize: '1.25rem', marginBottom: '16px' }}>📚 Subject Wise Practice</h2>
             
             <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }}>
                {SUBJECTS.map(sub => {
                   const testsForThisSubject = history.filter(h => {
                     const subj = (h.subject || '').toLowerCase();
                     const subId = sub.id.toLowerCase();
                     if (subId === 'history') return subj.includes('history') || subj.includes('gk');
                     return subj.includes(subId);
                   });
                   
                   return (
                     <div key={sub.id} className="flex-col gap-2">
                        {/* BIG SUBJECT CARD */}
                        <button 
                           onClick={() => setFilterSubject(sub.id)}
                           className="glass-card" 
                           style={{ 
                              width: '100%',
                              padding: '24px 24px',
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'flex-start',
                              gap: '16px', 
                              background: 'var(--glass-bg)',
                              border: '1px solid var(--border-color)',
                              borderRadius: '20px',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease'
                           }}
                        >
                           <span style={{ fontSize: '2.5rem' }}>{sub.icon}</span>
                           <span style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)' }}>{sub.label}</span>
                           <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.875rem' }}>{testsForThisSubject.length} Tests</span>
                        </button>
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
                <label style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Test Topic</label>
                <input type="text" placeholder="e.g. Modern History, Physical Geography..." value={editingTest.topic || ''} onChange={e => setEditingTest({...editingTest, topic: e.target.value})} className="glass-card" style={{ padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
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
