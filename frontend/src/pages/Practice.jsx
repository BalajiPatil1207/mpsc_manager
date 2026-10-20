import React, { useState, useEffect } from 'react';
import { FiBookOpen, FiZap, FiPlayCircle, FiCheckCircle, FiShare2, FiEdit, FiTrash2, FiAward, FiRefreshCw } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../firebase';
import { toast } from 'react-hot-toast';
import { generateDynamicMpscTest } from '../utils/dynamicMockGenerator';
import { normalizeTopicName } from '../utils/textUtils';

// Master catalog of MPSC PYQ Drills across core subjects
const MPSC_PYQ_CATALOG = [
  {
    id: 'polity_const_drill',
    title: 'MPSC राज्यघटना: घटनादुरुस्ती व मूलभूत हक्क',
    subject: 'भारतीय राज्यव्यवस्था',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'mpsc_rajyaseva',
    meta: '15 प्रश्न • MPSC राज्यघटना PYQs',
    badge: 'राज्यसेवा +2/-0.66'
  },
  {
    id: 'geo_mh_rivers',
    title: 'महाराष्ट्र भूगोल: सह्याद्री, नद्या व हवामान',
    subject: 'भूगोल',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'group_c',
    meta: '15 प्रश्न • महाराष्ट्र प्राकृतिक भूगोल',
    badge: 'गट क +1/-0.25'
  },
  {
    id: 'his_reformers',
    title: 'आधुनिक इतिहास: १८५७ चा उठाव व समाजसुधारक',
    subject: 'इतिहास',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'mpsc_rajyaseva',
    meta: '15 प्रश्न • आधुनिक भारताचा इतिहास',
    badge: 'राज्यसेवा +2/-0.66'
  },
  {
    id: 'econ_rbi_budget',
    title: 'अर्थव्यवस्था: RBI धोरणे, दारिद्र्य व पंचवार्षिक योजना',
    subject: 'अर्थव्यवस्था',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'group_c',
    meta: '15 प्रश्न • भारतीय अर्थव्यवस्था PYQs',
    badge: 'गट क +1/-0.25'
  },
  {
    id: 'sci_physics_bio',
    title: 'सामान्य विज्ञान: भौतिकशास्त्र व जीवशास्त्र संकल्पना',
    subject: 'सामान्य विज्ञान',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'mpsc_rajyaseva',
    meta: '15 प्रश्न • सामान्य विज्ञान सराव संच',
    badge: 'राज्यसेवा +2/-0.66'
  },
  {
    id: 'csat_reasoning',
    title: 'CSAT बुद्धिमत्ता: तर्कक्षमता व वेन आकृत्या संच',
    subject: 'बुद्धिमत्ता',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'group_c',
    meta: '15 प्रश्न • CSAT Reasoning Practice',
    badge: 'गट क +1/-0.25'
  },
  {
    id: 'polity_panchayat',
    title: 'पंचायत राज: ७३ व ७४ वी घटनादुरुस्ती संच',
    subject: 'भारतीय राज्यव्यवस्था',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'mpsc_rajyaseva',
    meta: '15 प्रश्न • पंचायत राज व स्थानिक प्रशासन',
    badge: 'राज्यसेवा +2/-0.66'
  },
  {
    id: 'geo_agri_mineral',
    title: 'महाराष्ट्र कृषी व खनिजे: वारंवार विचारलेले प्रश्न',
    subject: 'भूगोल',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'group_c',
    meta: '15 प्रश्न • खनिजे, उद्योग व वाहतूक',
    badge: 'गट क +1/-0.25'
  }
];

// Helper to get or dynamically rotate daily PYQ sets
const getDailyPyqs = (forceRefresh = false) => {
  const today = new Date().toISOString().split('T')[0];
  const savedDate = localStorage.getItem('practice_pyqs_date');
  const saved = localStorage.getItem('practice_pyqs');

  if (!forceRefresh && savedDate === today && saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }

  // Generate dynamic set rotating by date or randomized
  const shuffled = [...MPSC_PYQ_CATALOG].sort(() => Math.random() - 0.5);
  // Pick 3-4 distinct topics
  const selected = shuffled.slice(0, 3).map(item => ({
    ...item,
    id: `${item.id}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    completed: false,
    assignedDate: today
  }));

  try {
    localStorage.setItem('practice_pyqs', JSON.stringify(selected));
    localStorage.setItem('practice_pyqs_date', today);
  } catch (e) {}

  return selected;
};

const Practice = () => {
  const [hasPlan, setHasPlan] = useState(true);
  const [history, setHistory] = useState(() => {
    try {
      const cached = localStorage.getItem('mpsc_cached_practice');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('mpsc_cached_practice');
      return !(cached && JSON.parse(cached).length > 0);
    } catch (e) {
      return true;
    }
  });
  const [filterSubject, setFilterSubject] = useState('');
  const [filterTopic, setFilterTopic] = useState('');
  const [editingTest, setEditingTest] = useState(null);
  const [deletingTest, setDeletingTest] = useState(null);
  const [viewingLeaderboard, setViewingLeaderboard] = useState(null);
  const [lbLoading, setLbLoading] = useState(false);
  const [lbData, setLbData] = useState([]);

  const openGlobalLeaderboard = async () => {
    setViewingLeaderboard(true);
    setLbLoading(true);
    try {
      const res = await axios.get(`https://mpsc-manager.onrender.com/api/custom-tests/global-leaderboard`);
      if (res.data.success) {
        setLbData(res.data.leaderboard || []);
      } else {
        setLbData([]);
      }
    } catch (err) {
      setLbData([]);
    } finally {
      setLbLoading(false);
    }
  };
  
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const cleanTopic = normalizeTopicName(editingTest.topic);
    const updatedTest = { ...editingTest, topic: cleanTopic };
    const targetId = updatedTest._id || updatedTest.id;
    
    // Optimistic UI Update
    setHistory(history.map(h => (h._id || h.id) === targetId ? updatedTest : h));
    setEditingTest(null);

    try {
      const res = await axios.put(`https://mpsc-manager.onrender.com/api/custom-tests/${targetId}`, {
        title: updatedTest.title,
        subject: updatedTest.subject,
        timeLimit: updatedTest.timeLimit,
        topic: cleanTopic
      });
      if(res.data.success) {
        toast.success("Test updated successfully!");
      }
    } catch(err) {
      toast.error("Failed to update test details on server");
    }
  };

  const renderModals = () => (
    <>
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
                <input type="text" placeholder="e.g. Modern History..." value={editingTest.topic || ''} onChange={e => setEditingTest({...editingTest, topic: e.target.value})} className="glass-card" style={{ padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
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
                   const targetId = deletingTest._id || deletingTest.id;
                   // Optimistic UI Update
                   setHistory(history.filter(h => (h._id || h.id) !== targetId));
                   setDeletingTest(null);
                   try {
                     const res = await axios.delete(`https://mpsc-manager.onrender.com/api/custom-tests/${targetId}`);
                     if(res.data.success) {
                       toast.success('Test deleted successfully');
                     }
                   } catch(err) {
                     toast.error('Failed to update deletion on server');
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

      {/* All-Tests Global Leaderboard Modal */}
      {viewingLeaderboard && (
        <div className="modal-overlay" onClick={() => setViewingLeaderboard(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', textAlign: 'left', maxWidth: '520px', width: '90%' }}>
            <div className="flex-row justify-between align-center" style={{ marginBottom: '16px' }}>
              <div className="flex-row gap-2 align-center">
                <FiAward size={24} style={{ color: 'var(--accent-primary)' }} />
                <div>
                  <h2 style={{ fontSize: '1.2rem', margin: 0 }}>🏆 सर्व टेस्ट्सचा महा-लीडरबोर्ड</h2>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>सर्व टेस्ट्सचे एकूण गुण & अचूकतेनुसार क्रमवारी</p>
                </div>
              </div>
              <button onClick={() => setViewingLeaderboard(null)} className="btn" style={{ padding: '6px 12px', fontSize: '0.8rem' }}>✕</button>
            </div>

            {lbLoading ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                रँकिंग लोड होत आहे...
              </div>
            ) : lbData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
                <span style={{ fontSize: '2rem' }}>🎯</span>
                <h4 style={{ margin: '8px 0 4px 0', color: 'var(--text-primary)' }}>अजून कोणीही रँक मिळवलेला नाही!</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  कोणतीही टेस्ट सोडवा आणि किमान १ बरोबर उत्तर देऊन थेट #१ रँक मिळवणारे पहिले व्हा!
                </p>
              </div>
            ) : (
              <div className="leaderboard-box-list" style={{ maxHeight: '360px', overflowY: 'auto' }}>
                {lbData.map((item, idx) => {
                  const isMe = item.userId === auth.currentUser?.uid;
                  const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                  return (
                    <div key={idx} className={`leaderboard-item-row ${isMe ? 'leaderboard-item-row-me' : ''}`}>
                      <div className="lb-col-rank">{medal}</div>
                      <div className="lb-col-user">
                        <div className="lb-username">
                          {item.userName} {isMe && <span className="lb-me-tag">तुम्ही</span>}
                        </div>
                        <div className="lb-user-meta">
                          {item.totalTests || 1} टेस्ट्स सोडवल्या • {item.accuracy}% अचूकता
                        </div>
                      </div>
                      <div className="lb-col-score">
                        <span className="lb-score-val">{item.totalScore !== undefined ? item.totalScore : item.netScore}</span>
                        <span className="lb-score-label">एकूण गुण</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );

  const [pyqs, setPyqs] = useState(() => getDailyPyqs(false));
  const navigate = useNavigate();

  const handleRefreshPyqs = () => {
    const refreshed = getDailyPyqs(true);
    setPyqs(refreshed);
    toast.success("आजचे नवीन MPSC सराव प्रश्न लोड झाले! 🔄");
  };

  const togglePyq = (id) => {
    const updated = pyqs.map(p => {
      if (p.id === id) return { ...p, completed: !p.completed };
      return p;
    });
    setPyqs(updated);
    try {
      localStorage.setItem('practice_pyqs', JSON.stringify(updated));
    } catch (e) {}
  };

  const startPyqDrill = async (pyq) => {
    const toastId = toast.loading(`${pyq.title || 'सराव संच'} सुरू करत आहे...`);
    try {
      const newTest = generateDynamicMpscTest({
        subject: pyq.subject || 'all',
        questionCount: pyq.questionCount || 15,
        markingScheme: pyq.markingScheme || 'mpsc_rajyaseva',
        timeLimit: pyq.timeLimit || 15,
        topic: pyq.title
      });
      newTest.title = pyq.title || 'MPSC PYQ Drill';

      // Save into mpsc_cached_mocks immediately for 0ms latency in TakeTest
      const cached = JSON.parse(localStorage.getItem('mpsc_cached_mocks') || '[]');
      const updated = [newTest, ...cached.filter(t => (t.id || t._id) !== newTest.id)];
      localStorage.setItem('mpsc_cached_mocks', JSON.stringify(updated));

      // Asynchronously sync to backend
      const usr = auth.currentUser;
      axios.post('https://mpsc-manager.onrender.com/api/custom-tests', {
        title: newTest.title,
        subject: newTest.subject,
        topic: newTest.topic,
        timeLimit: newTest.timeLimit,
        questions: newTest.questions,
        markingScheme: newTest.markingScheme,
        totalMarks: newTest.totalMarks,
        examDate: newTest.examDate,
        createdBy: usr?.uid || 'pyq_engine',
        creatorName: usr?.displayName ? usr.displayName.split(' ')[0] : 'PYQ Drill'
      }).catch(err => console.warn("Backend pyq sync notice:", err?.message));

      toast.success(`${pyq.title} सज्ज आहे! 🎯`, { id: toastId });
      navigate(`/test/${newTest.id}`);
    } catch (err) {
      toast.error('चाचणी सुरू करताना त्रुटी: ' + err.message, { id: toastId });
    }
  };

  const startSubjectDrill = async (subject) => {
    const toastId = toast.loading(`${subject} ड्रिल तयार करत आहे...`);
    try {
      const newTest = generateDynamicMpscTest({
        subject: subject,
        questionCount: 15,
        markingScheme: 'mpsc_rajyaseva',
        timeLimit: 15,
        topic: `${subject} Rapid Mastery Drill`
      });
      newTest.title = `${subject} Rapid Drill`;

      const cached = JSON.parse(localStorage.getItem('mpsc_cached_mocks') || '[]');
      const updated = [newTest, ...cached.filter(t => (t.id || t._id) !== newTest.id)];
      localStorage.setItem('mpsc_cached_mocks', JSON.stringify(updated));

      const usr = auth.currentUser;
      axios.post('https://mpsc-manager.onrender.com/api/custom-tests', {
        title: newTest.title,
        subject: newTest.subject,
        topic: newTest.topic,
        timeLimit: newTest.timeLimit,
        questions: newTest.questions,
        markingScheme: newTest.markingScheme,
        totalMarks: newTest.totalMarks,
        examDate: newTest.examDate,
        createdBy: usr?.uid || 'drill_engine',
        creatorName: usr?.displayName ? usr.displayName.split(' ')[0] : 'Subject Drill'
      }).catch(err => console.warn("Backend drill sync notice:", err?.message));

      toast.success(`${subject} ड्रिल सुरू झाली! 🚀`, { id: toastId });
      navigate(`/test/${newTest.id}`);
    } catch (err) {
      toast.error('ड्रिल तयार करताना त्रुटी: ' + err.message, { id: toastId });
    }
  };

  const copyShareLink = (testId) => {
    const link = `${window.location.origin}/test/${testId}`;
    navigator.clipboard.writeText(link);
    toast.success("Test link copied to clipboard! 📋");
  };

  useEffect(() => {
    let isMounted = true;

    // Safety timeout: Never let skeleton loader freeze for more than 1.5s
    const timeoutTimer = setTimeout(() => {
      if (isMounted) setLoading(false);
    }, 1500);

    const fetchPlan = async () => {
      try {
        const uid = auth.currentUser?.uid || 'testUser';
        const res = await axios.get(`https://mpsc-manager.onrender.com/api/plans/user/${uid}`, { timeout: 6000 });
        if (isMounted && res.data.success && res.data.hasPlan) {
          setHasPlan(true);
        }
      } catch (e) {
        console.warn("Plan fetch fallback", e?.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    const fetchHistory = async () => {
      try {
        const res = await axios.get('https://mpsc-manager.onrender.com/api/custom-tests/all', { timeout: 8000 });
        if (isMounted && res.data.success) {
          const practiceTests = res.data.data.filter(t => !(t.subject || '').includes('Mega') && !(t.title || '').includes('Mock'));
          setHistory(practiceTests);
          try {
            localStorage.setItem('mpsc_cached_practice', JSON.stringify(practiceTests));
          } catch(e) {}
        }
      } catch (e) {
        console.warn("History fetch fallback", e?.message);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    
    fetchPlan();
    fetchHistory();

    return () => {
      isMounted = false;
      clearTimeout(timeoutTimer);
    };
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

  if (filterSubject && activeSubjectData && !filterTopic) {
    const testsForSubject = filteredHistory.filter(h => {
      const subj = (h.subject || '').toLowerCase();
      const activeId = activeSubjectData.id.toLowerCase();
      if (activeId === 'history') return subj.includes('history') || subj.includes('gk');
      return subj.includes(activeId);
    });
    
    if (testsForSubject.length === 0) {
      return (
        <div className="flex-col gap-6" style={{ paddingBottom: '40px', animation: 'fadeIn 0.3s' }}>
          <div className="flex-row gap-4 align-center" style={{ marginBottom: '8px' }}>
            <button className="btn" onClick={() => setFilterSubject('')} style={{ background: 'var(--glass-bg)', padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>←</span> Back to All Subjects
            </button>
          </div>
          <div className="glass-panel" style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--text-muted)' }}>No tests available for {activeSubjectData.label}.</p>
          </div>
        </div>
      );
    }

    const groupedTests = testsForSubject.reduce((acc, test) => {
      const topic = normalizeTopicName(test.topic);
      if(!acc[topic]) acc[topic] = [];
      const testId = test._id || test.id;
      const alreadyHas = testId && acc[topic].some(existing => (existing._id || existing.id) === testId);
      if (!alreadyHas) {
        acc[topic].push(test);
      }
      return acc;
    }, {});

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
            {activeSubjectData.label} Topics
          </h1>
          <button onClick={() => navigate('/test-maker', { state: { defaultSubject: activeSubjectData.id === 'Math' ? 'Maths' : activeSubjectData.id } })} className="btn" style={{ padding: '8px 16px', fontSize: '0.875rem', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
             + Create Test
          </button>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>Select a topic to view its tests.</p>
        
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }}>
          {Object.keys(groupedTests).map(topicName => (
            <button 
              key={topicName}
              onClick={() => setFilterTopic(topicName)}
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
              <span style={{ fontSize: '2.5rem' }}>📂</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}>{topicName}</span>
              <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.875rem' }}>{groupedTests[topicName].length} Tests</span>
            </button>
          ))}
        </div>
        {renderModals()}
      </div>
    );
  }

  if (filterSubject && activeSubjectData && filterTopic) {
    const targetCanonical = normalizeTopicName(filterTopic);
    const rawTestsForTopic = filteredHistory.filter(h => {
      const subj = (h.subject || '').toLowerCase();
      const activeId = activeSubjectData.id.toLowerCase();
      const isSubjMatch = activeId === 'history' ? (subj.includes('history') || subj.includes('gk')) : subj.includes(activeId);
      const testTopic = normalizeTopicName(h.topic);
      return isSubjMatch && testTopic === targetCanonical;
    });

    const seenTopicTestIds = new Set();
    const testsForTopic = rawTestsForTopic.filter(t => {
      const uid = t._id || t.id;
      if (uid && seenTopicTestIds.has(uid)) return false;
      if (uid) seenTopicTestIds.add(uid);
      return true;
    });

    return (
      <div className="flex-col gap-6" style={{ paddingBottom: '40px', animation: 'fadeIn 0.3s' }}>
        <div className="flex-row gap-4 align-center" style={{ marginBottom: '8px' }}>
          <button className="btn" onClick={() => setFilterTopic('')} style={{ background: 'var(--glass-bg)', padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>←</span> Back to Topics
          </button>
        </div>
        
        <div className="flex-row justify-between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <h1 className="heading-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>
            📂 {filterTopic}
          </h1>
          <button onClick={() => navigate('/test-maker', { state: { defaultSubject: activeSubjectData.id === 'Math' ? 'Maths' : activeSubjectData.id } })} className="btn" style={{ padding: '8px 16px', fontSize: '0.875rem', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>
             + Create Test
          </button>
        </div>
        
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))' }}>
          {testsForTopic.map(test => {
            const isSolved = test.attemptedBy?.includes(currentUser);
            return (
            <div key={test._id || test.id} className="glass-card" style={{ padding: '16px', borderTop: isSolved ? '4px solid var(--success)' : '4px solid var(--accent-primary)', background: isSolved ? 'rgba(34, 197, 94, 0.05)' : 'var(--bg-primary)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="flex-col gap-2">
                <div className="flex-row gap-2 align-center justify-between">
                  <h3 style={{ fontSize: '1.125rem', margin: 0, textDecoration: isSolved ? 'line-through' : 'none', color: isSolved ? 'var(--text-muted)' : 'var(--text-primary)' }}>{test.title}</h3>
                  <span className="badge pending" style={{ background: isSolved ? 'rgba(34, 197, 94, 0.2)' : 'var(--accent-glow)', color: isSolved ? 'var(--success)' : 'var(--accent-primary)', whiteSpace: 'nowrap' }}>{test.timeLimit} Mins</span>
                </div>
                <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  {test.questions?.length || 0} Qs • {new Date(test.createdAt).toLocaleDateString()} {isSolved && <span style={{color:'var(--success)', fontWeight:'bold'}}> • Solved ✅</span>}
                </p>
              </div>
              <div className="flex-row gap-2" style={{ flexWrap: 'wrap', marginTop: 'auto' }}>
                <button title="Share Test" className="btn task-action-btn" onClick={() => copyShareLink(test._id || test.id)} style={{ padding: '8px 16px', background: 'rgba(34, 197, 94, 0.1)', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span className="desktop-text"><FiShare2 /> Share</span>
                  <FiShare2 className="mobile-icon" size={16} />
                </button>
                <button title="Edit Test" className="btn task-action-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setEditingTest(test); }} style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--info)', display: 'flex', alignItems: 'center' }}>
                  <span className="desktop-text">Edit</span>
                  <FiEdit className="mobile-icon" size={16} />
                </button>
                <button title="Delete Test" className="btn task-action-btn" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeletingTest(test); }} style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center' }}>
                  <span className="desktop-text">Delete</span>
                  <FiTrash2 className="mobile-icon" size={16} />
                </button>
                <button title="Take Test" className="btn btn-primary task-action-btn" onClick={() => navigate(`/test/${test._id || test.id}`)} style={{ padding: '8px 24px', display: 'flex', alignItems: 'center', gap: '6px', background: isSolved ? 'var(--glass-bg)' : 'var(--accent-secondary)' }}>
                  <span className="desktop-text"><FiPlayCircle /> {isSolved ? 'Revise' : 'Take Test'}</span>
                  <FiPlayCircle className="mobile-icon" size={16} />
                </button>
              </div>
            </div>
            );
          })}
        </div>
        {renderModals()}
      </div>
    );
  }

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px', animation: 'fadeIn 0.3s' }}>
      <div className="flex-row justify-between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <h1 className="heading-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>Practice & PYQ</h1>
        <div className="flex-row gap-2" style={{ alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            onClick={openGlobalLeaderboard}
            className="btn" 
            style={{ 
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(249, 115, 22, 0.15))', 
              color: '#f59e0b', 
              border: '1.5px solid rgba(245, 158, 11, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 700,
              padding: '8px 16px',
              borderRadius: '12px',
              cursor: 'pointer'
            }}
          >
            <FiAward size={18} />
            <span>🏆 सर्व टेस्ट्सचा महा-लीडरबोर्ड</span>
          </button>
          {hasPlan && <button onClick={() => navigate('/test-maker')} className="btn btn-primary"><FiPlayCircle className="inline mr-2" /> Daily Challenge</button>}
        </div>
      </div>
      <p style={{ color: 'var(--text-secondary)' }}>Targeted daily practice based on your active study plan.</p>

      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '24px', maxWidth: '100%', overflowX: 'hidden' }}>
           <div className="flex-row justify-between align-center" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
             <div>
               <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                 🔥 Today's Assigned PYQs (आजचा सराव संच)
               </h2>
               <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                 MPSC आयोगाचे अधिकृत प्रश्न • दररोज नवीन विषयांचे संच
               </span>
             </div>
             <button 
               onClick={handleRefreshPyqs}
               className="btn"
               style={{ 
                 fontSize: '0.8rem', 
                 display: 'flex', 
                 alignItems: 'center', 
                 gap: '6px', 
                 background: 'rgba(59, 130, 246, 0.1)', 
                 color: '#60a5fa', 
                 border: '1px solid rgba(59, 130, 246, 0.3)',
                 padding: '6px 12px',
                 borderRadius: '10px',
                 cursor: 'pointer'
               }}
               title="आजचे नवीन सराव प्रश्न लोड करा"
             >
               <FiRefreshCw size={13} />
               <span>नवीन PYQs लोड करा</span>
             </button>
           </div>

           <div className="flex-row gap-4 horizontal-scroll" style={{ overflowX: 'auto', scrollSnapType: 'x mandatory', paddingBottom: '8px', scrollPadding: '0', width: '100%' }}>
             {pyqs.map(p => (
               <div 
                 key={p.id} 
                 className="glass-card" 
                 style={{ 
                   minWidth: '300px', 
                   maxWidth: '340px',
                   flex: '0 0 auto', 
                   scrollSnapAlign: 'start', 
                   padding: '18px', 
                   borderLeft: `4px solid ${p.completed ? 'var(--success)' : 'var(--accent-primary)'}`, 
                   background: p.completed ? 'rgba(34, 197, 94, 0.05)' : 'var(--glass-bg)',
                   transition: 'all 0.3s ease',
                   display: 'flex',
                   flexDirection: 'column',
                   justifyContent: 'space-between',
                   gap: '12px'
                 }}
               >
                 <div>
                   <div className="flex-row justify-between align-center" style={{ marginBottom: '6px' }}>
                     <span style={{ 
                       fontSize: '0.7rem', 
                       padding: '2px 8px', 
                       borderRadius: '6px', 
                       background: 'rgba(255, 255, 255, 0.08)',
                       color: 'var(--text-secondary)',
                       fontWeight: 600
                     }}>
                       {p.subject || 'MPSC GS'}
                     </span>
                     {p.badge && (
                       <span style={{ 
                         fontSize: '0.7rem', 
                         padding: '2px 8px', 
                         borderRadius: '6px', 
                         background: p.badge.includes('राज्यसेवा') ? 'rgba(245, 158, 11, 0.15)' : 'rgba(59, 130, 246, 0.15)',
                         color: p.badge.includes('राज्यसेवा') ? '#f59e0b' : '#60a5fa',
                         fontWeight: 700
                       }}>
                         {p.badge}
                       </span>
                     )}
                   </div>
                   <h3 style={{ 
                     fontSize: '1rem', 
                     lineHeight: '1.4', 
                     margin: '0 0 4px 0',
                     color: p.completed ? 'var(--text-muted)' : 'var(--text-primary)', 
                     textDecoration: p.completed ? 'line-through' : 'none' 
                   }}>
                     {p.title}
                   </h3>
                   <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: 0 }}>
                     {p.completed ? '✅ आज सोडवून पूर्ण झाले' : p.meta}
                   </p>
                 </div>

                 <div className="flex-row gap-2" style={{ marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}>
                   {p.completed ? (
                     <button 
                       className="btn" 
                       onClick={() => togglePyq(p.id)} 
                       title="Undo" 
                       style={{ 
                         width: '100%', 
                         padding: '8px', 
                         fontSize: '0.8rem', 
                         background: 'rgba(34, 197, 94, 0.12)', 
                         color: 'var(--success)', 
                         border: '1px solid rgba(34, 197, 94, 0.3)',
                         borderRadius: '8px',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         gap: '6px'
                       }}
                     >
                       <FiCheckCircle size={16} color="var(--success)" />
                       <span>पूर्ण झाले (बदला)</span>
                     </button>
                   ) : (
                     <>
                       <button 
                         onClick={() => startPyqDrill(p)} 
                         className="btn btn-primary" 
                         style={{ 
                           flex: 2, 
                           padding: '8px 12px', 
                           fontSize: '0.8rem', 
                           display: 'flex', 
                           alignItems: 'center', 
                           justifyContent: 'center', 
                           gap: '6px' 
                         }}
                       >
                         <span>🚀 सोडवा (Start)</span>
                       </button>
                       <button 
                         onClick={() => togglePyq(p.id)} 
                         className="btn" 
                         style={{ 
                           flex: 1, 
                           padding: '8px 10px', 
                           background: 'var(--glass-bg)', 
                           color: 'var(--text-secondary)', 
                           border: '1px solid var(--border-color)', 
                           fontSize: '0.8rem',
                           borderRadius: '8px'
                         }}
                         title="Mark as complete"
                       >
                         ✓ पूर्ण
                       </button>
                     </>
                   )}
                 </div>
               </div>
             ))}
           </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>🎯 Topic Wise Mastery</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '14px' }}>
            क्लिक करा आणि थेट १५ प्रश्नांची रॅपिड सराव ड्रिल सोडवा
          </p>
          <div className="flex-col gap-0" style={{ maxHeight: '200px', overflowY: 'auto', paddingRight: '8px' }}>
            {['भारतीय राज्यव्यवस्था', 'भूगोल', 'इतिहास', 'अर्थव्यवस्था', 'सामान्य विज्ञान', 'चालू घडामोडी'].map((subject) => {
               const xp = parseFloat(localStorage.getItem(`xp_${subject}`)) || 0;
               return (
               <div key={subject} className="flex-row justify-between" style={{ alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                 <div style={{ display: 'flex', flexDirection: 'column' }}>
                   <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>{subject}</span>
                   <span style={{ color: 'var(--accent-secondary)', fontSize: '0.75rem', fontWeight: 'bold' }}>{xp} XP Earned</span>
                 </div>
                 <button 
                   className="btn" 
                   onClick={() => startSubjectDrill(subject)} 
                   style={{ 
                     padding: '6px 14px', 
                     fontSize: '0.75rem', 
                     background: 'var(--glass-bg)', 
                     color: 'var(--accent-primary)', 
                     border: '1px solid var(--accent-primary)',
                     borderRadius: '8px',
                     cursor: 'pointer'
                   }}
                 >
                   ⚡ Drill
                 </button>
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
      {renderModals()}
    </div>
  );
};

export default Practice;
