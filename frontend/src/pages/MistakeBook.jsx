import React, { useState, useEffect } from 'react';
import { FiXCircle, FiBook, FiPlayCircle } from 'react-icons/fi';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const MistakeBook = () => {
  const [mistakes, setMistakes] = useState([]);
  const [loading, setLoading] = useState(true);
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
               <p style={{ color: 'var(--text-muted)' }}>Loading records...</p>
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
                    <div>
                      <button className="btn btn-primary" onClick={() => navigate(`/test/${m.id}`)} style={{ background: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                         <FiBook /> Start Revision
                      </button>
                    </div>
                 </div>
               ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MistakeBook;
