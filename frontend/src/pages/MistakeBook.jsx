import React, { useState, useEffect } from 'react';
import { 
  FiXCircle, 
  FiBook, 
  FiPlayCircle, 
  FiTrash2, 
  FiChevronDown, 
  FiChevronUp, 
  FiCheckCircle, 
  FiAlertCircle, 
  FiClock, 
  FiRefreshCw,
  FiEdit2
} from 'react-icons/fi';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import EditQuestionModal from '../components/EditQuestionModal';
import { saveTestOverride, updateTestInAllCaches, applyTestOverrides } from './TakeTest';

const MistakeBook = () => {
  // 1. Instant 0ms hydration from local cache with overrides applied
  const [mistakes, setMistakes] = useState(() => {
    try {
      const cached = localStorage.getItem('mpsc_cached_mistakes');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed)) {
          return parsed.map(m => applyTestOverrides(m, m.parentTestId || m.id || m._id));
        }
      }
      return [];
    } catch (e) {
      return [];
    }
  });

  const [loading, setLoading] = useState(() => {
    try {
      const cached = localStorage.getItem('mpsc_cached_mistakes');
      return !(cached && JSON.parse(cached).length > 0);
    } catch (e) {
      return true;
    }
  });

  const [expandedTestIds, setExpandedTestIds] = useState(new Set());
  const [deletingTest, setDeletingTest] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [editingQuestionModalData, setEditingQuestionModalData] = useState(null);
  const [selectedTopic, setSelectedTopic] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const handleSaveQuestionEdit = async (updatedData) => {
    const { testId, qIndex, question, options, correctOption, explanation } = updatedData;
    const targetTest = mistakes.find(m => (m.id || m._id) === testId);
    if (!targetTest) return;

    const updatedQuestions = [...(targetTest.questions || [])];
    const q = updatedQuestions[qIndex];
    if (!q) return;

    const originalQIdx = q.originalQIndex !== undefined ? q.originalQIndex : qIndex;
    const oldQText = (q.question || '').trim();

    // Check if the corrected option now matches what the user selected:
    const isNowCorrect = q.userSelectedOption !== undefined && q.userSelectedOption === correctOption;

    let nextQuestions;
    if (isNowCorrect) {
      nextQuestions = updatedQuestions.filter((_, idx) => idx !== qIndex);
      toast.success("✨ हे उत्तर योग्य ठरल्यामुळे मिस्टेक बुकमधून हा प्रश्न हटवला गेला!", { icon: '🎉', duration: 4500 });
    } else {
      updatedQuestions[qIndex] = {
        ...q,
        question,
        options,
        correctOption,
        explanation
      };
      nextQuestions = updatedQuestions;
      toast.success("✅ प्रश्न आणि पर्याय यशस्वीरीत्या अपडेट केले!");
    }

    const updatedMistakes = mistakes.map(m => {
      if ((m.id || m._id) === testId) {
        return { 
          ...m, 
          questions: nextQuestions,
          timeLimit: Math.max(nextQuestions.length, 5),
          updatedAt: new Date().toISOString()
        };
      }
      return m;
    }).filter(m => (m.questions || []).length > 0);

    setMistakes(updatedMistakes);
    localStorage.setItem('mpsc_cached_mistakes', JSON.stringify(updatedMistakes));
    window.dispatchEvent(new Event('mpsc_mistakes_updated'));
    window.dispatchEvent(new Event('storage'));

    // Propagate to parent test & all caches so original test reflects these fixes too!
    const parentId = targetTest.parentTestId || testId;
    saveTestOverride(parentId, originalQIdx, oldQText, {
      question,
      options,
      correctOption,
      explanation
    });
    updateTestInAllCaches(parentId, originalQIdx, oldQText, {
      question,
      options,
      correctOption,
      explanation
    });

    try {
      await axios.patch(`https://mpsc-manager.onrender.com/api/custom-tests/${testId}/edit-question`, {
        questionIndex: originalQIdx,
        question,
        options,
        correctOption,
        explanation
      });
    } catch (e) {
      // Local fallback
    }
  };

  const toggleExpand = (id) => {
    setExpandedTestIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const fetchMistakes = async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    try {
      const deletedMistakes = JSON.parse(localStorage.getItem('mpsc_deleted_mistakes') || '[]');
      const res = await axios.get('https://mpsc-manager.onrender.com/api/custom-tests/all', { timeout: 7000 });
      if (res.data.success && Array.isArray(res.data.data)) {
        const remoteMistakes = res.data.data.filter(t => 
          t.isMistakeMock === true && 
          !deletedMistakes.includes(t.id) && 
          !deletedMistakes.includes(t._id) &&
          !deletedMistakes.includes(t.parentTestId)
        );
        
        // Merge with local cached mistakes without losing local questions
        const localCachedRaw = localStorage.getItem('mpsc_cached_mistakes');
        const localMistakes = localCachedRaw ? JSON.parse(localCachedRaw) : [];
        const validLocal = localMistakes.filter(m => 
          !deletedMistakes.includes(m.id) && 
          !deletedMistakes.includes(m._id) && 
          !deletedMistakes.includes(m.parentTestId)
        );

        const mergedMap = new Map();
        // Local first (contains latest user answers and explanations)
        validLocal.forEach(m => {
          if (m && (m.id || m._id)) {
            mergedMap.set(m.id || m._id, m);
          }
        });

        // Remote merge
        remoteMistakes.forEach(m => {
          const id = m.id || m._id;
          if (id) {
            if (!mergedMap.has(id)) {
              mergedMap.set(id, m);
            } else {
              const existing = mergedMap.get(id);
              // If remote has questions and existing didn't, or newer
              mergedMap.set(id, { ...existing, ...m, questions: (existing.questions && existing.questions.length > 0) ? existing.questions : m.questions });
            }
          }
        });

        const combined = Array.from(mergedMap.values()).map(m => applyTestOverrides(m, m.parentTestId || m.id || m._id));
        setMistakes(combined);
        try {
          localStorage.setItem('mpsc_cached_mistakes', JSON.stringify(combined));
        } catch (e) {}

        if (isManual) toast.success("मिस्टेक बुक अपडेट झाले! 🔄");
      }
    } catch (err) {
      console.warn("Backend mistakes sync notice:", err?.message);
      if (isManual) toast.error("सर्व्हरवरून लोड करण्यात अडचण आली, लोकल डेटा दाखवत आहे.");
    } finally {
      setLoading(false);
      if (isManual) setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMistakes();

    const handleMistakesUpdated = () => {
      try {
        const deletedMistakes = JSON.parse(localStorage.getItem('mpsc_deleted_mistakes') || '[]');
        const cached = localStorage.getItem('mpsc_cached_mistakes');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(m => 
              !deletedMistakes.includes(m.id) && 
              !deletedMistakes.includes(m._id) && 
              !deletedMistakes.includes(m.parentTestId)
            );
            setMistakes(valid.map(m => applyTestOverrides(m, m.parentTestId || m.id || m._id)));
          }
        }
      } catch (e) {}
    };

    window.addEventListener('mpsc_mistakes_updated', handleMistakesUpdated);
    window.addEventListener('storage', handleMistakesUpdated);
    window.addEventListener('focus', handleMistakesUpdated);

    return () => {
      window.removeEventListener('mpsc_mistakes_updated', handleMistakesUpdated);
      window.removeEventListener('storage', handleMistakesUpdated);
      window.removeEventListener('focus', handleMistakesUpdated);
    };
  }, []);

  const handleDeleteMistakeTest = async (testToDelete) => {
    if (!testToDelete) return;
    const targetId = testToDelete.id || testToDelete._id;

    // 1. Optimistic UI Update
    const updated = mistakes.filter(m => (m.id || m._id) !== targetId);
    setMistakes(updated);
    setDeletingTest(null);

    // 2. Remove from local caches and blacklist in mpsc_deleted_mistakes
    try {
      localStorage.setItem('mpsc_cached_mistakes', JSON.stringify(updated));

      const cachedMocks = JSON.parse(localStorage.getItem('mpsc_cached_mocks') || '[]');
      const filteredMocks = cachedMocks.filter(m => (m.id || m._id) !== targetId);
      localStorage.setItem('mpsc_cached_mocks', JSON.stringify(filteredMocks));

      const deletedMistakes = JSON.parse(localStorage.getItem('mpsc_deleted_mistakes') || '[]');
      [targetId, testToDelete.parentTestId].filter(Boolean).forEach(id => {
        if (!deletedMistakes.includes(id)) deletedMistakes.push(id);
      });
      localStorage.setItem('mpsc_deleted_mistakes', JSON.stringify(deletedMistakes));
    } catch (e) {}

    toast.success('मिस्टेक टेस्ट हटवली गेली! 🗑️');

    // 3. Remove from backend
    try {
      await axios.delete(`https://mpsc-manager.onrender.com/api/custom-tests/${targetId}`, { timeout: 6000 });
    } catch (err) {
      console.warn("Backend delete notice:", err?.message);
    }
  };

  let totalQuestionsWrong = 0;
  const topicErrorCounts = {};

  mistakes.forEach(m => {
    (m.questions || []).forEach(q => {
      totalQuestionsWrong += 1;
      const tName = (q.topic || q.subject || m.subject || 'General Studies').trim();
      topicErrorCounts[tName] = (topicErrorCounts[tName] || 0) + 1;
    });
  });

  const topMistakeTopics = Object.entries(topicErrorCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const allDistinctTopics = Object.keys(topicErrorCounts).slice(0, 8);

  const filteredMistakes = mistakes.filter(m => {
    const qList = m.questions || [];
    const matchesTopic = selectedTopic === 'ALL' || qList.some(q => 
      (q.topic || q.subject || m.subject || '').toLowerCase().includes(selectedTopic.toLowerCase())
    );

    const matchesSearch = !searchQuery.trim() ||
      (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      qList.some(q => (q.question || '').toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesTopic && matchesSearch;
  });

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '50px', animation: 'fadeIn 0.3s' }}>
      
      {/* 🌟 Header Banner */}
      <div 
        className="glass-card"
        style={{
          padding: '24px 28px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.85) 0%, rgba(15, 23, 42, 0.98) 100%)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          boxShadow: '0 20px 40px -15px rgba(239, 68, 68, 0.15)'
        }}
      >
        <div className="flex-row justify-between align-center" style={{ gap: '20px', flexWrap: 'wrap' }}>
          <div className="flex-col gap-2">
            <div className="flex-row align-center gap-2">
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.5px' }}>
                📕 मिस्टेक बुक (Mistake Book)
              </span>
              <span style={{
                background: 'linear-gradient(135deg, #ef4444, #b91c1c)',
                color: '#fff',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '12px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                Auto-Saved Errors
              </span>
            </div>
            <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.92rem', maxWidth: '620px', lineHeight: 1.5 }}>
              मॉक टेस्टमध्ये चुकलेले प्रश्न येथे आपोआप सेव्ह होतात. चुका समजून घ्या आणि पुन्हा टेस्ट देऊन चुकांवर मात करा!
            </p>
          </div>

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div 
              className="glass-card" 
              style={{ 
                padding: '14px 24px', 
                textAlign: 'center', 
                borderLeft: '4px solid var(--danger)',
                background: 'rgba(239, 68, 68, 0.08)',
                borderRadius: '16px'
              }}
            >
              <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--danger)' }}>{totalQuestionsWrong}</span>
              <br />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 600 }}>रिव्हिजनसाठी बाकी प्रश्न</span>
            </div>

            <button
              onClick={() => fetchMistakes(true)}
              className="btn"
              disabled={isRefreshing}
              title="रीफ्रेश करा"
              style={{
                padding: '10px 14px',
                background: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                color: 'var(--text-secondary)'
              }}
            >
              <FiRefreshCw size={15} className={isRefreshing ? 'animate-spin' : ''} />
              <span style={{ fontSize: '0.85rem' }}>रीफ्रेश</span>
            </button>
          </div>
        </div>
      </div>

      {/* 🔥 Most Frequent Mistake Topics Insight Banner */}
      {topMistakeTopics.length > 0 && (
        <div 
          className="glass-card"
          style={{
            padding: '18px 22px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(15, 23, 42, 0.6) 100%)',
            border: '1px solid rgba(239, 68, 68, 0.3)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.92rem', fontWeight: 800, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiAlertCircle /> 🔥 तुमचे सर्वाधिक चुकणारे मुख्य टॉपिक्स (Most Frequent Error Areas):
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              विषयावर क्लिक करून संबंधित प्रश्न फिल्टर करा
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {topMistakeTopics.map(([tName, count], idx) => {
              const isActive = selectedTopic === tName;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedTopic(isActive ? 'ALL' : tName)}
                  className="btn"
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    background: isActive ? 'var(--danger)' : 'rgba(239, 68, 68, 0.15)',
                    color: isActive ? '#fff' : 'var(--text-primary)',
                    border: '1px solid rgba(239, 68, 68, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                >
                  <span>{tName}</span>
                  <span style={{
                    background: isActive ? 'rgba(0,0,0,0.3)' : 'rgba(239, 68, 68, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '10px',
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}>
                    {count} चुका
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '14px 18px', 
          borderRadius: '16px', 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px' 
        }}
      >
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="🔍 मिस्टेक बुकमध्ये प्रश्न किंवा विषय शोधा..."
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '10px 14px',
              borderRadius: '10px',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              outline: 'none'
            }}
          />
          {selectedTopic !== 'ALL' && (
            <button
              onClick={() => setSelectedTopic('ALL')}
              className="btn"
              style={{
                padding: '8px 14px',
                fontSize: '0.82rem',
                background: 'rgba(255, 255, 255, 0.08)',
                color: 'var(--text-secondary)',
                borderRadius: '8px'
              }}
            >
              फिल्टर काढा ✕
            </button>
          )}
        </div>

        {allDistinctTopics.length > 0 && (
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
            <button
              onClick={() => setSelectedTopic('ALL')}
              style={{
                padding: '5px 12px',
                borderRadius: '8px',
                border: 'none',
                background: selectedTopic === 'ALL' ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                color: selectedTopic === 'ALL' ? '#fff' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap'
              }}
            >
              सर्व विषय ({mistakes.length})
            </button>
            {allDistinctTopics.map((topKey, i) => (
              <button
                key={i}
                onClick={() => setSelectedTopic(topKey)}
                style={{
                  padding: '5px 12px',
                  borderRadius: '8px',
                  border: 'none',
                  background: selectedTopic === topKey ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                  color: selectedTopic === topKey ? '#fff' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {topKey} ({topicErrorCounts[topKey] || 0})
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-col gap-4">
        <div className="flex-row justify-between align-center" style={{ padding: '0 4px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            चुकांचे सराव संच ({filteredMistakes.length})
          </h2>
          {filteredMistakes.length > 0 && (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              प्रश्नांची उत्तरे पाहण्यासाठी कार्ड उघडा
            </span>
          )}
        </div>

        {loading && mistakes.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: '20px' }}>
            <div className="premium-loader" style={{ width: '50px', height: '50px' }}>
              <div className="ring"></div><div className="ring"></div><div className="ring"></div>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 600 }}>मिस्टेक रेकॉर्ड्स लोड होत आहेत...</p>
          </div>
        ) : mistakes.length === 0 ? (
          <div className="glass-card" style={{ padding: '50px 30px', textAlign: 'center', borderRadius: '20px' }}>
            <FiCheckCircle size={52} color="#10b981" style={{ marginBottom: '16px' }} />
            <h3 style={{ fontSize: '1.3rem', color: 'var(--text-primary)', marginBottom: '8px', fontWeight: 800 }}>
              उत्कृष्ट! सध्या कोणतीही चूक बाकी नाही 🎯
            </h3>
            <p style={{ color: 'var(--text-secondary)', maxWidth: '480px', margin: '0 auto 20px auto', fontSize: '0.9rem', lineHeight: 1.5 }}>
              जेव्हा तुम्ही कोणतीही मॉक किंवा सराव टेस्ट द्याल, तेव्हा चुकलेले प्रश्न आपोआप इथे रिव्हिजनसाठी सेव्ह होतील.
            </p>
            <button 
              onClick={() => navigate('/mock-tests')} 
              className="btn btn-primary"
              style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 700 }}
            >
              मॉक टेस्ट सोडवा 🚀
            </button>
          </div>
        ) : filteredMistakes.length === 0 ? (
          <div className="glass-card" style={{ padding: '40px 20px', textAlign: 'center', borderRadius: '16px' }}>
            <p style={{ color: 'var(--text-muted)', margin: '0 0 12px 0', fontSize: '0.95rem' }}>
              🔍 '<strong>{searchQuery || selectedTopic}</strong>' या फिल्टरमध्ये कोणतेही प्रश्न सापडले नाहीत.
            </p>
            <button
              onClick={() => { setSelectedTopic('ALL'); setSearchQuery(''); }}
              className="btn btn-primary"
              style={{ padding: '6px 16px', fontSize: '0.85rem' }}
            >
              सर्व प्रश्न पहा
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredMistakes.map((m, mIdx) => {
              const testId = m.id || m._id;
              const isExpanded = expandedTestIds.has(testId);
              const qList = Array.isArray(m.questions) ? m.questions : [];

              return (
                <div 
                  key={testId || mIdx} 
                  className="glass-card" 
                  style={{ 
                    padding: '20px 24px', 
                    borderLeft: '4.5px solid var(--danger)', 
                    borderRadius: '18px',
                    background: 'var(--bg-secondary)',
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '16px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {/* Card Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                    <div className="flex-col gap-1">
                      <div className="flex-row align-center gap-2" style={{ flexWrap: 'wrap' }}>
                        <h3 style={{ fontSize: '1.2rem', margin: 0, color: 'var(--text-primary)', fontWeight: 800 }}>
                          {m.title || 'MPSC चुकलेले प्रश्न'}
                        </h3>
                        <span style={{ 
                          background: 'rgba(239, 68, 68, 0.15)', 
                          color: 'var(--danger)', 
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '6px',
                          border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                          {qList.length} प्रश्न
                        </span>
                      </div>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                        विषय: <strong style={{ color: 'var(--text-secondary)' }}>{m.subject || 'सामान्य अध्ययन'}</strong> 
                        {m.createdAt && ` • ${new Date(m.createdAt).toLocaleDateString('mr-IN')}`}
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button 
                        onClick={() => toggleExpand(testId)} 
                        className="btn"
                        style={{ 
                          padding: '8px 14px', 
                          background: 'rgba(255, 255, 255, 0.06)', 
                          color: 'var(--text-primary)', 
                          borderRadius: '10px',
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        {isExpanded ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
                        <span>{isExpanded ? 'प्रश्नांची यादी लपवा' : 'प्रश्न व उत्तरे पहा'}</span>
                      </button>

                      <button 
                        onClick={() => setDeletingTest(m)} 
                        className="btn task-action-btn" 
                        title="टेस्ट हटवा" 
                        style={{ 
                          padding: '8px 14px', 
                          background: 'rgba(239, 68, 68, 0.1)', 
                          color: 'var(--danger)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '6px',
                          borderRadius: '10px',
                          fontSize: '0.82rem'
                        }}
                      >
                        <FiTrash2 size={15} />
                        <span className="desktop-text">हटवा</span>
                      </button>

                      <button 
                        className="btn btn-primary" 
                        onClick={() => navigate(`/test/${testId}`)} 
                        style={{ 
                          padding: '8px 18px', 
                          background: 'linear-gradient(135deg, #ef4444, #b91c1c)', 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          borderRadius: '10px',
                          fontWeight: 700,
                          fontSize: '0.88rem',
                          boxShadow: '0 4px 15px rgba(239, 68, 68, 0.35)'
                        }}
                      >
                        <FiPlayCircle size={16} />
                        <span>रिव्हिजन टेस्ट द्या</span>
                      </button>
                    </div>
                  </div>

                  {/* Accordion: Question Review List */}
                  {isExpanded && (
                    <div style={{ 
                      marginTop: '10px', 
                      paddingTop: '16px', 
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}>
                      <div className="flex-row justify-between align-center">
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                          📋 या टेस्टमध्ये चुकलेले सर्व {qList.length} प्रश्न:
                        </span>
                      </div>

                      {qList.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>प्रश्नांची माहिती उपलब्ध नाही.</p>
                      ) : (
                        qList.map((q, qIdx) => {
                          const userAns = q.userSelectedOption;
                          const correctAns = q.correctOption;
                          const options = Array.isArray(q.options) ? q.options : [];

                          return (
                            <div 
                              key={qIdx}
                              style={{
                                padding: '14px 16px',
                                borderRadius: '12px',
                                background: 'rgba(0, 0, 0, 0.25)',
                                border: '1px solid rgba(255, 255, 255, 0.06)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
                                <span style={{ fontWeight: 800, color: 'var(--danger)', fontSize: '0.85rem' }}>
                                  प्रश्न {qIdx + 1}.
                                </span>
                                {q.topic && (
                                  <span style={{ fontSize: '0.72rem', color: '#94a3b8', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '6px' }}>
                                    {q.topic}
                                  </span>
                                )}
                              </div>

                              <p style={{ margin: 0, fontSize: '0.92rem', color: '#f1f5f9', fontWeight: 600, lineHeight: 1.5 }}>
                                {q.question}
                              </p>

                              {/* Options */}
                              {options.length > 0 && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '8px', marginTop: '4px' }}>
                                  {options.map((opt, oIdx) => {
                                    const isUserChoice = userAns === oIdx;
                                    const isCorrect = correctAns === oIdx;

                                    let optBg = 'rgba(255, 255, 255, 0.03)';
                                    let optBorder = 'rgba(255, 255, 255, 0.08)';
                                    let optColor = '#cbd5e1';

                                    if (isCorrect) {
                                      optBg = 'rgba(16, 185, 129, 0.15)';
                                      optBorder = 'rgba(16, 185, 129, 0.5)';
                                      optColor = '#34d399';
                                    } else if (isUserChoice) {
                                      optBg = 'rgba(239, 68, 68, 0.15)';
                                      optBorder = 'rgba(239, 68, 68, 0.5)';
                                      optColor = '#f87171';
                                    }

                                    return (
                                      <div 
                                        key={oIdx}
                                        style={{
                                          padding: '8px 12px',
                                          borderRadius: '8px',
                                          background: optBg,
                                          border: `1px solid ${optBorder}`,
                                          color: optColor,
                                          fontSize: '0.85rem',
                                          display: 'flex',
                                          justifyContent: 'space-between',
                                          alignItems: 'center',
                                          gap: '8px'
                                        }}
                                      >
                                        <span><strong>({oIdx + 1})</strong> {opt}</span>
                                        {isCorrect && <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#34d399', whiteSpace: 'nowrap' }}>✅ योग्य उत्तर</span>}
                                        {isUserChoice && !isCorrect && <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#f87171', whiteSpace: 'nowrap' }}>❌ तुमचे उत्तर</span>}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Explanation */}
                              {q.explanation && (
                                <div style={{
                                  marginTop: '4px',
                                  padding: '8px 12px',
                                  borderRadius: '8px',
                                  background: 'rgba(59, 130, 246, 0.08)',
                                  border: '1px solid rgba(59, 130, 246, 0.2)',
                                  fontSize: '0.82rem',
                                  color: '#93c5fd',
                                  lineHeight: 1.4
                                }}>
                                  💡 <strong>स्पष्टीकरण:</strong> {q.explanation}
                                </div>
                              )}

                              {/* Edit Question & Options Button */}
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                                <button
                                  type="button"
                                  onClick={() => setEditingQuestionModalData({
                                    testId: m.id || m._id,
                                    qIndex: qIdx,
                                    question: q.question,
                                    options: q.options || [],
                                    correctOption: typeof q.correctOption === 'number' ? q.correctOption : 0,
                                    explanation: q.explanation || ''
                                  })}
                                  className="btn"
                                  style={{
                                    padding: '5px 12px',
                                    fontSize: '0.78rem',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    border: '1px solid rgba(59, 130, 246, 0.3)',
                                    color: '#93c5fd',
                                    borderRadius: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    cursor: 'pointer'
                                  }}
                                  title="हा प्रश्न किंवा पर्याय एडिट करा"
                                >
                                  <FiEdit2 size={12} /> ✏️ प्रश्न / पर्याय एडिट करा
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deletingTest && (
        <div className="modal-overlay" onClick={() => setDeletingTest(null)}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: 'var(--bg-primary)', 
              border: '1px solid var(--danger)', 
              textAlign: 'left', 
              minWidth: '320px',
              maxWidth: '460px',
              borderRadius: '20px'
            }}
          >
            <h2 style={{ fontSize: '1.25rem', marginBottom: '14px', color: 'var(--danger)', fontWeight: 800 }}>
              ⚠️ मिस्टेक टेस्ट हटवायची आहे का?
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '22px', fontSize: '0.9rem', lineHeight: 1.5 }}>
              तुम्हाला खरोखर <strong>"{deletingTest.title}"</strong> ही मिस्टेक टेस्ट हटवायची आहे का? यातील रिव्हिजन डेटा नष्ट होईल.
            </p>
            <div className="flex-row gap-3">
              <button 
                type="button" 
                onClick={() => setDeletingTest(null)} 
                className="btn" 
                style={{ flex: 1, background: 'var(--glass-bg)', borderRadius: '10px' }}
              >
                रद्द करा
              </button>
              <button 
                type="button" 
                onClick={() => handleDeleteMistakeTest(deletingTest)} 
                className="btn btn-primary" 
                style={{ 
                  flex: 1, 
                  background: 'linear-gradient(135deg, var(--danger), #b91c1c)', 
                  boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)',
                  borderRadius: '10px',
                  fontWeight: 700
                }}
              >
                होय, हटवा
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Question & Options Modal */}
      <EditQuestionModal
        isOpen={Boolean(editingQuestionModalData)}
        initialData={editingQuestionModalData}
        onClose={() => setEditingQuestionModalData(null)}
        onSave={handleSaveQuestionEdit}
      />

    </div>
  );
};

export default MistakeBook;
