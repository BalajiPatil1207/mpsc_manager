import React, { useState, useEffect } from 'react';
import { FiTarget, FiPlay, FiShare2, FiEdit, FiTrash2, FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../firebase';
import { toast } from 'react-hot-toast';

const MockTests = () => {
  const [hasPlan, setHasPlan] = useState(false);
  const [history, setHistory] = useState(() => {
    try {
      const cached = localStorage.getItem('mpsc_cached_mocks');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('mpsc_cached_mocks');
      return !(cached && JSON.parse(cached).length > 0);
    } catch (e) {
      return true;
    }
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTest, setEditingTest] = useState(null);
  const [deletingTest, setDeletingTest] = useState(null);
  const navigate = useNavigate();

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const updatedTest = { ...editingTest };
    const targetId = updatedTest._id || updatedTest.id;
    
    // Optimistic UI Update
    setHistory(history.map(h => (h._id || h.id) === targetId ? updatedTest : h));
    setEditingTest(null);

    try {
      const res = await axios.put(`https://mpsc-manager.onrender.com/api/custom-tests/${targetId}`, {
        title: updatedTest.title,
        subject: updatedTest.subject,
        timeLimit: updatedTest.timeLimit,
        topic: updatedTest.topic
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
                <input type="text" placeholder="e.g. Modern History, Algebra..." value={editingTest.topic || ''} onChange={e => setEditingTest({...editingTest, topic: e.target.value})} className="glass-card" style={{ padding: '10px', color: 'var(--text-primary)', outline: 'none' }} />
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
    </>
  );

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
          // Only show Mock/Mega tests (not practice tests)
          const mockTests = res.data.data.filter(t => {
            if (t.isMistakeMock) return false;
            const title = (t.title || '').toLowerCase();
            const subject = (t.subject || '').toLowerCase();
            const createdBy = (t.createdBy || '').toLowerCase();
            return (
              title.includes('mock') ||
              title.includes('mega') ||
              subject.includes('mega') ||
              createdBy === 'system engine'
            );
          });
          setHistory(mockTests);
          try {
            localStorage.setItem('mpsc_cached_mocks', JSON.stringify(mockTests));
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

  // Short name generator: Mock Test - 1, 2, 3...
  const getShortName = (test, idx) => {
    return `Mock Test - ${idx + 1}`;
  };

  // Flat filtered + sorted list
  const filteredHistory = history
    .filter(h => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (h.title || '').toLowerCase().includes(q) ||
        (h.subject || '').toLowerCase().includes(q) ||
        (h.topic || '').toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const aSolved = a.attemptedBy?.includes(currentUser) ? 1 : 0;
      const bSolved = b.attemptedBy?.includes(currentUser) ? 1 : 0;
      return aSolved - bSolved;
    });

  if (loading) return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      <div className="skeleton-box" style={{ height: '40px', width: '250px' }}></div>
      <div className="skeleton-box" style={{ height: '20px', width: '60%' }}></div>
      <div className="flex-col gap-4" style={{ marginTop: '24px' }}>
        {[1,2,3].map(i => <div key={i} className="skeleton-box" style={{ height: '100px', width: '100%' }}></div>)}
      </div>
    </div>
  );

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px', animation: 'fadeIn 0.3s' }}>
      {/* Header */}
      <div className="flex-row justify-between align-center" style={{ gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h1 className="heading-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>🎯 Mock Tests</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>सर्व उपलब्ध टेस्ट्स एका ठिकाणी — शोधा आणि द्या!</p>
        </div>
        <button onClick={() => navigate('/test-maker')} className="btn btn-primary" style={{ padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          + Create Test
        </button>
      </div>

      {/* Search Box */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)',
        borderRadius: '14px', padding: '10px 16px'
      }}>
        <FiSearch size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
        <input
          type="text"
          placeholder="टेस्टचे नाव, विषय किंवा टॉपिक शोधा..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: 'var(--text-primary)', fontSize: '0.95rem'
          }}
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: 0 }}>✕</button>
        )}
      </div>

      {/* Test Cards */}
      {filteredHistory.length === 0 ? (
        <div className="glass-panel" style={{ padding: '40px', textAlign: 'center' }}>
          <FiTarget size={48} color="var(--text-muted)" style={{ marginBottom: '16px' }} />
          <h2 style={{ fontSize: '1.25rem', color: 'var(--text-secondary)' }}>
            {history.length === 0 ? 'अजून कोणतीही टेस्ट नाही' : 'सापडले नाही'}
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            {history.length === 0
              ? 'पहिली टेस्ट बनवा आणि सुरू करा!'
              : `"${searchQuery}" साठी कोणतीही टेस्ट सापडली नाही.`
            }
          </p>
          {history.length === 0 && (
            <button onClick={() => navigate('/test-maker')} className="btn btn-primary" style={{ marginTop: '16px' }}>+ Create Test</button>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            {filteredHistory.length} टेस्ट्स उपलब्ध {searchQuery && `("${searchQuery}" साठी)`}
          </p>
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 310px), 1fr))' }}>
            {filteredHistory.map((test, idx) => {
              const isSolved = test.attemptedBy?.includes(currentUser);
              const shortName = getShortName(test, idx);
              return (
                <div
                  key={test._id || test.id}
                  className="glass-card"
                  style={{
                    padding: '16px 18px',
                    borderTop: isSolved ? '3px solid var(--success)' : '3px solid var(--accent-primary)',
                    background: isSolved ? 'rgba(34, 197, 94, 0.04)' : 'var(--bg-secondary)',
                    display: 'flex', flexDirection: 'column', gap: '10px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* Title + badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{
                      fontSize: '1rem', margin: 0, flex: 1,
                      color: isSolved ? 'var(--text-muted)' : 'var(--text-primary)',
                      textDecoration: isSolved ? 'line-through' : 'none',
                      fontWeight: 700
                    }}>
                      {shortName}
                    </h3>
                    <span style={{
                      flexShrink: 0,
                      background: isSolved ? 'rgba(34, 197, 94, 0.15)' : 'var(--accent-glow)',
                      color: isSolved ? 'var(--success)' : 'var(--accent-primary)',
                      padding: '3px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700
                    }}>
                      {test.timeLimit} Min
                    </span>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      📋 {test.questions?.length || 0} Qs
                    </span>
                    {isSolved && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>✅ Solved</span>
                    )}
                  </div>

                  {/* Action Buttons - icon only on mobile */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', alignItems: 'center' }}>
                    <button title="Share" className="btn mock-icon-btn" onClick={() => copyShareLink(test._id || test.id)}
                      style={{ padding: '7px', background: 'rgba(34,197,94,0.1)', color: 'var(--success)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '34px', minHeight: '34px' }}>
                      <FiShare2 size={15} />
                    </button>
                    <button title="Edit" className="btn mock-icon-btn" onClick={e => { e.stopPropagation(); setEditingTest(test); }}
                      style={{ padding: '7px', background: 'rgba(59,130,246,0.1)', color: 'var(--info)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '34px', minHeight: '34px' }}>
                      <FiEdit size={15} />
                    </button>
                    <button title="Delete" className="btn mock-icon-btn" onClick={e => { e.stopPropagation(); setDeletingTest(test); }}
                      style={{ padding: '7px', background: 'rgba(239,68,68,0.1)', color: 'var(--danger)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '34px', minHeight: '34px' }}>
                      <FiTrash2 size={15} />
                    </button>
                    <button title="Start" className="btn btn-primary" onClick={() => navigate(`/test/${test._id || test.id}`)}
                      style={{ padding: '7px 16px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', flex: 1, borderRadius: '10px', fontSize: '0.85rem', fontWeight: 700 }}>
                      <FiPlay size={14} /> {isSolved ? 'Revise' : 'Start'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {renderModals()}
    </div>
  );
};

export default MockTests;
