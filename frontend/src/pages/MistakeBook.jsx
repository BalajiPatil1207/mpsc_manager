import React, { useState, useEffect } from 'react';
import { FiXCircle, FiBook, FiPlayCircle, FiTrash2 } from 'react-icons/fi';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const MistakeBook = () => {
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingTest, setDeletingTest] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchMistakes = async () => {
      try {
        const res = await axios.get('https://mpsc-manager.onrender.com/api/custom-tests/all');
        if (res.data.success) {
          const mistakeMocks = res.data.data.filter(t => t.isMistakeMock === true);
          setMistakes(mistakeMocks);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchMistakes();
  }, []);

  let totalQuestionsWrong = 0;
  mistakes.forEach(m => totalQuestionsWrong += (m.questions?.length || 0));

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      <div className="flex-row justify-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="heading-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>📕 Mistake Book</h1>
          <p style={{ color: 'var(--text-secondary)' }}>AI auto-saves your incorrect answers so you never repeat them. (Feature in active tracking)</p>
        </div>
        <div className="glass-card" style={{ padding: '16px 32px', textAlign: 'center', borderLeft: '4px solid var(--danger)' }}>
          <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>{totalQuestionsWrong}</span>
          <br />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Questions to Revise</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Recent Mistake Mocks</h2>
          <div className="flex-col gap-4">
            {loading ? (
               <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', gap: '24px' }}>
                <div className="premium-loader" style={{ width: '60px', height: '60px' }}>
                   <div className="ring"></div><div className="ring"></div><div className="ring"></div>
                   <span className="premium-loader-text" style={{ fontSize: '0.8rem', fontFamily: 'serif', fontStyle: 'italic', color: 'var(--accent-primary)' }}>1207</span>
                </div>
                <p style={{ color: 'var(--text-secondary)', letterSpacing: '2px', textTransform: 'uppercase', animation: 'pulse 1.5s infinite', fontSize: '0.75rem', fontWeight: 600 }}>Loading Records</p>
              </div>
            ) : mistakes.length === 0 ? (
               <div className="glass-card" style={{ padding: '40px', textAlign: 'center' }}>
                 <FiXCircle size={48} color="rgba(255,255,255,0.1)" style={{ marginBottom: '16px' }} />
                 <p style={{ color: 'var(--success)' }}>Brilliant! No mistakes tracked yet. Keep up the good work!</p>
               </div>
            ) : (
               mistakes.map(m => (
                 <div key={m.id} className="glass-card" style={{ padding: '20px', borderLeft: '4px solid var(--danger)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
                    <div className="flex-col gap-2">
                      <div className="flex-row gap-2 align-center">
                        <h3 style={{ fontSize: '1.125rem', margin: 0, color: 'var(--danger)' }}>{m.title}</h3>
                        <span className="badge missed" style={{ background: 'rgba(239, 68, 68, 0.2)', color: 'var(--danger)' }}>{m.timeLimit} Mins</span>
                      </div>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{m.subject} • {m.questions?.length} Questions • Created {new Date(m.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex-row gap-2" style={{ flexWrap: 'wrap' }}>
                      <button onClick={() => setDeletingTest(m)} className="btn task-action-btn" title="Delete Mistake Test" style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                         <span className="desktop-text"><FiTrash2 /> Delete</span>
                         <FiTrash2 className="mobile-icon" size={16} />
                      </button>
                      <button className="btn btn-primary task-action-btn" onClick={() => navigate(`/test/${m.id}`)} style={{ background: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <span className="desktop-text"><FiBook /> Revise</span>
                         <FiBook className="mobile-icon" size={16} />
                      </button>
                    </div>
                 </div>
               ))
            )}
          </div>
        </div>
      </div>

      {deletingTest && (
        <div className="modal-overlay" onClick={() => setDeletingTest(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-primary)', border: '1px solid var(--danger)', textAlign: 'left', minWidth: '300px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--danger)' }}>⚠️ Delete Mistake Book?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Are you sure you want to permanently delete "{deletingTest.title}"? You will lose this revision data.</p>
            <div className="flex-row gap-4">
              <button type="button" onClick={() => setDeletingTest(null)} className="btn" style={{ flex: 1, background: 'var(--glass-bg)' }}>Cancel</button>
              <button 
                type="button" 
                onClick={async () => {
                   try {
                     const res = await axios.delete(`https://mpsc-manager.onrender.com/api/custom-tests/${deletingTest.id}`);
                     if(res.data.success) {
                       import('react-hot-toast').then(({ toast }) => toast.success('Mistake test deleted successfully'));
                       setMistakes(mistakes.filter(m => m.id !== deletingTest.id));
                       setDeletingTest(null);
                     }
                   } catch(err) {
                     import('react-hot-toast').then(({ toast }) => toast.error('Failed to delete test'));
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

export default MistakeBook;
