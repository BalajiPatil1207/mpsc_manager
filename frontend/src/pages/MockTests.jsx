import React, { useState, useEffect } from 'react';
import { FiTarget, FiPlay, FiShare2, FiEdit, FiTrash2, FiSearch, FiCalendar, FiClock, FiAward, FiCheckCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { auth } from '../firebase';
import { toast } from 'react-hot-toast';
import { MPSC_SEED_MOCKS } from '../data/mpscMockTestsSeed';
import { generateDynamicMpscTest } from '../utils/dynamicMockGenerator';

const MockTests = () => {
  const [hasPlan, setHasPlan] = useState(false);
  const [history, setHistory] = useState(() => {
    try {
      const cached = localStorage.getItem('mpsc_cached_mocks');
      if (cached) {
        const parsed = JSON.parse(cached);
        const seedIds = new Set(MPSC_SEED_MOCKS.map(s => s._id || s.id));
        return [...MPSC_SEED_MOCKS, ...parsed.filter(m => !seedIds.has(m._id || m.id))];
      }
      return MPSC_SEED_MOCKS;
    } catch (e) {
      return MPSC_SEED_MOCKS;
    }
  });

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSchemeFilter, setSelectedSchemeFilter] = useState('all');
  const [editingTest, setEditingTest] = useState(null);
  const [deletingTest, setDeletingTest] = useState(null);
  const [solvedSet, setSolvedSet] = useState(() => {
    try {
      const solved = JSON.parse(localStorage.getItem('mpsc_solved_tests') || '[]');
      const hist = JSON.parse(localStorage.getItem('mpsc_test_history') || '[]');
      return new Set([...solved, ...hist.map(h => h.testId).filter(Boolean)]);
    } catch (e) {
      return new Set();
    }
  });

  useEffect(() => {
    const updateSolved = () => {
      try {
        const solved = JSON.parse(localStorage.getItem('mpsc_solved_tests') || '[]');
        const hist = JSON.parse(localStorage.getItem('mpsc_test_history') || '[]');
        setSolvedSet(new Set([...solved, ...hist.map(h => h.testId).filter(Boolean)]));
      } catch (e) {}
    };
    window.addEventListener('focus', updateSolved);
    window.addEventListener('storage', updateSolved);
    window.addEventListener('mpsc_test_submitted', updateSolved);
    return () => {
      window.removeEventListener('focus', updateSolved);
      window.removeEventListener('storage', updateSolved);
      window.removeEventListener('mpsc_test_submitted', updateSolved);
    };
  }, []);

  // Dynamic Test Generator State
  const [showDynamicModal, setShowDynamicModal] = useState(false);
  const [genSubject, setGenSubject] = useState('all');
  const [genCount, setGenCount] = useState(25);
  const [genScheme, setGenScheme] = useState('mpsc_rajyaseva');
  const [genTime, setGenTime] = useState(30);
  const [isGenerating, setIsGenerating] = useState(false);

  const navigate = useNavigate();

  const handleCreateDynamicTest = async (e) => {
    if (e) e.preventDefault();
    setIsGenerating(true);
    const toastId = toast.loading('नवीन डायनॅमिक टेस्ट तयार करत आहे...');
    try {
      const nextMockNum = history.length + 1;
      const newTest = generateDynamicMpscTest({
        subject: genSubject,
        questionCount: Number(genCount),
        markingScheme: genScheme,
        timeLimit: Number(genTime),
        testIndex: nextMockNum
      });

      // Update local state and cache immediately (0ms latency!)
      const updatedHistory = [newTest, ...history];
      setHistory(updatedHistory);
      try {
        localStorage.setItem('mpsc_cached_mocks', JSON.stringify(updatedHistory));
      } catch (err) {}

      // Asynchronously persist to backend Firestore
      const usr = auth.currentUser;
      axios.post('https://mpsc-manager.onrender.com/api/custom-tests', {
        title: `Mock Test ${nextMockNum}`,
        subject: newTest.subject,
        topic: newTest.topic,
        timeLimit: newTest.timeLimit,
        questions: newTest.questions,
        markingScheme: newTest.markingScheme,
        totalMarks: newTest.totalMarks,
        examDate: newTest.examDate,
        createdBy: usr?.uid || 'dynamic_engine',
        creatorName: usr?.displayName ? usr.displayName.split(' ')[0] : 'Dynamic AI'
      }).catch(err => {
        console.warn("Backend dynamic test sync notice:", err?.message);
      });

      toast.success(`Mock Test ${nextMockNum} तयार झाली! 🎯`, { id: toastId });
      setShowDynamicModal(false);
      navigate(`/test/${newTest.id}`);
    } catch (err) {
      toast.error('डायनॅमिक टेस्ट तयार करताना त्रुटी आली: ' + err.message, { id: toastId });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleQuickDynamicTest = () => {
    const nextMockNum = history.length + 1;
    const newTest = generateDynamicMpscTest({
      subject: 'all',
      questionCount: 20,
      markingScheme: 'mpsc_rajyaseva',
      timeLimit: 25,
      testIndex: nextMockNum
    });

    const updatedHistory = [newTest, ...history];
    setHistory(updatedHistory);
    try {
      localStorage.setItem('mpsc_cached_mocks', JSON.stringify(updatedHistory));
    } catch (err) {}

    const usr = auth.currentUser;
    axios.post('https://mpsc-manager.onrender.com/api/custom-tests', {
      title: `Mock Test ${nextMockNum}`,
      subject: newTest.subject,
      topic: newTest.topic,
      timeLimit: newTest.timeLimit,
      questions: newTest.questions,
      markingScheme: newTest.markingScheme,
      totalMarks: newTest.totalMarks,
      examDate: newTest.examDate,
      createdBy: usr?.uid || 'dynamic_engine',
      creatorName: 'Dynamic Engine'
    }).catch(err => console.warn(err));

    toast.success(`Mock Test ${nextMockNum} तयार झाली! सुरू करत आहे... 🚀`);
    navigate(`/test/${newTest.id}`);
  };

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

  const copyShareLink = (testId) => {
    const link = `${window.location.origin}/test/${testId}`;
    navigator.clipboard.writeText(link);
    toast.success("Test link copied to clipboard! 📋");
  };

  useEffect(() => {
    let isMounted = true;

    const fetchPlan = async () => {
      try {
        const uid = auth.currentUser?.uid || 'testUser';
        const res = await axios.get(`https://mpsc-manager.onrender.com/api/plans/user/${uid}`, { timeout: 4000 });
        if (isMounted && res.data.success && res.data.hasPlan) {
          setHasPlan(true);
        }
      } catch (e) {
        // graceful fallback
      }
    };
    
    const fetchHistory = async () => {
      try {
        const res = await axios.get('https://mpsc-manager.onrender.com/api/custom-tests/all', { timeout: 6000 });
        if (isMounted && res.data.success) {
          // Only show Mock/Mega tests (not practice tests)
          const remoteMocks = res.data.data.filter(t => {
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
          
          const seedIds = new Set(MPSC_SEED_MOCKS.map(s => s._id || s.id));
          const cachedRaw = localStorage.getItem('mpsc_cached_mocks');
          const localMocks = cachedRaw ? JSON.parse(cachedRaw) : [];
          
          const localMocksMap = new Map();
          localMocks.forEach(l => localMocksMap.set(l._id || l.id, l));

          const solvedList = JSON.parse(localStorage.getItem('mpsc_solved_tests') || '[]');
          const hist = JSON.parse(localStorage.getItem('mpsc_test_history') || '[]');
          const solvedSetInternal = new Set([
            ...solvedList,
            ...hist.map(h => h.testId).filter(Boolean)
          ]);

          const combinedMap = new Map();
          
          // 1. Seed Mocks (Base)
          MPSC_SEED_MOCKS.forEach(s => {
            const id = s._id || s.id;
            const local = localMocksMap.get(id);
            const inHist = hist.some(h => (h.testId === id) || (h.title && s.title && h.title.trim().toLowerCase() === s.title.trim().toLowerCase()));
            const isSolved = Boolean(local?.isSolved || solvedSetInternal.has(id) || inHist);
            combinedMap.set(id, { ...s, ...local, isSolved });
          });

          // 2. Remote Mocks from Backend
          remoteMocks.forEach(m => {
            const id = m._id || m.id;
            const existing = combinedMap.get(id);
            const local = localMocksMap.get(id);
            const inHist = hist.some(h => (h.testId === id) || (h.title && m.title && h.title.trim().toLowerCase() === m.title.trim().toLowerCase()));
            const isSolved = Boolean(existing?.isSolved || local?.isSolved || m.isSolved || solvedSetInternal.has(id) || inHist);
            combinedMap.set(id, {
              ...m,
              ...existing,
              ...local,
              isSolved,
              attemptedBy: Array.from(new Set([
                ...(Array.isArray(m.attemptedBy) ? m.attemptedBy : []),
                ...(Array.isArray(existing?.attemptedBy) ? existing.attemptedBy : []),
                ...(Array.isArray(local?.attemptedBy) ? local.attemptedBy : []),
                ...(isSolved ? ['anonymous'] : [])
              ]))
            });
          });

          // 3. Local Dynamic Mocks
          localMocks.forEach(l => {
            const id = l._id || l.id;
            if (!combinedMap.has(id)) {
              const inHist = hist.some(h => (h.testId === id) || (h.title && l.title && h.title.trim().toLowerCase() === l.title.trim().toLowerCase()));
              combinedMap.set(id, {
                ...l,
                isSolved: Boolean(l.isSolved || solvedSetInternal.has(id) || inHist)
              });
            }
          });

          const combined = Array.from(combinedMap.values());
          setHistory(combined);
          try {
            localStorage.setItem('mpsc_cached_mocks', JSON.stringify(combined));
          } catch(e) {}
        }
      } catch (e) {
        console.warn("History fetch fallback", e?.message);
      }
    };

    fetchPlan();
    fetchHistory();

    return () => {
      isMounted = false;
    };
  }, []);

  const currentUser = auth.currentUser?.uid || 'anonymous';

  const isTestSolved = (test) => {
    if (!test) return false;
    const tId = test._id || test.id;
    if (test.isSolved) return true;
    if (tId && solvedSet.has(tId)) return true;
    if (test.id && solvedSet.has(test.id)) return true;
    if (test._id && solvedSet.has(test._id)) return true;

    if (test.attemptedBy && Array.isArray(test.attemptedBy)) {
      if (currentUser && test.attemptedBy.includes(currentUser)) return true;
      if (test.attemptedBy.includes('anonymous') || test.attemptedBy.length > 0) return true;
    }

    try {
      const solvedList = JSON.parse(localStorage.getItem('mpsc_solved_tests') || '[]');
      if (tId && solvedList.includes(tId)) return true;
      if (test.id && solvedList.includes(test.id)) return true;
      if (test._id && solvedList.includes(test._id)) return true;
    } catch(e) {}

    try {
      const hist = JSON.parse(localStorage.getItem('mpsc_test_history') || '[]');
      const inHist = hist.some(h => 
        (h.testId && (h.testId === tId || h.testId === test.id || h.testId === test._id)) ||
        (h.title && test.title && h.title.trim().toLowerCase() === test.title.trim().toLowerCase())
      );
      if (inHist) return true;
    } catch(e) {}

    return false;
  };

  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'unsolved' | 'solved'

  const normalizeDateKey = (test) => {
    if (!test) return '';
    if (test.formattedDate) return test.formattedDate;
    if (test.createdAt) {
      try {
        const d = new Date(test.createdAt);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
      } catch (e) {}
    }
    if (test.examDate) {
      const raw = String(test.examDate).trim();
      const converted = raw.replace(/[०-९]/g, d => '०१२३४५६७८९'.indexOf(d));
      const match = converted.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
      if (match) {
        const d = match[1].padStart(2, '0');
        const m = match[2].padStart(2, '0');
        let y = match[3];
        if (y.length === 2) y = '20' + y;
        return `${y}-${m}-${d}`;
      }
    }
    return '';
  };

  // 🌟 DAILY 1 MOCK TEST RULE:
  // Deduplicates multiple tests on the same date so there is STRICTLY 1 Official Mock Test per day!
  const todayIso = new Date().toISOString().split('T')[0];
  const dailyMocksMap = new Map();

  history.forEach(test => {
    const dateKey = normalizeDateKey(test) || 'unknown';
    if (!dailyMocksMap.has(dateKey)) {
      dailyMocksMap.set(dateKey, test);
    } else {
      const existing = dailyMocksMap.get(dateKey);
      const existingSolved = isTestSolved(existing);
      const currentSolved = isTestSolved(test);

      // Prioritize solved test so user progress is never lost
      if (currentSolved && !existingSolved) {
        dailyMocksMap.set(dateKey, test);
      } else if (!existingSolved && !currentSolved) {
        // Pick the test with more questions (Full Syllabus Mega Mock)
        const exQ = existing.questions?.length || 0;
        const curQ = test.questions?.length || 0;
        if (curQ > exQ) {
          dailyMocksMap.set(dateKey, test);
        }
      }
    }
  });

  // Sort daily tests descending by date (Today first, then previous days)
  const dailyList = Array.from(dailyMocksMap.values()).sort((a, b) => {
    const dateA = normalizeDateKey(a) || '';
    const dateB = normalizeDateKey(b) || '';
    return dateB.localeCompare(dateA);
  });

  // Number the daily tests sequentially (Mock Test 1 = Today, Mock Test 2 = Yesterday, etc.)
  const indexedHistory = dailyList.map((item, index) => ({
    ...item,
    permanentIndex: index + 1,
    isTodayMock: normalizeDateKey(item) === todayIso
  }));

  // Flat filtered list with stable numbering
  const filteredHistory = indexedHistory
    .filter(h => {
      const solved = isTestSolved(h);
      if (statusFilter === 'unsolved' && solved) return false;
      if (statusFilter === 'solved' && !solved) return false;
      if (selectedSchemeFilter === 'rajyaseva' && h.markingScheme === 'group_c') return false;
      if (selectedSchemeFilter === 'group_c' && h.markingScheme !== 'group_c') return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        (h.title || '').toLowerCase().includes(q) ||
        (h.subject || '').toLowerCase().includes(q) ||
        (h.topic || '').toLowerCase().includes(q) ||
        `mock test ${h.permanentIndex}`.includes(q)
      );
    });

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px', animation: 'fadeIn 0.3s' }}>
      
      {/* 🌟 Header Banner: MPSC Mock Exam Simulator + OMR */}
      <div 
        className="glass-card"
        style={{
          padding: '24px 28px',
          borderRadius: '24px',
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.5)'
        }}
      >
        <div className="flex-row justify-between align-center" style={{ gap: '16px', flexWrap: 'wrap' }}>
          <div className="flex-col gap-2">
            <div className="flex-row align-center gap-2">
              <span style={{ fontSize: '1.75rem', fontWeight: 900, color: '#f8fafc', letterSpacing: '-0.5px' }}>
                🎯 MPSC महा-मॉक परीक्षा सिम्युलेटर
              </span>
              <span style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: '#fff',
                fontSize: '0.72rem',
                fontWeight: 800,
                padding: '3px 10px',
                borderRadius: '12px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                MPSC 2027 Pattern
              </span>
            </div>
            <p style={{ color: '#94a3b8', margin: 0, fontSize: '0.92rem', maxWidth: '650px', lineHeight: 1.5 }}>
              महाराष्ट्र लोकसेवा आयोगाच्या अधिकृत निगेटिव्ह मार्किंगसह (<strong style={{ color: '#4ade80' }}>+२.००</strong> बरोबर उत्तरासाठी, <strong style={{ color: '#f87171' }}>-०.६६</strong> चुकीच्या उत्तरासाठी / १:३) आणि प्रत्यक्ष <strong style={{ color: '#60a5fa' }}>OMR शीट सिम्युलेटर</strong> सह सराव करा.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <button 
              onClick={() => setShowDynamicModal(true)} 
              className="btn" 
              style={{ 
                padding: '12px 22px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                borderRadius: '14px',
                fontWeight: 800,
                fontSize: '0.95rem',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.2s transform'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              ⚡ नवीन डायनॅमिक टेस्ट बनवा
            </button>

            <button 
              onClick={handleQuickDynamicTest} 
              className="btn" 
              style={{ 
                padding: '12px 18px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '0.9rem',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(245, 158, 11, 0.3)'
              }}
              title="२० रँडम प्रश्नांची त्वरित टेस्ट सुरू करा"
            >
              🎲 त्वरित २० Qs
            </button>

            <button 
              onClick={() => navigate('/test-maker')} 
              className="btn btn-outline" 
              style={{ 
                padding: '12px 18px', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                borderRadius: '14px',
                fontWeight: 700,
                fontSize: '0.9rem',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#cbd5e1'
              }}
            >
              + कस्टम JSON
            </button>
          </div>
        </div>

        {/* Feature Badges Row */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '18px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1', background: 'rgba(255, 255, 255, 0.05)', padding: '5px 12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span>⭕</span> <strong>MPSC OMR शीट</strong> (१, २, ३, ४ वर्तुळे)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1', background: 'rgba(255, 255, 255, 0.05)', padding: '5px 12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span>⚡</span> <strong>+२.०० / -०.६६</strong> (१/३ निगेटिव्ह गुण)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1', background: 'rgba(255, 255, 255, 0.05)', padding: '5px 12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span>🎯</span> <strong>+१.०० / -०.२५</strong> (सरळसेवा / गट-क पर्याय)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#cbd5e1', background: 'rgba(255, 255, 255, 0.05)', padding: '5px 12px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
            <span>📖</span> <strong>सविस्तर संदर्भ व स्पष्टीकरण</strong>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex-row justify-between align-center" style={{ gap: '14px', flexWrap: 'wrap' }}>
        
        {/* Search Input */}
        <div style={{
          flex: 1, minWidth: '260px',
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'var(--bg-secondary)', border: '1.5px solid var(--border-color)',
          borderRadius: '14px', padding: '10px 16px'
        }}>
          <FiSearch size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="टेस्टचे नाव, विषय, घटक किंवा तारीख शोधा..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--text-primary)', fontSize: '0.92rem'
            }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem', lineHeight: 1, padding: 0 }}>✕</button>
          )}
        </div>

        {/* Status Filter Tabs (All / Remaining / Completed) */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: statusFilter === 'all' ? 'var(--accent-primary)' : 'transparent',
              color: statusFilter === 'all' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            सर्व ({indexedHistory.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('unsolved')}
            style={{
              padding: '6px 14px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: statusFilter === 'unsolved' ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'transparent',
              color: statusFilter === 'unsolved' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            ⚡ बाकी ({indexedHistory.filter(h => !isTestSolved(h)).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter('solved')}
            style={{
              padding: '6px 14px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: statusFilter === 'solved' ? 'linear-gradient(135deg, #10b981, #059669)' : 'transparent',
              color: statusFilter === 'solved' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            ✅ सोडवलेल्या ({indexedHistory.filter(h => isTestSolved(h)).length})
          </button>
        </div>

        {/* Filter Pills for Marking Scheme */}
        <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-secondary)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <button
            type="button"
            onClick={() => setSelectedSchemeFilter('all')}
            style={{
              padding: '6px 14px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: selectedSchemeFilter === 'all' ? 'var(--accent-primary)' : 'transparent',
              color: selectedSchemeFilter === 'all' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            सर्व पॅटर्न
          </button>
          <button
            type="button"
            onClick={() => setSelectedSchemeFilter('rajyaseva')}
            style={{
              padding: '6px 14px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: selectedSchemeFilter === 'rajyaseva' ? 'var(--accent-primary)' : 'transparent',
              color: selectedSchemeFilter === 'rajyaseva' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            MPSC (+२/-०.६६)
          </button>
          <button
            type="button"
            onClick={() => setSelectedSchemeFilter('group_c')}
            style={{
              padding: '6px 14px',
              borderRadius: '9px',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: selectedSchemeFilter === 'group_c' ? 'var(--accent-primary)' : 'transparent',
              color: selectedSchemeFilter === 'group_c' ? '#fff' : 'var(--text-secondary)',
              transition: 'all 0.2s'
            }}
          >
            गट-क (+१/-०.२५)
          </button>
        </div>
      </div>

      {/* Test Cards Grid */}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="flex-row justify-between align-center" style={{ padding: '0 4px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.88rem', fontWeight: 600 }}>
              📅 {filteredHistory.length} दैनिक मॉक परीक्षा (दररोज फक्त १ परीक्षा)
            </span>
          </div>

          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '18px' }}>
            {filteredHistory.map((test, idx) => {
              const isSolved = isTestSolved(test);
              const qCount = test.questions?.length || 0;
              const isGroupC = test.markingScheme === 'group_c';
              const marksPerQ = isGroupC ? 1.0 : 2.0;
              const totalMarks = test.totalMarks || (qCount * marksPerQ);
              
              // Extract date if present in title (e.g. "१२/१०/२०२६" or "12/10/2026")
              const dateInTitleMatch = test.title?.match(/[\u0966-\u096F0-9]{1,2}[\/\-\.][\u0966-\u096F0-9]{1,2}[\/\-\.][\u0966-\u096F0-9]{2,4}/);
              const extractedDate = dateInTitleMatch ? dateInTitleMatch[0] : null;
              const baseDate = test.examDate || extractedDate || (test.createdAt ? new Date(test.createdAt).toLocaleDateString('mr-IN') : '19 ऑक्टोबर 2026');
              const displayDate = test.isTodayMock ? `${baseDate} (आज)` : baseDate;

              // Clean topic / subtitle by removing dates completely
              const rawTitle = test.title || '';
              const cleanSubtitle = (test.topic || rawTitle)
                .replace(/🔥\s*/g, '')
                .replace(/Automatic Mega Test\s*\(\d+\s*Qs\)/gi, 'मेगा सराव परीक्षा (१०० प्रश्न)')
                .replace(/\s*-\s*[\u0966-\u096F0-9]{1,2}[\/\-\.][\u0966-\u096F0-9]{1,2}[\/\-\.][\u0966-\u096F0-9]{2,4}/g, '')
                .replace(/\s*-\s*\d{1,2}\s+(जानेवारी|फेब्रुवारी|मार्च|एप्रिल|मे|जून|जुलै|ऑगस्ट|सप्टेंबर|ऑक्टोबर|नोव्हेंबर|डिसेंबर)\s+\d{2,4}/gi, '')
                .trim();

              return (
                <div
                  key={test._id || test.id}
                  className="glass-card"
                  style={{
                    padding: '20px 22px',
                    borderRadius: '18px',
                    border: isSolved 
                      ? '1.5px solid rgba(34, 197, 94, 0.45)' 
                      : (test.isTodayMock ? '1.5px solid rgba(245, 158, 11, 0.5)' : '1px solid rgba(255, 255, 255, 0.1)'),
                    background: isSolved 
                      ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08), rgba(15, 23, 42, 0.85))' 
                      : (test.isTodayMock ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(15, 23, 42, 0.9))' : 'var(--bg-secondary)'),
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '14px',
                    transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: test.isTodayMock ? '0 10px 30px rgba(245, 158, 11, 0.15)' : '0 8px 24px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {/* Top Bar: Subject Badge + Dynamic Badge + Solved Badge + Exam Date */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: 'var(--accent-primary)',
                        background: 'var(--accent-glow)',
                        padding: '3px 10px',
                        borderRadius: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {test.subject || 'MPSC General Studies'}
                      </span>
                      {test.isTodayMock && (
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: '#f59e0b',
                          background: 'rgba(245, 158, 11, 0.2)',
                          border: '1px solid rgba(245, 158, 11, 0.45)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          🔥 आजची दैनिक परीक्षा
                        </span>
                      )}
                      {test.isDynamic && (
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: '#10b981',
                          background: 'rgba(16, 185, 129, 0.15)',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          ⚡ डायनॅमिक
                        </span>
                      )}
                      {isSolved && (
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 800,
                          color: '#10b981',
                          background: 'rgba(16, 185, 129, 0.2)',
                          border: '1px solid rgba(16, 185, 129, 0.45)',
                          padding: '2px 8px',
                          borderRadius: '6px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <FiCheckCircle size={11} /> सोडवली (Done)
                        </span>
                      )}
                      {(() => {
                        const sRaw = localStorage.getItem(`mpsc_active_test_${test._id || test.id}`);
                        if (sRaw && !isSolved) {
                          try {
                            const parsedSession = JSON.parse(sRaw);
                            const ansCount = Object.keys(parsedSession.answers || {}).length;
                            if (ansCount > 0) {
                              return (
                                <span style={{
                                  fontSize: '0.68rem',
                                  fontWeight: 800,
                                  color: '#f59e0b',
                                  background: 'rgba(245, 158, 11, 0.2)',
                                  border: '1px solid rgba(245, 158, 11, 0.45)',
                                  padding: '2px 8px',
                                  borderRadius: '6px',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '3px'
                                }}>
                                  ⚡ चालू सराव ({ansCount} उत्तरे)
                                </span>
                              );
                            }
                          } catch(e) {}
                        }
                        return null;
                      })()}
                    </div>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#94a3b8' }}>
                      <FiCalendar size={12} /> {displayDate}
                    </span>
                  </div>

                  {/* Title: Stable Mock Test {test.permanentIndex} */}
                  <div>
                    <h3 style={{
                      fontSize: '1.2rem', 
                      margin: 0, 
                      color: isSolved ? '#10b981' : (test.isTodayMock ? '#fbbf24' : 'var(--text-primary)'),
                      fontWeight: 800,
                      lineHeight: 1.3
                    }}>
                      Mock Test {test.permanentIndex} {test.isTodayMock ? '• आजची परीक्षा' : ''}
                    </h3>
                    {cleanSubtitle && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {cleanSubtitle}
                      </p>
                    )}
                  </div>

                  {/* Marking Scheme Badge & Specs */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    padding: '10px 12px',
                    borderRadius: '12px',
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid rgba(255, 255, 255, 0.06)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: isGroupC ? '#38bdf8' : '#fbbf24',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        ⚡ {isGroupC ? 'गट-क (+१.०० / -०.२५)' : 'MPSC अधिकृत (+२.०० / -०.६६)'}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 600 }}>
                        {isGroupC ? '१/४ निगेटिव्ह' : '१/३ निगेटिव्ह'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#cbd5e1' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📋 <strong>{qCount}</strong> प्रश्न ({totalMarks} गुण)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiClock size={12} /> {test.timeLimit} मिनिटे
                      </span>
                    </div>
                  </div>

                  {/* Status & Actions */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', alignItems: 'center' }}>
                    <button 
                      title="शेअर करा" 
                      className="btn mock-icon-btn" 
                      onClick={() => copyShareLink(test._id || test.id)}
                      style={{ 
                        padding: '8px', 
                        background: 'rgba(34,197,94,0.1)', 
                        color: 'var(--success)', 
                        border: '1px solid rgba(34,197,94,0.2)', 
                        borderRadius: '10px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        minWidth: '36px', 
                        minHeight: '36px' 
                      }}
                    >
                      <FiShare2 size={15} />
                    </button>

                    <button 
                      title="Start Test" 
                      className="btn btn-primary" 
                      onClick={() => navigate(`/test/${test._id || test.id}`)}
                      style={{ 
                        padding: '9px 18px', 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        gap: '8px', 
                        flex: 1, 
                        borderRadius: '11px', 
                        fontSize: '0.9rem', 
                        fontWeight: 700,
                        background: isSolved ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #f59e0b, #d97706)',
                        boxShadow: isSolved ? '0 4px 15px rgba(16, 185, 129, 0.3)' : '0 4px 15px rgba(245, 158, 11, 0.35)'
                      }}
                    >
                      <FiPlay size={14} /> {isSolved ? 'पुन्हा सोडवा (Retake)' : (() => {
                        const sRaw = localStorage.getItem(`mpsc_active_test_${test._id || test.id}`);
                        if (sRaw) {
                          try {
                            const p = JSON.parse(sRaw);
                            const c = Object.keys(p.answers || {}).length;
                            if (c > 0) return `चालू ठेवा (${c} उत्तरे)`;
                          } catch(e) {}
                        }
                        return 'मॉक टेस्ट द्या / OMR';
                      })()}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit & Delete Modals */}
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

      {deletingTest && (
        <div className="modal-overlay" onClick={() => setDeletingTest(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-primary)', border: '1px solid var(--danger)', textAlign: 'left', minWidth: '300px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '16px', color: 'var(--danger)' }}>⚠️ Delete Test?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>Are you sure you want to permanently delete "{deletingTest.title}"?</p>
            <div className="flex-row gap-4">
              <button type="button" onClick={() => setDeletingTest(null)} className="btn" style={{ flex: 1, background: 'var(--glass-bg)' }}>Cancel</button>
              <button 
                type="button" 
                onClick={async () => {
                   const targetId = deletingTest._id || deletingTest.id;
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
                className="btn btn-primary" style={{ flex: 1, background: 'linear-gradient(135deg, var(--danger), #b91c1c)' }}
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ⚡ Dynamic MPSC Test Generator Modal */}
      {showDynamicModal && (
        <div className="modal-overlay" onClick={() => !isGenerating && setShowDynamicModal(false)}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ 
              background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
              border: '1px solid rgba(255, 255, 255, 0.15)', 
              textAlign: 'left', 
              maxWidth: '560px',
              width: '95%',
              borderRadius: '24px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
              padding: '28px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '1.4rem' }}>⚡</span>
                  <h2 style={{ fontSize: '1.35rem', margin: 0, color: '#f8fafc', fontWeight: 900 }}>
                    डायनॅमिक MPSC सराव परीक्षा
                  </h2>
                </div>
                <p style={{ color: '#94a3b8', margin: '4px 0 0 0', fontSize: '0.85rem' }}>
                  प्रत्येक वेळी नवीन, रँडम व दर्जेदार प्रश्न थेट आयोगाच्या धर्तीवर.
                </p>
              </div>
              <button 
                onClick={() => !isGenerating && setShowDynamicModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '1.4rem', cursor: 'pointer', padding: '4px' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDynamicTest} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* 1. विषय निवडा (Select Subject) */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px', display: 'block' }}>
                  १. विषय निवडा (Subject):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                  {[
                    { id: 'all', label: '🌐 सर्वसमावेशक (GS)' },
                    { id: 'भारतीय राज्यव्यवस्था', label: '🏛️ राज्यव्यवस्था' },
                    { id: 'महाराष्ट्र भूगोल', label: '🗺️ भूगोल' },
                    { id: 'इतिहास', label: '📜 इतिहास' },
                    { id: 'अर्थव्यवस्था', label: '📈 अर्थव्यवस्था' },
                    { id: 'सामान्य विज्ञान', label: '🔬 विज्ञान' },
                    { id: 'CSAT / बुद्धिमत्ता', label: '🧩 CSAT' }
                  ].map(sub => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => setGenSubject(sub.id)}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        border: genSubject === sub.id ? '1.5px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: genSubject === sub.id ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: genSubject === sub.id ? '#4ade80' : '#cbd5e1',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s'
                      }}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. प्रश्नांची संख्या (Question Count) */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px', display: 'block' }}>
                  २. प्रश्नांची संख्या (Questions):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  {[15, 25, 50, 100].map(cnt => (
                    <button
                      key={cnt}
                      type="button"
                      onClick={() => {
                        setGenCount(cnt);
                        setGenTime(cnt >= 100 ? 120 : cnt >= 50 ? 60 : cnt >= 25 ? 30 : 20);
                      }}
                      style={{
                        padding: '10px 8px',
                        borderRadius: '10px',
                        fontSize: '0.85rem',
                        fontWeight: 800,
                        border: genCount === cnt ? '1.5px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                        background: genCount === cnt ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.04)',
                        color: genCount === cnt ? '#38bdf8' : '#cbd5e1',
                        cursor: 'pointer',
                        textAlign: 'center'
                      }}
                    >
                      {cnt} प्रश्न
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. निगेटिव्ह मार्किंग पॅटर्न (Marking Scheme) */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#cbd5e1', marginBottom: '8px', display: 'block' }}>
                  ३. अधिकृत मार्किंग पॅटर्न (Official Marking Scheme):
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div
                    onClick={() => setGenScheme('mpsc_rajyaseva')}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: genScheme === 'mpsc_rajyaseva' ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: genScheme === 'mpsc_rajyaseva' ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#fbbf24', marginBottom: '4px' }}>
                      ⚖️ राज्यसेवा पूर्व
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      बरोबर: <strong style={{ color: '#4ade80' }}>+२.००</strong> | चुकीचे: <strong style={{ color: '#f87171' }}>-०.६६</strong> (१:३rd)
                    </div>
                  </div>

                  <div
                    onClick={() => setGenScheme('group_c')}
                    style={{
                      padding: '12px',
                      borderRadius: '12px',
                      border: genScheme === 'group_c' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: genScheme === 'group_c' ? 'rgba(56, 189, 248, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                      cursor: 'pointer'
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#38bdf8', marginBottom: '4px' }}>
                      📋 संयुक्त गट-ब व गट-क
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                      बरोबर: <strong style={{ color: '#4ade80' }}>+१.००</strong> | चुकीचे: <strong style={{ color: '#f87171' }}>-०.२५</strong> (१:४th)
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. वेळ (Time Limit) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255, 255, 255, 0.04)', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                <span style={{ fontSize: '0.82rem', color: '#cbd5e1', fontWeight: 600 }}>
                  ⏱️ परीक्षेची वेळ (Time Limit):
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <input
                    type="number"
                    min="5"
                    max="180"
                    value={genTime}
                    onChange={e => setGenTime(Math.max(5, parseInt(e.target.value) || 15))}
                    style={{
                      width: '65px',
                      padding: '6px 8px',
                      background: 'rgba(0, 0, 0, 0.3)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      borderRadius: '8px',
                      color: '#f8fafc',
                      fontWeight: 800,
                      textAlign: 'center'
                    }}
                  />
                  <span style={{ fontSize: '0.82rem', color: '#94a3b8' }}>मिनिटे</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setShowDynamicModal(false)}
                  className="btn"
                  style={{ flex: 1, background: 'rgba(255, 255, 255, 0.08)', color: '#cbd5e1', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                >
                  रद्द करा
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="btn"
                  style={{
                    flex: 2,
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                    color: '#fff',
                    fontWeight: 800,
                    boxShadow: '0 8px 25px rgba(16, 185, 129, 0.4)'
                  }}
                >
                  {isGenerating ? 'तयार करत आहे...' : '🚀 डायनॅमिक टेस्ट सुरू करा'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};

export default MockTests;
