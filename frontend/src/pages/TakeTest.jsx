import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiBookmark, FiTarget, FiArrowLeft, FiArrowRight, 
  FiBookOpen, FiFilm, FiCpu, FiExternalLink, FiChevronDown, FiChevronUp, FiCheckCircle, FiAward 
} from 'react-icons/fi';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { auth } from '../firebase';

const TakeTest = () => {
  const { testId } = useParams();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);

  const isMistake = Boolean(
    test?.isMistakeMock || 
    (test?.title && test.title.toLowerCase().includes('mistake')) ||
    (test?.topic && test.topic.toLowerCase().includes('mistake'))
  );
  
  // State
  const [answers, setAnswers] = useState({});
  const [reviews, setReviews] = useState({}); // { questionIndex: boolean }
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [showSuccessVideo, setShowSuccessVideo] = useState(false);
  const [allReels, setAllReels] = useState([]);
  const [aiExplanations, setAiExplanations] = useState({});
  const [loadingAi, setLoadingAi] = useState({});
  const [expandedReelPreview, setExpandedReelPreview] = useState({});
  const [rankData, setRankData] = useState({
    userRank: null,
    totalParticipants: 0,
    isQualified: false,
    leaderboard: []
  });
  const navigate = useNavigate();
  const { width, height } = useWindowSize();

  // Load study reels for automatic topic referencing
  useEffect(() => {
    const fetchReels = async () => {
      try {
        const cached = localStorage.getItem('mpsc_cached_reels');
        if (cached) {
          setAllReels(JSON.parse(cached));
        }
        const res = await axios.get('https://mpsc-manager.onrender.com/api/reels/all', { timeout: 4000 });
        if (res.data.success && Array.isArray(res.data.data)) {
          setAllReels(res.data.data);
          localStorage.setItem('mpsc_cached_reels', JSON.stringify(res.data.data));
        }
      } catch (e) {
        // Fallback to cached
      }
    };
    fetchReels();
  }, []);

  // Find matching Note Reel based on topic or subject
  const findMatchingReel = (q, currentTest) => {
    if (!allReels || allReels.length === 0) return null;
    const testSub = (currentTest?.subject || '').trim().toLowerCase();
    const testTopic = (currentTest?.topic || '').trim().toLowerCase();
    const qText = (q?.question || '').toLowerCase();

    // 1. Precise match on topic
    if (testTopic) {
      const topicMatch = allReels.find(r => 
        (r.topic && r.topic.toLowerCase().includes(testTopic)) ||
        (r.title && r.title.toLowerCase().includes(testTopic))
      );
      if (topicMatch) return topicMatch;
    }

    // 2. Keyword match in question text vs reel title or card content
    const keywordMatch = allReels.find(r => {
      const rTitle = (r.title || '').toLowerCase();
      const rSub = (r.subject || '').toLowerCase();
      const titleWords = rTitle.split(/\s+/).filter(w => w.length > 3);
      const hasWordMatch = titleWords.some(w => qText.includes(w));
      return hasWordMatch || (testSub && rSub.includes(testSub));
    });

    if (keywordMatch) return keywordMatch;

    // 3. Fallback: match by subject or return first available reel
    const subMatch = allReels.find(r => (r.subject || '').toLowerCase() === testSub);
    return subMatch || allReels[0] || null;
  };

  // Fetch AI explanation on demand
  const handleGetAiExplanation = async (qIndex, q) => {
    setLoadingAi(prev => ({ ...prev, [qIndex]: true }));
    try {
      const res = await axios.post('https://mpsc-manager.onrender.com/api/ai/explain', {
        question: q.question,
        options: q.options,
        correctOption: q.correctOption,
        subject: test?.subject || 'MPSC'
      }, { timeout: 10000 });

      if (res.data.success && res.data.explanation) {
        setAiExplanations(prev => ({ ...prev, [qIndex]: res.data.explanation }));
        toast.success("AI स्पष्टीकरण तयार झाले! ✨");
      } else {
        throw new Error("No explanation returned");
      }
    } catch (err) {
      const correctText = (q.options && q.options[q.correctOption]) ? q.options[q.correctOption] : 'पर्याय';
      setAiExplanations(prev => ({
        ...prev,
        [qIndex]: `या प्रश्नाचे अधिकृत उत्तर "${correctText}" आहे. हा प्रश्न ${test?.subject || 'MPSC'} च्या अभ्यासक्रमातील महत्त्वाच्या घटकावर आधारित आहे.`
      }));
    } finally {
      setLoadingAi(prev => ({ ...prev, [qIndex]: false }));
    }
  };

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await axios.get(`https://mpsc-manager.onrender.com/api/custom-tests/${testId}`);
        if(res.data.success) {
          const fetchedTest = res.data.data;
          const sessionKey = `mpsc_active_test_${testId}`;
          const savedSessionRaw = localStorage.getItem(sessionKey);
          let sessionRestored = false;

          // Check for existing ongoing session (e.g. after refresh)
          if (savedSessionRaw) {
            try {
              const session = JSON.parse(savedSessionRaw);
              if (session && Array.isArray(session.questions) && session.questions.length > 0) {
                // Calculate elapsed time accurately (even if user was away / reloading)
                const elapsedSeconds = Math.max(0, Math.floor((Date.now() - (session.lastSavedTimestamp || Date.now())) / 1000));
                const remainingTime = Math.max(0, (session.timeLeft ?? (fetchedTest.timeLimit * 60)) - elapsedSeconds);
                
                fetchedTest.questions = session.questions;
                setTest(fetchedTest);
                setAnswers(session.answers || {});
                setReviews(session.reviews || {});
                setTimeLeft(remainingTime);
                if (typeof session.activeQuestion === 'number') {
                  setActiveQuestion(session.activeQuestion);
                }
                sessionRestored = true;
                toast.success("🔄 तुमची चालू टेस्ट पूर्ववत केली आहे! (Test Resumed)", { icon: '⚡', duration: 4000 });
              }
            } catch(err) {
              console.error("Failed to restore test session", err);
            }
          }

          if (!sessionRestored) {
            // Shuffle questions and options for anti-cheat
            if (fetchedTest.questions && Array.isArray(fetchedTest.questions)) {
               // Map questions with their originalIndex
               const questionsWithIdx = fetchedTest.questions.map((q, qIndex) => ({ q, originalQIndex: qIndex }));
               // Shuffle questions
               questionsWithIdx.sort(() => Math.random() - 0.5);
               
               fetchedTest.questions = questionsWithIdx.map(item => {
                 const q = item.q;
                 q.originalQIndex = item.originalQIndex;
                 
                 if (q.options && q.options.length > 0) {
                   const optionsWithIdx = q.options.map((opt, i) => ({ opt, originalIndex: i }));
                   // Shuffle Options
                   optionsWithIdx.sort(() => Math.random() - 0.5);
                   
                   const newCorrectIndex = optionsWithIdx.findIndex(o => o.originalIndex === q.correctOption);
                   
                   q.options = optionsWithIdx.map(o => o.opt);
                   q.optionMapping = optionsWithIdx.map(o => o.originalIndex); // Save mapping
                   
                   if (newCorrectIndex !== -1) {
                      q.correctOption = newCorrectIndex;
                   }
                 }
                 return q;
               });
            }
            
            setTest(fetchedTest);
            const initialTime = fetchedTest.timeLimit * 60;
            setTimeLeft(initialTime);

            try {
              localStorage.setItem(sessionKey, JSON.stringify({
                testId,
                questions: fetchedTest.questions,
                answers: {},
                reviews: {},
                timeLeft: initialTime,
                lastSavedTimestamp: Date.now(),
                activeQuestion: 0
              }));
            } catch (e) {}
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTest();
  }, [testId]);

  useEffect(() => {
    if (!test || submitted) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = parseInt(entry.target.id.replace('q-', ''), 10);
            if (!isNaN(idx)) {
              setActiveQuestion(prev => (prev !== idx ? idx : prev));
            }
          }
        });
      },
      { root: null, rootMargin: '-20% 0px -60% 0px', threshold: 0 }
    );
    
    test.questions.forEach((_, idx) => {
      const el = document.getElementById(`q-${idx}`);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [test, submitted]);

  useEffect(() => {
    if (!submitted) {
      const paletteItem = document.getElementById(`palette-q-${activeQuestion}`);
      const paletteContainer = document.getElementById('palette-container');
      
      if (paletteItem && paletteContainer) {
          if (paletteContainer.scrollHeight > paletteContainer.clientHeight) {
             const itemTop = paletteItem.offsetTop;
             const containerScrollHalfY = paletteContainer.clientHeight / 2;
             paletteContainer.scrollTo({ top: itemTop - containerScrollHalfY + (paletteItem.offsetHeight / 2), behavior: 'auto' });
          }
          if (paletteContainer.scrollWidth > paletteContainer.clientWidth) {
             const itemLeft = paletteItem.offsetLeft;
             const containerScrollHalfX = paletteContainer.clientWidth / 2;
             paletteContainer.scrollTo({ left: itemLeft - containerScrollHalfX + (paletteItem.offsetWidth / 2), behavior: 'auto' });
          }
      }
    }
  }, [activeQuestion, submitted]);

  useEffect(() => {
    if (timeLeft > 0 && !submitted) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (timeLeft === 0 && test && !submitted) {
      handleSubmit(); // Auto submit
    }
  }, [timeLeft, submitted, test]);

  // Auto-save test progress to localStorage continuously so refresh won't lose answers
  useEffect(() => {
    if (test && !submitted && test.questions && test.questions.length > 0) {
      try {
        const sessionData = {
          testId,
          questions: test.questions,
          answers,
          reviews,
          timeLeft,
          lastSavedTimestamp: Date.now(),
          activeQuestion
        };
        localStorage.setItem(`mpsc_active_test_${testId}`, JSON.stringify(sessionData));
      } catch (e) {}
    }
  }, [test, answers, reviews, timeLeft, activeQuestion, submitted, testId]);

  // Warn user on accidental refresh or window close
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!submitted && test && (Object.keys(answers).length > 0 || timeLeft > 0)) {
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [submitted, test, answers, timeLeft]);

  const handleSelect = (qIndex, oIndex) => {
    if(submitted) return;
    if (answers[qIndex] === oIndex) {
      // Unselect if already selected
      const newAnswers = { ...answers };
      delete newAnswers[qIndex];
      setAnswers(newAnswers);
    } else {
      setAnswers({ ...answers, [qIndex]: oIndex });
    }
  };

  const toggleReview = (qIndex) => {
    if(submitted) return;
    setReviews(prev => ({ ...prev, [qIndex]: !prev[qIndex] }));
  };

  const handleSubmit = async () => {
    let currentScore = 0;
    
    // Create payload for backend with mapped original indexes
    const backendAnswers = {};

    test.questions.forEach((q, visualIdx) => {
      // Frontend visual score calculation
      if (answers[visualIdx] === q.correctOption) {
        currentScore += 1;
      } else if (answers[visualIdx] !== undefined) {
        currentScore -= 0.25;
      }
      
      // Map to backend structure
      if (answers[visualIdx] !== undefined) {
        const originalQIdx = q.originalQIndex;
        const originalOIdx = q.optionMapping ? q.optionMapping[answers[visualIdx]] : answers[visualIdx];
        backendAnswers[originalQIdx] = originalOIdx;
      }
    });

    setScore(currentScore);
    setSubmitted(true);
    
    // Clean up active session from localStorage so test won't resume after final submission
    try {
      localStorage.removeItem(`mpsc_active_test_${testId}`);
    } catch(e) {}

    if (!isMistake) {
      setShowSuccessVideo(true);
    }

    try {
      const totalAllocatedSeconds = (test?.timeLimit ? test.timeLimit * 60 : 0);
      const timeSpent = Math.max(1, totalAllocatedSeconds - timeLeft);
      const usr = auth.currentUser;
      const userName = usr?.displayName ? usr.displayName.split(' ')[0] : 'परीक्षार्थी';

      const res = await axios.post(`https://mpsc-manager.onrender.com/api/custom-tests/${testId}/submit`, {
        answers: backendAnswers,
        userId: usr?.uid || 'anonymous',
        userName: userName,
        timeTaken: timeSpent
      });
      if(res.data.success) {
        setRankData({
          userRank: isMistake ? null : res.data.userRank,
          totalParticipants: isMistake ? 0 : (res.data.totalParticipants || 0),
          isQualified: isMistake ? false : res.data.isQualified,
          leaderboard: isMistake ? [] : (res.data.leaderboard || [])
        });

        if (!isMistake && res.data.userRank) {
          toast.success(`🏆 तुमचा रँक: #${res.data.userRank} (${res.data.totalParticipants} विद्यार्थ्यांपैकी)`, { duration: 4000, icon: '🏅' });
        }

        if (res.data.message && res.data.message.includes('Mistake Mock')) {
          toast.success(res.data.message, { duration: 5000, icon: '🔥' });
        }
        
        // Update Practice Accuracy
        const testPercent = test.questions.length > 0 ? Math.max(0, (currentScore / test.questions.length) * 100) : 0;
        const oldAccuracy = parseFloat(localStorage.getItem('practice_accuracy')) || 0;
        const testsTaken = parseInt(localStorage.getItem('tests_taken')) || 0;
        const newAccuracy = testsTaken === 0 ? testPercent : ((oldAccuracy * testsTaken) + testPercent) / (testsTaken + 1);
        
        let batchUpdates = {
          practice_accuracy: newAccuracy.toFixed(1),
          tests_taken: testsTaken + 1
        };

        // Add Points!
        if (res.data.scoreEarned > 0) {
           const sub = res.data.subject || 'General';
           const oldPoints = parseFloat(localStorage.getItem(`xp_${sub}`)) || 0;
           batchUpdates[`xp_${sub}`] = (oldPoints + res.data.scoreEarned).toFixed(2);
           
           const totalOld = parseFloat(localStorage.getItem('xp_total')) || 0;
           batchUpdates['xp_total'] = (totalOld + res.data.scoreEarned).toFixed(2);
           
           if (!isMistake) {
             import('../utils/sound').then(({ playSound }) => playSound.playXpGain());
             toast.success(`🎉 Earned +${res.data.scoreEarned} XP for ${sub}!`);
           }
        }
        
        import('../utils/dbStore').then(({ saveMultipleToDB }) => saveMultipleToDB(batchUpdates));
      }
    } catch(err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (submitted && test && !isMistake) {
      const percent = test.questions.length > 0 ? (score / test.questions.length) * 100 : 0;
      let ttsMsg = '';
      const fName = auth.currentUser?.displayName ? auth.currentUser.displayName.split(' ')[0] : '';
      if (percent >= 80) {
        ttsMsg = `Excellent ${fName}! Outstanding performance.`;
      } else if (percent >= 40) {
        ttsMsg = `Good ${fName}, but keep practicing!`;
      } else {
        ttsMsg = `Try again ${fName}. Better luck next time!`;
      }
      
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(ttsMsg);
        utterance.rate = 1;
        utterance.pitch = 1;
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [submitted, score, test, isMistake]);

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '32px' }}>
      <div className="premium-loader">
         <div className="ring"></div>
         <div className="ring"></div>
         <div className="ring"></div>
         <span className="premium-loader-text" style={{ fontSize: '1.25rem', fontFamily: 'serif', fontStyle: 'italic', color: 'var(--accent-primary)' }}>1207</span>
      </div>
      <p style={{ color: 'var(--text-secondary)', letterSpacing: '3px', textTransform: 'uppercase', animation: 'pulse 1.5s infinite', fontSize: '0.875rem', fontWeight: 600 }}>Loading Test Environment</p>
    </div>
  );
  if (!test) return <div style={{color:'var(--text-primary)', padding: '40px', textAlign: 'center'}}>Test not found or invalid link.</div>;

  if (!isMistake && showSuccessVideo) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 99999, background: '#000' }}>
         <video 
           src="/video/test-success.mp4" 
           autoPlay 
           playsInline
           onEnded={() => setShowSuccessVideo(false)} 
           style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
         />
         <button onClick={() => setShowSuccessVideo(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', zIndex: 100000, fontSize: '0.875rem' }}>Skip</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)', padding: '20px', paddingTop: '125px', paddingBottom: '100px', fontFamily: 'system-ui' }}>
      
      {/* 🚀 FIXED TOP COMMAND BAR: Timer + Question Palette (100% Pinned to Viewport) */}
      <div className="test-fixed-top-bar">
        <div className="test-top-inner-wrap">
          <div className="test-top-main-row">
            <div className="test-top-left">
              <button onClick={() => navigate(-1)} className="test-back-btn" title="Go Back">
                <FiArrowLeft size={20} />
              </button>
              <div className="test-title-meta">
                <h2 className="test-fixed-title" title={test.title}>{test.title}</h2>
                {test.questions && test.questions.length > 0 && (
                  <span className="test-q-badge">
                    प्रश्न {activeQuestion + 1} / {test.questions.length}
                  </span>
                )}
              </div>
            </div>

            <div className="test-top-right">
              {!submitted && (
                <div className={`test-fixed-timer ${timeLeft < 60 ? 'timer-danger' : ''}`}>
                  <span>⏱</span>
                  <span>{formatTime(timeLeft)}</span>
                </div>
              )}
              {!submitted && (
                <button onClick={handleSubmit} className="btn btn-primary test-header-submit-btn">
                  सबमिट करा
                </button>
              )}
            </div>
          </div>

          {/* 🧭 Horizontal Question Palette Bar (Pinned right in the fixed top bar!) */}
          {(!submitted || showAnswers) && test.questions && test.questions.length > 0 && (
            <div className="test-top-palette-row">
              <div id="palette-container" className="palette-horizontal-track">
                {test.questions.map((_, idx) => {
                  const isAttempted = answers[idx] !== undefined;
                  const isActive = idx === activeQuestion && !submitted;
                  const isReviewed = reviews[idx];
                  
                  let chipClass = 'palette-chip';
                  if (submitted) {
                    if (answers[idx] === test.questions[idx].correctOption) {
                      chipClass += ' chip-correct';
                    } else if (isAttempted) {
                      chipClass += ' chip-wrong';
                    }
                  } else if (isReviewed) {
                    chipClass += isAttempted ? ' chip-review-ans' : ' chip-review-blank';
                  } else if (isAttempted) {
                    chipClass += ' chip-answered';
                  }
                  if (isActive) chipClass += ' chip-current';

                  return (
                    <button
                      key={idx}
                      id={`palette-q-${idx}`}
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`q-${idx}`);
                        if (el) {
                          const yOffset = -140;
                          const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
                          window.scrollTo({ top: y, behavior: 'smooth' });
                        }
                      }}
                      className={chipClass}
                      title={`प्रश्न #${idx + 1}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              <div className="palette-strip-legend desktop-only">
                <span className="legend-tag tag-ans">{Object.keys(answers).length} सोडवले</span>
                <span className="legend-tag tag-rev">{Object.keys(reviews).filter(k => reviews[k]).length} रिव्ह्यू</span>
                <span className="legend-tag tag-left">{test.questions.length - Object.keys(answers).length} बाकी</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="test-layout-container" style={{ display: 'flex', gap: '24px', alignItems: 'flex-start' }}>
        
        {/* Main Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {submitted && !showAnswers && (
            <div className="glass-card flex-col align-center" style={{ padding: '40px 24px', textAlign: 'center', animation: 'fadeIn 0.5s ease-out', position: 'relative' }}>
              {(() => {
                const percent = test.questions.length > 0 ? (score / test.questions.length) * 100 : 0;
                let config = {};
                if (percent >= 80) {
                     config = { color: 'var(--success)', icon: '🏆', msg: 'Excellent! Outstanding Performance! 🔥', sub: 'You smashed it like a pro. Keep it up!', showConfetti: true };
                } else if (percent >= 40) {
                     config = { color: 'var(--warning)', icon: '👍', msg: 'Good Effort! Keep Practicing! 💡', sub: 'You are on the right track, review your mistakes.', showConfetti: false };
                } else {
                     config = { color: 'var(--danger)', icon: '🥺', msg: 'Need Improvement! Better luck next time! 📚', sub: 'Don\'t worry, analyze your weak points and study hard.', showConfetti: false };
                }
                
                return (
                   <>
                     {!isMistake && config.showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={600} gravity={0.15} />}
                     <div style={{ padding: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '50%', marginBottom: '16px', fontSize: '4rem' }}>
                       {config.icon}
                     </div>
                     <h2 style={{ color: config.color, marginBottom: '8px', fontSize: '1.75rem' }}>{config.msg}</h2>
                     <p style={{ color: 'var(--text-secondary)', marginBottom: '24px' }}>{config.sub}</p>
                   </>
                );
              })()}
              
              <h1 style={{ fontSize: '5rem', margin: '0 0 8px 0', color: 'var(--text-primary)' }}>
                {score} <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)' }}>/ {test.questions.length}</span>
              </h1>
              
              {/* Detailed MPSC Score Summary Breakdown */}
              {(() => {
                let correctCount = 0;
                let wrongCount = 0;
                let unattemptedCount = 0;
                let lost = 0;

                test.questions.forEach((q, idx) => {
                  if (answers[idx] === undefined) {
                    unattemptedCount += 1;
                  } else if (answers[idx] === q.correctOption) {
                    correctCount += 1;
                  } else {
                    wrongCount += 1;
                    lost += 0.25;
                  }
                });

                const attempted = correctCount + wrongCount;
                const accuracy = attempted > 0 ? ((correctCount / attempted) * 100).toFixed(1) : '0';
                const deducted = lost.toFixed(2);
                const finalFormattedScore = (score % 1 === 0) ? score : score.toFixed(2);

                return (
                  <div style={{ width: '100%', maxWidth: '540px', marginTop: '16px', marginBottom: '24px' }}>
                    {/* 4 Metric Cards */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '16px' }}>
                      <div className="glass-card" style={{ padding: '12px 8px', textAlign: 'center', background: 'rgba(34, 197, 94, 0.08)', border: '1px solid rgba(34, 197, 94, 0.25)' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>{correctCount}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>बरोबर (+{correctCount})</div>
                      </div>
                      <div className="glass-card" style={{ padding: '12px 8px', textAlign: 'center', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--danger)' }}>{wrongCount}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>चुकीचे (-{deducted})</div>
                      </div>
                      <div className="glass-card" style={{ padding: '12px 8px', textAlign: 'center', background: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-muted)' }}>{unattemptedCount}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>सोडवले नाही</div>
                      </div>
                      <div className="glass-card" style={{ padding: '12px 8px', textAlign: 'center', background: 'rgba(59, 130, 246, 0.08)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--info)' }}>{accuracy}%</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>अचूकता</div>
                      </div>
                    </div>

                    {/* Marking Breakdown Row */}
                    <div style={{ 
                      padding: '12px 16px', 
                      background: 'var(--glass-bg)', 
                      borderRadius: '12px', 
                      border: '1px solid var(--border-color)',
                      fontSize: '0.85rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      textAlign: 'left'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>मिळालेले गुण (Gross Marks):</span>
                        <span style={{ fontWeight: 600, color: 'var(--success)' }}>+{correctCount}.00</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                        <span>निगेटिव्ह मार्किंग कपात (1/4th Penalty):</span>
                        <span style={{ fontWeight: 600, color: 'var(--danger)' }}>-{deducted}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '6px', fontWeight: 700, color: 'var(--text-primary)' }}>
                        <span>अंतिम गुण (Net Score):</span>
                        <span style={{ color: 'var(--accent-primary)', fontSize: '1.05rem' }}>{finalFormattedScore} / {test.questions.length}</span>
                      </div>
                    </div>

                    {/* Negative Marking Advice */}
                    {lost > 0 ? (
                      <div style={{ marginTop: '12px', padding: '14px 16px', background: 'rgba(239, 68, 68, 0.08)', border: '1px dashed var(--danger)', borderRadius: '12px', textAlign: 'left' }}>
                        <p style={{ margin: 0, color: 'var(--danger)', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ⚠️ MPSC निगेटिव्ह मार्किंग विश्लेषण (1/4th Rule)
                        </p>
                        <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.4' }}>
                          तुम्ही {wrongCount} चुकीचे उत्तर दिले, ज्यामुळे तुमचे <strong>{deducted} मार्क्स</strong> वजा झाले. जर तुम्ही हे {wrongCount} चुकीचे प्रश्न सोडवले नसते (Skip केले असते), तर तुमचा अंतिम स्कोर <strong>{correctCount}.00</strong> असता!
                        </p>
                      </div>
                    ) : (
                      <div style={{ marginTop: '12px', padding: '14px 16px', background: 'rgba(34, 197, 94, 0.08)', border: '1px dashed var(--success)', borderRadius: '12px', textAlign: 'left' }}>
                        <p style={{ margin: 0, color: 'var(--success)', fontWeight: 700, fontSize: '0.9rem' }}>
                          🎉 उत्कृष्ट अचूकता (100% Accuracy)!
                        </p>
                        <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                          एकही प्रश्न चुकीचा गेला नाही! निगेटिव्ह मार्किंगमुळे एकही गुण वजा झालेला नाही.
                        </p>
                      </div>
                    )}

                    {/* Official Test Rank Banner & Leaderboard (Regular Tests Only) */}
                    {!isMistake ? (
                      <>
                        {rankData.userRank ? (
                          <div className="test-rank-banner">
                            <div className="rank-left-section">
                              <div className="rank-trophy-badge">
                                {rankData.userRank === 1 ? '🥇' : rankData.userRank === 2 ? '🥈' : rankData.userRank === 3 ? '🥉' : '🏆'}
                              </div>
                              <div>
                                <div className="rank-sub-title">सर्व टेस्ट्सचा महा-रँक (Overall All-Tests Rank)</div>
                                <div className="rank-number-display">
                                  रँक #{rankData.userRank} <span className="rank-total-count">/ {rankData.totalParticipants} विद्यार्थी</span>
                                </div>
                              </div>
                            </div>
                            <div className="rank-valid-badge">
                              ✓ सर्व टेस्ट्सचे एकूण गुण & अचूकतेवर आधारित
                            </div>
                          </div>
                        ) : (
                          <div className="test-rank-unqualified">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span style={{ fontSize: '1.4rem' }}>⚠️</span>
                              <div>
                                <div style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.88rem' }}>रँकसाठी अपात्र (Unranked)</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.4' }}>
                                  रँक मिळवण्यासाठी किमान १ प्रश्न अचूक सोडवून पॉझिटिव्ह नेट गुण मिळवणे अनिवार्य आहे. केवळ रिकामी टेस्ट सबमिट केल्यास रँक मिळत नाही!
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Test Leaderboard Accordion/Table */}
                        {rankData.leaderboard && rankData.leaderboard.length > 0 && (
                          <div className="test-leaderboard-box">
                            <div className="leaderboard-box-header">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                                <FiAward size={18} style={{ color: 'var(--accent-primary)' }} />
                                <span>🏆 सर्व टेस्ट्सचा एकत्रित महा-लीडरबोर्ड</span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                एकूण {rankData.totalParticipants} रँकधारक
                              </span>
                            </div>

                            <div className="leaderboard-box-list">
                              {rankData.leaderboard.map((item, idx) => {
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
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="glass-card" style={{ marginTop: '16px', padding: '16px 20px', textAlign: 'left', border: '1px solid rgba(168, 85, 247, 0.3)', background: 'rgba(168, 85, 247, 0.08)', borderRadius: '14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '1.6rem' }}>📖</span>
                          <div>
                            <h4 style={{ margin: 0, color: '#c084fc', fontSize: '0.95rem', fontWeight: 700 }}>मिस्टेक बुक रिव्हिजन पूर्ण (Mistake Book Drill)</h4>
                            <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.82rem', lineHeight: '1.4' }}>
                              हा केवळ तुमच्या चुका सुधारण्यासाठीचा वैयक्तिक सराव आहे. यासाठी कोणताही रँक किंवा लीडरबोर्ड लागू होत नाही.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/practice')} className="btn" style={{ padding: '12px 24px', fontSize: '1.1rem', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                   Take Another Test <FiArrowRight />
                </button>
                <button onClick={() => setShowAnswers(true)} className="btn btn-primary" style={{ padding: '12px 24px', fontSize: '1.1rem' }}>
                   View Answers
                </button>
              </div>
            </div>
          )}

          {(!submitted || showAnswers) && test.questions.map((q, qIndex) => {
            const isCorrectAnswer = q.correctOption === answers[qIndex];
            const isUnattempted = answers[qIndex] === undefined;
            
            return (
              <div id={`q-${qIndex}`} key={qIndex} className="glass-card" style={{ padding: '24px', border: submitted ? (isCorrectAnswer ? '1px solid var(--success)' : (isUnattempted ? '1px solid var(--border-color)' : '1px solid var(--warning)')) : 'none' }}>
              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <span style={{ background: 'var(--accent-primary)', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                  {qIndex + 1}
                </span>
                <p style={{ fontSize: '1.125rem', margin: '4px 0 0 0', lineHeight: 1.5, color: 'var(--text-primary)' }}>{q.question}</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '48px' }}>
                {q.options.map((opt, oIndex) => {
                  
                  let bgStyle = 'var(--glass-bg)';
                  let colorStyle = 'var(--text-primary)';

                  if (submitted && showAnswers) {
                     if (oIndex === q.correctOption) {
                       bgStyle = 'rgba(34, 197, 94, 0.2)'; // Success Green
                       colorStyle = 'var(--success)';
                     } else if (oIndex === answers[qIndex]) {
                       bgStyle = 'rgba(239, 68, 68, 0.2)'; // Danger Red
                       colorStyle = '#ef4444';
                     }
                  } else if (answers[qIndex] === oIndex) {
                     bgStyle = 'var(--accent-glow)'; // Selected state
                  }

                  return (
                    <div 
                      key={oIndex} 
                      onClick={() => handleSelect(qIndex, oIndex)}
                      style={{ 
                        padding: '12px 16px', 
                        borderRadius: '8px', 
                        background: bgStyle,
                        color: colorStyle,
                        cursor: submitted ? 'default' : 'pointer',
                        border: '1px solid var(--border-color)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                       <input 
                         type="radio" 
                         checked={answers[qIndex] === oIndex} 
                         readOnly
                         style={{ marginRight: '10px' }}
                       />
                       {opt}
                    </div>
                  );
                })}
              </div>

              {/* Reference & Automatic Note Reel Section */}
              {submitted && showAnswers && (() => {
                const matchingReel = findMatchingReel(q, test);
                const hasDirectExplanation = !!q.explanation;
                const aiExpl = aiExplanations[qIndex];
                const isLoadingThisAi = loadingAi[qIndex];
                const isReelExpanded = expandedReelPreview[qIndex];

                return (
                  <div className="reference-container" style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* 1. Direct or AI Explanation Card */}
                    {(hasDirectExplanation || aiExpl) ? (
                      <div className="explanation-card">
                        <div className="flex-row gap-2" style={{ alignItems: 'center', marginBottom: '8px', color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.9rem' }}>
                          <FiBookOpen size={16} />
                          <span>{hasDirectExplanation ? '📖 सविस्तर स्पष्टीकरण (Reference)' : '✨ AI संदर्भासहित स्पष्टीकरण'}</span>
                        </div>
                        <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                          {hasDirectExplanation ? q.explanation : aiExpl}
                        </p>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <button
                          onClick={() => handleGetAiExplanation(qIndex, q)}
                          disabled={isLoadingThisAi}
                          className="btn-ai-explain"
                        >
                          <FiCpu size={14} />
                          {isLoadingThisAi ? 'स्पष्टीकरण तयार होत आहे...' : '✨ AI कडून स्पष्टीकरण मिळवा'}
                        </button>
                      </div>
                    )}

                    {/* 2. Automatic Linked Note Reel Card */}
                    {matchingReel && (
                      <div className="auto-reel-card">
                        <div className="flex-row justify-between" style={{ alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                          <div className="flex-row gap-2" style={{ alignItems: 'center' }}>
                            <div className="reel-badge-icon">📽️</div>
                            <div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                                संबंधित Note Reel रिव्हिजन (Auto-Linked)
                              </div>
                              <h4 style={{ margin: '2px 0 0 0', fontSize: '0.95rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                                {matchingReel.title}
                              </h4>
                            </div>
                          </div>

                          <div className="flex-row gap-2" style={{ alignItems: 'center' }}>
                            <button
                              onClick={() => setExpandedReelPreview(prev => ({ ...prev, [qIndex]: !prev[qIndex] }))}
                              className="btn-reel-preview"
                              title="कार्ड्स येथेच पहा"
                            >
                              {isReelExpanded ? <FiChevronUp size={14} /> : <FiChevronDown size={14} />}
                              {matchingReel.cards?.length || 0} कार्ड्स रिव्हिजन
                            </button>
                            <a
                              href={`/reel/${matchingReel.id || matchingReel._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn-reel-open"
                              title="मोठ्या स्क्रीनवर रील उघडा"
                            >
                              पूर्ण रील पहा <FiExternalLink size={12} />
                            </a>
                          </div>
                        </div>

                        {/* Inline Flashcard Mini Viewer */}
                        {isReelExpanded && matchingReel.cards && matchingReel.cards.length > 0 && (
                          <div className="reel-inline-preview">
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 600 }}>
                              फ्लॅशकार्ड्स सारांश ({matchingReel.subject || 'MPSC'}):
                            </div>
                            <div className="flex-col gap-2">
                              {matchingReel.cards.map((card, cIdx) => (
                                <div key={cIdx} className="mini-card-item">
                                  <span className="mini-card-num">#{cIdx + 1}</span>
                                  <div>
                                    {card.topic && <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-primary)' }}>{card.topic}</div>}
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>{card.content}</div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}

              {!submitted && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button 
                    onClick={() => toggleReview(qIndex)}
                    style={{ 
                      padding: '8px 16px', background: reviews[qIndex] ? 'rgba(245, 158, 11, 0.2)' : 'var(--glass-bg)', 
                      color: reviews[qIndex] ? 'var(--warning)' : 'var(--text-secondary)',
                      border: reviews[qIndex] ? '1px solid var(--warning)' : '1px solid var(--border-color)', 
                      borderRadius: '8px', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '8px',
                      fontWeight: 600, outline: 'none'
                    }}
                  >
                    <FiBookmark /> {reviews[qIndex] ? 'Marked for Review' : 'Mark for Review'}
                  </button>
                </div>
              )}
            </div>
          )
        })}
        </div>
      </div>
      
      {/* Mobile Sticky Submit Button */}
      {!submitted && (
         <button onClick={handleSubmit} className="btn btn-primary mobile-submit-btn">
           Submit Test
         </button>
      )}
    </div>
  );
};

export default TakeTest;
