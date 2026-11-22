import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FiBookmark, FiTarget, FiArrowLeft, FiArrowRight, 
  FiBookOpen, FiFilm, FiCpu, FiExternalLink, FiChevronDown, FiChevronUp, FiCheckCircle, FiAward, FiEdit
} from 'react-icons/fi';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { auth } from '../firebase';
import OmrSheetView from '../components/OmrSheetView';
import EditQuestionModal from '../components/EditQuestionModal';
import { MPSC_SEED_MOCKS } from '../data/mpscMockTestsSeed';
import { recordTestXp } from '../utils/xpTracker';

// --- TEST SCORING & PERSISTENT OVERRIDES ENGINE ---
export const calculateTestScore = (questionsList = [], userAnswers = {}, scheme = 'group_c') => {
  const isRajyaseva = scheme === 'mpsc_rajyaseva';
  const marksPerCorrect = isRajyaseva ? 2.0 : 1.0;
  const penaltyPerWrong = isRajyaseva ? 0.66 : 0.25;

  let correctCount = 0;
  let wrongCount = 0;
  let unattemptedCount = 0;
  const wrongQuestionsList = [];

  questionsList.forEach((q, idx) => {
    const userAns = userAnswers[idx];
    if (userAns === undefined) {
      unattemptedCount++;
    } else if (userAns === q.correctOption) {
      correctCount++;
    } else {
      wrongCount++;
      wrongQuestionsList.push({
        question: q.question,
        options: q.options,
        correctOption: q.correctOption,
        userSelectedOption: userAns,
        explanation: q.explanation || '',
        subject: q.subject || 'General',
        topic: q.topic || 'General Practice',
        markingScheme: scheme
      });
    }
  });

  const grossScore = Number((correctCount * marksPerCorrect).toFixed(2));
  const penaltyScore = Number((wrongCount * penaltyPerWrong).toFixed(2));
  const netScore = Number((grossScore - penaltyScore).toFixed(2));
  const maxScore = Number((questionsList.length * marksPerCorrect).toFixed(2));
  const totalAttempted = correctCount + wrongCount;
  const accuracy = totalAttempted > 0 ? Number(((correctCount / totalAttempted) * 100).toFixed(1)) : 0;

  return {
    correctCount,
    wrongCount,
    unattemptedCount,
    grossScore,
    penaltyScore,
    netScore,
    maxScore,
    accuracy,
    wrongQuestionsList
  };
};

export const applyTestOverrides = (targetTest, currentTestId) => {
  if (!targetTest || !Array.isArray(targetTest.questions)) return targetTest;
  try {
    const raw = localStorage.getItem(`mpsc_test_overrides_${currentTestId}`);
    if (!raw) return targetTest;
    const overrides = JSON.parse(raw);
    if (!overrides) return targetTest;

    targetTest.questions = targetTest.questions.map((q, idx) => {
      const origIdx = q.originalQIndex !== undefined ? q.originalQIndex : idx;
      const textKey = (q.question || '').trim();
      const override = (overrides.byIndex && overrides.byIndex[origIdx]) || (overrides.byText && overrides.byText[textKey]);
      if (override) {
        return {
          ...q,
          question: override.question !== undefined ? override.question : q.question,
          options: override.options !== undefined ? override.options : q.options,
          correctOption: override.correctOption !== undefined ? override.correctOption : q.correctOption,
          explanation: override.explanation !== undefined ? override.explanation : q.explanation
        };
      }
      return q;
    });
  } catch (err) {
    console.warn("Error applying overrides:", err);
  }
  return targetTest;
};

export const applyTestOverridesToShuffled = (shuffledQuestions, currentTestId) => {
  if (!Array.isArray(shuffledQuestions)) return shuffledQuestions;
  try {
    const raw = localStorage.getItem(`mpsc_test_overrides_${currentTestId}`);
    if (!raw) return shuffledQuestions;
    const ovr = JSON.parse(raw);
    if (!ovr) return shuffledQuestions;

    return shuffledQuestions.map((q, idx) => {
      const origIdx = q.originalQIndex !== undefined ? q.originalQIndex : idx;
      const textKey = (q.question || '').trim();
      const match = (ovr.byIndex && ovr.byIndex[origIdx]) || (ovr.byText && ovr.byText[textKey]);
      if (match) {
        const updated = { ...q };
        if (match.question) updated.question = match.question;
        if (match.explanation) updated.explanation = match.explanation;
        if (match.options && (!q.optionMapping || match.options.length !== q.options.length)) {
          updated.options = match.options;
          updated.optionMapping = null;
          if (match.correctOption !== undefined) updated.correctOption = match.correctOption;
        } else if (match.correctOption !== undefined) {
          if (q.optionMapping) {
            const visualIdx = q.optionMapping.findIndex(orig => orig === match.correctOption);
            if (visualIdx !== -1) {
              updated.correctOption = visualIdx;
            } else {
              updated.correctOption = match.correctOption;
            }
          } else {
            updated.correctOption = match.correctOption;
          }
        }
        return updated;
      }
      return q;
    });
  } catch (e) {
    return shuffledQuestions;
  }
};

export const saveTestOverride = (currentTestId, originalQIdx, qText, overrideData) => {
  try {
    const key = `mpsc_test_overrides_${currentTestId}`;
    const existing = JSON.parse(localStorage.getItem(key) || '{"byIndex":{},"byText":{}}');
    if (!existing.byIndex) existing.byIndex = {};
    if (!existing.byText) existing.byText = {};

    existing.byIndex[originalQIdx] = { ...(existing.byIndex[originalQIdx] || {}), ...overrideData };
    if (qText) {
      existing.byText[qText] = { ...(existing.byText[qText] || {}), ...overrideData };
    }
    localStorage.setItem(key, JSON.stringify(existing));
  } catch (e) {
    console.warn("Failed to persist override:", e);
  }
};

export const updateTestInAllCaches = (currentTestId, originalQIdx, qText, updatePayload) => {
  const cacheKeys = ['mpsc_cached_mocks', 'mpsc_cached_practice'];
  cacheKeys.forEach(key => {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return;
      const list = JSON.parse(raw);
      if (!Array.isArray(list)) return;
      
      let modified = false;
      const updatedList = list.map(item => {
        if ((item._id || item.id) === currentTestId) {
          if (Array.isArray(item.questions)) {
            const updatedQuestions = item.questions.map((q, idx) => {
              const match = (idx === originalQIdx) || ((q.question || '').trim() === qText);
              if (match) {
                modified = true;
                return {
                  ...q,
                  question: updatePayload.question !== undefined ? updatePayload.question : q.question,
                  options: updatePayload.options !== undefined ? updatePayload.options : q.options,
                  correctOption: updatePayload.correctOption !== undefined ? updatePayload.correctOption : q.correctOption,
                  explanation: updatePayload.explanation !== undefined ? updatePayload.explanation : q.explanation
                };
              }
              return q;
            });
            return { ...item, questions: updatedQuestions };
          }
        }
        return item;
      });

      if (modified) {
        localStorage.setItem(key, JSON.stringify(updatedList));
      }
    } catch(e) {}
  });
};

export const updateMistakeBookForQuestion = (currentTestId, questionObj, userAns) => {
  try {
    const cachedMistakes = JSON.parse(localStorage.getItem('mpsc_cached_mistakes') || '[]');
    const isNowCorrect = userAns !== undefined && userAns === questionObj.correctOption;
    
    let changed = false;
    const updated = cachedMistakes.map(mock => {
      if ((mock._id || mock.id) === currentTestId || mock.parentTestId === currentTestId) {
        if (Array.isArray(mock.questions)) {
          if (isNowCorrect) {
            const filtered = mock.questions.filter(mq => (mq.question || '').trim() !== (questionObj.question || '').trim());
            if (filtered.length !== mock.questions.length) {
              changed = true;
              return { ...mock, questions: filtered, timeLimit: Math.max(filtered.length, 5) };
            }
          } else {
            const mapped = mock.questions.map(mq => {
              if ((mq.question || '').trim() === (questionObj.question || '').trim()) {
                changed = true;
                return {
                  ...mq,
                  correctOption: questionObj.correctOption,
                  options: questionObj.options || mq.options,
                  explanation: questionObj.explanation || mq.explanation
                };
              }
              return mq;
            });
            return { ...mock, questions: mapped };
          }
        }
      }
      return mock;
    }).filter(mock => !Array.isArray(mock.questions) || mock.questions.length > 0);

    if (changed) {
      localStorage.setItem('mpsc_cached_mistakes', JSON.stringify(updated));
      window.dispatchEvent(new Event('mpsc_mistakes_updated'));
      window.dispatchEvent(new Event('storage'));
    }
  } catch (e) {
    console.warn("Mistake book update error:", e);
  }
};

export const updateTestHistoryScore = (currentTestId, newStats) => {
  try {
    const testHistory = JSON.parse(localStorage.getItem('mpsc_test_history') || '[]');
    const targetIdx = testHistory.findIndex(h => h.testId === currentTestId);
    if (targetIdx !== -1) {
      testHistory[targetIdx] = {
        ...testHistory[targetIdx],
        score: newStats.netScore,
        grossScore: newStats.grossScore,
        penaltyScore: newStats.penaltyScore,
        correctCount: newStats.correctCount,
        wrongCount: newStats.wrongCount,
        unattemptedCount: newStats.unattemptedCount,
        accuracy: newStats.accuracy
      };
      localStorage.setItem('mpsc_test_history', JSON.stringify(testHistory));
      window.dispatchEvent(new Event('storage'));
    }
  } catch(e) {
    console.warn("Test history update error:", e);
  }
};

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
  const [editingCorrectOption, setEditingCorrectOption] = useState(null); // { qIndex, value }
  const [editingQuestionModalData, setEditingQuestionModalData] = useState(null); // full question edit
  const [activeQuestion, setActiveQuestion] = useState(0);
  const [showSuccessVideo, setShowSuccessVideo] = useState(false);
  const [testViewMode, setTestViewMode] = useState('question'); // 'question' | 'omr'
  const [markingScheme, setMarkingScheme] = useState('group_c'); // 'group_c' (+1/-0.25) | 'mpsc_rajyaseva' (+2/-0.66)
  const [showExitConfirmModal, setShowExitConfirmModal] = useState(false);
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
        let fetchedTest = null;
        const seedMatch = MPSC_SEED_MOCKS.find(m => (m._id || m.id) === testId);

        if (seedMatch) {
          fetchedTest = JSON.parse(JSON.stringify(seedMatch));
        } else {
          // 1. Check local cache first (instant response for dynamic tests & mistakes)
          try {
            const cachedMocks = JSON.parse(localStorage.getItem('mpsc_cached_mocks') || '[]');
            const cachedMatch = cachedMocks.find(m => (m._id || m.id) === testId);
            if (cachedMatch) {
              fetchedTest = JSON.parse(JSON.stringify(cachedMatch));
            } else {
              const cachedMistakes = JSON.parse(localStorage.getItem('mpsc_cached_mistakes') || '[]');
              const mistakeMatch = cachedMistakes.find(m => (m._id || m.id) === testId);
              if (mistakeMatch) {
                fetchedTest = JSON.parse(JSON.stringify(mistakeMatch));
              } else {
                const cachedPractice = JSON.parse(localStorage.getItem('mpsc_cached_practice') || '[]');
                const practiceMatch = cachedPractice.find(m => (m._id || m.id) === testId);
                if (practiceMatch) {
                  fetchedTest = JSON.parse(JSON.stringify(practiceMatch));
                }
              }
            }
          } catch (cacheErr) {
            console.warn("Local mock cache read error:", cacheErr?.message);
          }

          // 2. Fetch from backend if not found locally or to sync updates
          if (!fetchedTest) {
            try {
              const res = await axios.get(`https://mpsc-manager.onrender.com/api/custom-tests/${testId}`, { timeout: 7000 });
              if (res.data.success) {
                fetchedTest = res.data.data;
              }
            } catch (netErr) {
              console.warn("Backend test fetch fallback:", netErr?.message);
              // Fallback to first seed mock test
              fetchedTest = JSON.parse(JSON.stringify(MPSC_SEED_MOCKS[0]));
            }
          }
        }

        // Apply persistent overrides so user fixes/edits always load even for seed mocks!
        if (fetchedTest) {
          fetchedTest = applyTestOverrides(fetchedTest, testId);
        }

        if (fetchedTest && fetchedTest.markingScheme) {
          setMarkingScheme(fetchedTest.markingScheme === 'mpsc_rajyaseva' ? 'group_c' : fetchedTest.markingScheme);
        }

        if (fetchedTest) {
          const sessionKey = `mpsc_active_test_${testId}`;
          const savedSessionRaw = localStorage.getItem(sessionKey);
          let sessionRestored = false;

          // Check for existing ongoing session (e.g. after refresh)
          if (savedSessionRaw) {
            try {
              const session = JSON.parse(savedSessionRaw);
              if (session && Array.isArray(session.questions) && session.questions.length > 0) {
                const elapsedSeconds = Math.max(0, Math.floor((Date.now() - (session.lastSavedTimestamp || Date.now())) / 1000));
                const remainingTime = Math.max(0, (session.timeLeft ?? (fetchedTest.timeLimit * 60)) - elapsedSeconds);
                
                // Ensure overrides apply to restored session too
                session.questions = applyTestOverridesToShuffled(session.questions, testId);
                fetchedTest.questions = session.questions;
                setTest(fetchedTest);
                setAnswers(session.answers || {});
                setReviews(session.reviews || {});
                setTimeLeft(remainingTime);
                if (typeof session.activeQuestion === 'number') {
                  setActiveQuestion(session.activeQuestion);
                }
                if (session.markingScheme) {
                  setMarkingScheme(session.markingScheme === 'mpsc_rajyaseva' ? 'group_c' : session.markingScheme);
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
               const questionsWithIdx = fetchedTest.questions.map((q, qIndex) => ({ q, originalQIndex: qIndex }));
               questionsWithIdx.sort(() => Math.random() - 0.5);
               
               fetchedTest.questions = questionsWithIdx.map(item => {
                 const q = item.q;
                 q.originalQIndex = item.originalQIndex;
                 
                 if (q.options && q.options.length > 0) {
                   const optionsWithIdx = q.options.map((opt, i) => ({ opt, originalIndex: i }));
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
                activeQuestion: 0,
                markingScheme: fetchedTest.markingScheme || 'mpsc_rajyaseva'
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
    const isRajyaseva = markingScheme === 'mpsc_rajyaseva';
    const marksPerCorrect = isRajyaseva ? 2.0 : 1.0;
    const penaltyPerWrong = isRajyaseva ? 0.66 : 0.25;
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;
    
    // Create payload for backend with mapped original indexes and collect wrong questions for Mistake Book
    const backendAnswers = {};
    const wrongQuestionsList = [];

    test.questions.forEach((q, visualIdx) => {
      if (answers[visualIdx] === undefined) {
        unattemptedCount++;
      } else if (answers[visualIdx] === q.correctOption) {
        correctCount++;
      } else {
        wrongCount++;
        wrongQuestionsList.push({
          question: q.question,
          options: q.options,
          correctOption: q.correctOption,
          userSelectedOption: answers[visualIdx],
          explanation: q.explanation || '',
          subject: q.subject || test.subject || 'General',
          topic: q.topic || test.topic || test.title || 'General Practice',
          markingScheme: markingScheme
        });
      }
      
      // Map to backend structure
      if (answers[visualIdx] !== undefined) {
        const originalQIdx = q.originalQIndex !== undefined ? q.originalQIndex : visualIdx;
        const originalOIdx = q.optionMapping ? q.optionMapping[answers[visualIdx]] : answers[visualIdx];
        backendAnswers[originalQIdx] = originalOIdx;
      }
    });

    const grossScore = correctCount * marksPerCorrect;
    const penaltyScore = Number((wrongCount * penaltyPerWrong).toFixed(2));
    const currentScore = Number((grossScore - penaltyScore).toFixed(2));
    const maxScore = test.questions.length * marksPerCorrect;

    setScore(currentScore);
    setSubmitted(true);
    
    // Clean up active session from localStorage so test won't resume after final submission
    try {
      localStorage.removeItem(`mpsc_active_test_${testId}`);
    } catch(e) {}

    if (!isMistake) {
      setShowSuccessVideo(true);
    }

    const usr = auth.currentUser;
    const currentUserId = usr?.uid || 'anonymous';
    const userName = usr?.displayName ? usr.displayName.split(' ')[0] : 'परीक्षार्थी';

    // 1. Mark test as SOLVED / DONE immediately in localStorage
    try {
      const solvedList = JSON.parse(localStorage.getItem('mpsc_solved_tests') || '[]');
      if (testId && !solvedList.includes(testId)) solvedList.push(testId);
      if (test?._id && !solvedList.includes(test._id)) solvedList.push(test._id);
      if (test?.id && !solvedList.includes(test.id)) solvedList.push(test.id);
      localStorage.setItem('mpsc_solved_tests', JSON.stringify(solvedList));
    } catch(e) {}

    // 2. Mark in mpsc_cached_mocks so MockTests.jsx shows isSolved = true
    try {
      const cachedMocks = JSON.parse(localStorage.getItem('mpsc_cached_mocks') || '[]');
      let mockFound = false;
      const updatedMocks = cachedMocks.map(m => {
        if ((m._id || m.id) === testId) {
          mockFound = true;
          const attempted = Array.isArray(m.attemptedBy) ? [...m.attemptedBy] : [];
          if (!attempted.includes(currentUserId)) attempted.push(currentUserId);
          if (!attempted.includes('anonymous')) attempted.push('anonymous');
          return { ...m, attemptedBy: attempted, isSolved: true };
        }
        return m;
      });
      if (!mockFound && test) {
        const attempted = Array.isArray(test.attemptedBy) ? [...test.attemptedBy] : [];
        if (!attempted.includes(currentUserId)) attempted.push(currentUserId);
        if (!attempted.includes('anonymous')) attempted.push('anonymous');
        updatedMocks.unshift({ ...test, attemptedBy: attempted, isSolved: true });
      }
      localStorage.setItem('mpsc_cached_mocks', JSON.stringify(updatedMocks));
    } catch(e) {}

    // 3. Mark in mpsc_cached_practice so Practice.jsx shows isSolved = true
    try {
      const cachedPractice = JSON.parse(localStorage.getItem('mpsc_cached_practice') || '[]');
      let practiceFound = false;
      const updatedPractice = cachedPractice.map(p => {
        if ((p._id || p.id) === testId) {
          practiceFound = true;
          const attempted = Array.isArray(p.attemptedBy) ? [...p.attemptedBy] : [];
          if (!attempted.includes(currentUserId)) attempted.push(currentUserId);
          if (!attempted.includes('anonymous')) attempted.push('anonymous');
          return { ...p, attemptedBy: attempted, isSolved: true };
        }
        return p;
      });
      if (!practiceFound && test) {
        const attempted = Array.isArray(test.attemptedBy) ? [...test.attemptedBy] : [];
        if (!attempted.includes(currentUserId)) attempted.push(currentUserId);
        if (!attempted.includes('anonymous')) attempted.push('anonymous');
        updatedPractice.unshift({ ...test, attemptedBy: attempted, isSolved: true });
      }
      localStorage.setItem('mpsc_cached_practice', JSON.stringify(updatedPractice));
    } catch(e) {}

    try {
      window.dispatchEvent(new Event('mpsc_test_submitted'));
      window.dispatchEvent(new Event('storage'));
    } catch(e) {}

    // 4. Update Practice Accuracy & Test History for Analytics
    const testPercent = maxScore > 0 ? Math.max(0, (currentScore / maxScore) * 100) : 0;
    const oldAccuracy = parseFloat(localStorage.getItem('practice_accuracy')) || 0;
    const testsTaken = parseInt(localStorage.getItem('tests_taken')) || 0;
    const newAccuracy = testsTaken === 0 ? testPercent : ((oldAccuracy * testsTaken) + testPercent) / (testsTaken + 1);

    try {
      localStorage.setItem('practice_accuracy', newAccuracy.toFixed(1));
      localStorage.setItem('tests_taken', (testsTaken + 1).toString());

      const totalAllocatedSeconds = (test?.timeLimit ? test.timeLimit * 60 : 0);
      const timeSpent = Math.max(1, totalAllocatedSeconds - timeLeft);
      const totalAttempted = correctCount + wrongCount;
      const avgSecondsPerQ = totalAttempted > 0 ? Math.round(timeSpent / totalAttempted) : 45;

      const testHistory = JSON.parse(localStorage.getItem('mpsc_test_history') || '[]');
      testHistory.unshift({
        testId,
        title: test.title || 'MPSC Test',
        subject: test.subject || 'General Studies',
        grossScore,
        penaltyScore,
        score: currentScore,
        maxScore,
        accuracy: Number(testPercent.toFixed(1)),
        correctCount,
        wrongCount,
        unattemptedCount,
        markingScheme,
        timeSpentSeconds: timeSpent,
        avgSecondsPerQ,
        date: new Date().toLocaleDateString('mr-IN'),
        timestamp: Date.now()
      });
      localStorage.setItem('mpsc_test_history', JSON.stringify(testHistory.slice(0, 30)));

      // Record in mpsc_solved_tests set
      try {
        const solvedList = JSON.parse(localStorage.getItem('mpsc_solved_tests') || '[]');
        if (!solvedList.includes(testId)) {
          solvedList.push(testId);
          localStorage.setItem('mpsc_solved_tests', JSON.stringify(solvedList));
        }
      } catch (e) {}
    } catch (histErr) {
      console.warn("Failed to store test history", histErr);
    }

    // 5. 📕 AUTO-SAVE WRONG QUESTIONS INTO MISTAKE BOOK
    if (wrongQuestionsList.length > 0 && !isMistake) {
      try {
        const cachedMistakes = JSON.parse(localStorage.getItem('mpsc_cached_mistakes') || '[]');
        const existingIdx = cachedMistakes.findIndex(m => m.parentTestId === testId);

        if (existingIdx !== -1) {
          const existingMock = cachedMistakes[existingIdx];
          const mergedQuestions = [...existingMock.questions];
          wrongQuestionsList.forEach(wq => {
            if (!mergedQuestions.some(q => q.question === wq.question)) {
              mergedQuestions.push(wq);
            }
          });
          existingMock.questions = mergedQuestions;
          existingMock.timeLimit = Math.max(mergedQuestions.length, 5);
          existingMock.updatedAt = new Date().toISOString();
          cachedMistakes[existingIdx] = existingMock;
        } else {
          const mistakeId = `mistake_${testId}_${Date.now()}`;
          const newMistakeMock = {
            id: mistakeId,
            _id: mistakeId,
            title: `Mistakes: ${test.title || 'MPSC Test'}`,
            subject: test.subject || 'सामान्य अध्ययन',
            topic: test.topic || `${test.title || 'Test'} चुका रिव्हिजन`,
            timeLimit: Math.max(wrongQuestionsList.length, 5),
            questions: wrongQuestionsList,
            markingScheme: markingScheme,
            isMistakeMock: true,
            parentTestId: testId,
            createdBy: currentUserId,
            createdAt: new Date().toISOString(),
            attemptedBy: []
          };
          cachedMistakes.unshift(newMistakeMock);
        }
        localStorage.setItem('mpsc_cached_mistakes', JSON.stringify(cachedMistakes));

        // ALSO save to mpsc_cached_mocks so /test/:id can open it directly!
        const cachedMocks = JSON.parse(localStorage.getItem('mpsc_cached_mocks') || '[]');
        cachedMistakes.forEach(mm => {
          if (!cachedMocks.some(m => (m._id || m.id) === mm.id)) {
            cachedMocks.unshift(mm);
          }
        });
        localStorage.setItem('mpsc_cached_mocks', JSON.stringify(cachedMocks));

        // Background sync to backend Firestore so it persists everywhere
        const toSync = cachedMistakes[existingIdx !== -1 ? existingIdx : 0];
        if (toSync) {
          axios.post('https://mpsc-manager.onrender.com/api/custom-tests', {
            title: toSync.title,
            subject: toSync.subject,
            topic: toSync.topic,
            timeLimit: toSync.timeLimit,
            questions: toSync.questions,
            markingScheme: toSync.markingScheme,
            isMistakeMock: true,
            parentTestId: testId,
            createdBy: currentUserId,
            creatorName: userName
          }).catch(err => console.warn("Backend mistake sync notice:", err?.message));
        }

        try {
          window.dispatchEvent(new Event('mpsc_mistakes_updated'));
          window.dispatchEvent(new Event('storage'));
        } catch(e) {}

        toast.success(`📕 ${wrongQuestionsList.length} चुकीचे प्रश्न Mistake Book मध्ये सेव्ह झाले!`, { icon: '📝', duration: 4000 });
      } catch (mistakeErr) {
        console.warn("Failed to store local mistake mock", mistakeErr);
      }
    } else if (isMistake) {
      try {
        const cachedMistakes = JSON.parse(localStorage.getItem('mpsc_cached_mistakes') || '[]');
        if (wrongQuestionsList.length === 0) {
          const filtered = cachedMistakes.filter(m => (m._id || m.id) !== testId);
          localStorage.setItem('mpsc_cached_mistakes', JSON.stringify(filtered));
          toast.success("🎉 उत्कृष्ट! सर्व चुका दुरुस्त झाल्या. Mistake Book मधून टेस्ट क्लिअर झाली!", { icon: '✨', duration: 5000 });
        } else {
          const updated = cachedMistakes.map(m => {
            if ((m._id || m.id) === testId) {
              return {
                ...m,
                questions: wrongQuestionsList,
                timeLimit: Math.max(wrongQuestionsList.length, 5),
                updatedAt: new Date().toISOString()
              };
            }
            return m;
          });
          localStorage.setItem('mpsc_cached_mistakes', JSON.stringify(updated));
          toast.success(`प्रगती! आता फक्त ${wrongQuestionsList.length} चुका रिव्हिजनसाठी बाकी आहेत.`, { icon: '🎯', duration: 4000 });
        }
      } catch (err) {}
    }

    // 6. ⚡ ADD XP POINTS ACROSS CORE SUBJECTS WITH 0ms SYNCHRONOUS PERSISTENCE
    let batchUpdates = {
      practice_accuracy: newAccuracy.toFixed(1),
      tests_taken: testsTaken + 1
    };

    if (!isMistake) {
      const { totalGained, subjectGains, batchUpdates: xpBatch } = recordTestXp({
        testSubject: test.subject,
        testTitle: test.title,
        questions: test.questions,
        answers: answers,
        netScore: currentScore,
        marksPerCorrect
      });

      batchUpdates = { ...batchUpdates, ...xpBatch };

      if (totalGained > 0) {
        import('../utils/sound').then(({ playSound }) => playSound.playXpGain()).catch(() => {});
        const subList = Object.keys(subjectGains).filter(k => subjectGains[k] > 0);
        const subNames = subList.join(', ');
        toast.success(`🎉 +${totalGained} XP प्राप्त झाले! (${subNames})`, { icon: '⚡', duration: 4000 });
      }
    }
    
    import('../utils/dbStore').then(({ saveMultipleToDB }) => saveMultipleToDB(batchUpdates)).catch(() => {});

    // 7. Sync with server in background
    try {
      const totalAllocatedSeconds = (test?.timeLimit ? test.timeLimit * 60 : 0);
      const timeSpent = Math.max(1, totalAllocatedSeconds - timeLeft);

      const res = await axios.post(`https://mpsc-manager.onrender.com/api/custom-tests/${testId}/submit`, {
        answers: backendAnswers,
        userId: currentUserId,
        userName: userName,
        timeTaken: timeSpent,
        testTitle: test.title,
        subject: test.subject,
        markingScheme: markingScheme,
        wrongQuestions: wrongQuestionsList
      });

      if (res.data.success) {
        setRankData({
          userRank: isMistake ? null : res.data.userRank,
          totalParticipants: isMistake ? 0 : (res.data.totalParticipants || 0),
          isQualified: isMistake ? false : res.data.isQualified,
          leaderboard: isMistake ? [] : (res.data.leaderboard || [])
        });

        if (!isMistake && res.data.userRank) {
          toast.success(`🏆 तुमचा रँक: #${res.data.userRank} (${res.data.totalParticipants} विद्यार्थ्यांपैकी)`, { duration: 4000, icon: '🏅' });
        }
      }
    } catch(err) {
      console.warn("Backend submit sync notice (saved locally):", err?.message);
    }
  };

  // Fix incorrect answer in the question bank
  const handleFixAnswer = async (qIndex) => {
    if (!editingCorrectOption || editingCorrectOption.qIndex !== qIndex) return;
    const newCorrect = editingCorrectOption.value;
    const q = test.questions[qIndex];
    if (!q) return;

    // Map back to original DB indices
    const originalQIdx = q.originalQIndex !== undefined ? q.originalQIndex : qIndex;
    const originalCorrect = q.optionMapping ? q.optionMapping[newCorrect] : newCorrect;
    const qText = (q.question || '').trim();
    
    // 1. Update UI state immediately
    const updatedQuestions = [...test.questions];
    updatedQuestions[qIndex] = { ...q, correctOption: newCorrect };
    setTest(prev => ({ ...prev, questions: updatedQuestions }));
    setEditingCorrectOption(null);

    // 2. Persist in local overrides for this test (so retakes always have the right answer!)
    saveTestOverride(testId, originalQIdx, qText, {
      correctOption: originalCorrect
    });

    // 3. Update all mock/practice caches
    updateTestInAllCaches(testId, originalQIdx, qText, {
      correctOption: originalCorrect
    });

    // 4. Recalculate score immediately if test was submitted
    if (submitted) {
      const prevScore = score;
      const newStats = calculateTestScore(updatedQuestions, answers, markingScheme);
      setScore(newStats.netScore);

      // Update test history
      updateTestHistoryScore(testId, newStats);

      // Update Mistake Book (remove if now correct, or update)
      updateMistakeBookForQuestion(testId, updatedQuestions[qIndex], answers[qIndex]);

      const diff = Number((newStats.netScore - prevScore).toFixed(2));
      let scoreMsg = '';
      if (diff > 0) {
        scoreMsg = `🎯 उत्तर अपडेट झाले! स्कोअर: ${prevScore} ➔ ${newStats.netScore} (+${diff} गुण वाढले!) 🎉`;
      } else if (diff < 0) {
        scoreMsg = `🎯 उत्तर अपडेट झाले! स्कोअर: ${prevScore} ➔ ${newStats.netScore} (${diff} गुण कमी झाले)`;
      } else {
        scoreMsg = `🎯 उत्तर अपडेट झाले! नवीन स्कोअर: ${newStats.netScore} गुण.`;
      }
      toast.success(scoreMsg, { id: 'fix-ans', duration: 4500, icon: '⚡' });
    } else {
      toast.success('✅ उत्तर यशस्वीरित्या दुरुस्त केले!', { id: 'fix-ans' });
    }

    try {
      const res = await axios.patch(
        `https://mpsc-manager.onrender.com/api/custom-tests/${testId}/fix-answer`,
        { questionIndex: originalQIdx, newCorrectOption: originalCorrect }
      );
      if (!res.data.success) {
        console.warn('Backend fix warning:', res.data.message);
      }
    } catch (err) {
      console.warn('Backend fix answer sync notice (saved locally):', err?.message);
    }
  };

  // Full Question & Options Edit
  const handleSaveQuestionEdit = async (updatedData) => {
    const { qIndex, question, options, correctOption, explanation } = updatedData;
    const q = test.questions[qIndex];
    if (!q) return;

    const originalQIdx = q.originalQIndex !== undefined ? q.originalQIndex : qIndex;
    const qText = (q.question || '').trim();
    
    // In current test state:
    const updatedQuestions = [...test.questions];
    updatedQuestions[qIndex] = {
      ...q,
      question,
      options,
      correctOption,
      optionMapping: null, // explicit options replaced
      explanation
    };

    setTest(prev => ({ ...prev, questions: updatedQuestions }));
    setEditingQuestionModalData(null);

    // 1. Save to persistent overrides
    saveTestOverride(testId, originalQIdx, qText, {
      question,
      options,
      correctOption,
      explanation
    });

    // 2. Update all mock/practice caches
    updateTestInAllCaches(testId, originalQIdx, qText, {
      question,
      options,
      correctOption,
      explanation
    });

    // 3. Recalculate score immediately if test was submitted
    if (submitted) {
      const prevScore = score;
      const newStats = calculateTestScore(updatedQuestions, answers, markingScheme);
      setScore(newStats.netScore);

      updateTestHistoryScore(testId, newStats);
      updateMistakeBookForQuestion(testId, updatedQuestions[qIndex], answers[qIndex]);

      const diff = Number((newStats.netScore - prevScore).toFixed(2));
      let scoreMsg = '';
      if (diff > 0) {
        scoreMsg = `✅ प्रश्न अपडेट झाला! स्कोअर: ${prevScore} ➔ ${newStats.netScore} (+${diff} गुण वाढले!) 🎉`;
      } else if (diff < 0) {
        scoreMsg = `✅ प्रश्न अपडेट झाला! स्कोअर: ${prevScore} ➔ ${newStats.netScore} (${diff} गुण)`;
      } else {
        scoreMsg = `✅ प्रश्न व पर्याय सेव्ह झाले! स्कोअर: ${newStats.netScore} गुण.`;
      }
      toast.success(scoreMsg, { id: 'edit-q-toast', duration: 4500, icon: '🎯' });
    } else {
      // If ongoing test, update active session in localStorage immediately
      try {
        const sessionKey = `mpsc_active_test_${testId}`;
        const savedSessionRaw = localStorage.getItem(sessionKey);
        if (savedSessionRaw) {
          const session = JSON.parse(savedSessionRaw);
          session.questions = updatedQuestions;
          localStorage.setItem(sessionKey, JSON.stringify(session));
        }
      } catch(e) {}
      toast.success('✅ प्रश्न, पर्याय व बरोबर उत्तर तात्काळ सेव्ह झाले! टेस्ट सुरू ठेवा.', { id: 'edit-q-toast', duration: 4500, icon: '🎯' });
    }

    // 4. Sync to Backend
    try {
      await axios.patch(
        `https://mpsc-manager.onrender.com/api/custom-tests/${testId}/edit-question`,
        {
          questionIndex: originalQIdx,
          question,
          options,
          correctOption,
          explanation
        }
      );
    } catch (err) {
      console.warn("Backend edit sync note (saved locally):", err?.message);
    }
  };

  // Re-attempt test cleanly with all updated questions/answers
  const handleReattemptTest = () => {
    try {
      localStorage.removeItem(`mpsc_active_test_${testId}`);
    } catch(e) {}

    let freshQuestions = JSON.parse(JSON.stringify(test?.questions || []));
    if (freshQuestions.length > 0) {
      const questionsWithIdx = freshQuestions.map((q, idx) => ({ 
        q, 
        originalQIndex: q.originalQIndex !== undefined ? q.originalQIndex : idx 
      }));
      questionsWithIdx.sort(() => Math.random() - 0.5);

      freshQuestions = questionsWithIdx.map(item => {
        const q = item.q;
        q.originalQIndex = item.originalQIndex;
        if (q.options && q.options.length > 0) {
          const optionsWithIdx = q.options.map((opt, i) => ({ opt, originalIndex: i }));
          optionsWithIdx.sort(() => Math.random() - 0.5);
          const newCorrectIndex = optionsWithIdx.findIndex(o => o.originalIndex === q.correctOption);
          q.options = optionsWithIdx.map(o => o.opt);
          q.optionMapping = optionsWithIdx.map(o => o.originalIndex);
          if (newCorrectIndex !== -1) {
            q.correctOption = newCorrectIndex;
          }
        }
        return q;
      });
    }

    setTest(prev => ({ ...prev, questions: freshQuestions }));
    setAnswers({});
    setReviews({});
    setSubmitted(false);
    setShowAnswers(false);
    setScore(0);
    setActiveQuestion(0);
    setEditingCorrectOption(null);
    setEditingQuestionModalData(null);
    const initialTime = (test?.timeLimit || 15) * 60;
    setTimeLeft(initialTime);

    try {
      localStorage.setItem(`mpsc_active_test_${testId}`, JSON.stringify({
        testId,
        questions: freshQuestions,
        answers: {},
        reviews: {},
        timeLeft: initialTime,
        lastSavedTimestamp: Date.now(),
        activeQuestion: 0,
        markingScheme: markingScheme || 'group_c'
      }));
    } catch(e) {}

    window.scrollTo({ top: 0, behavior: 'smooth' });
    toast.success("🔄 टेस्ट पुन्हा सुरू झाली! सुधारित प्रश्नांसह सराव करा.", { icon: '🎯', duration: 4000 });
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
              <button 
                onClick={() => {
                  if (!submitted && Object.keys(answers).length > 0) {
                    setShowExitConfirmModal(true);
                  } else {
                    navigate(-1);
                  }
                }} 
                className="test-back-btn" 
                title="Go Back"
              >
                <FiArrowLeft size={20} />
              </button>
              <div className="test-title-meta">
                <h2 className="test-fixed-title" title={test.title}>
                  {(test.title || '')
                    .replace(/🔥\s*/g, '')
                    .replace(/\s*-\s*[\u0966-\u096F0-9]{1,2}[\/\-\.][\u0966-\u096F0-9]{1,2}[\/\-\.][\u0966-\u096F0-9]{2,4}/g, '')
                    .replace(/\s*-\s*\d{1,2}\s+(जानेवारी|फेब्रुवारी|मार्च|एप्रिल|मे|जून|जुलै|ऑगस्ट|सप्टेंबर|ऑक्टोबर|नोव्हेंबर|डिसेंबर)\s+\d{2,4}/gi, '')
                    .trim()}
                </h2>
                {test.questions && test.questions.length > 0 && (
                  <span className="test-q-badge">
                    प्रश्न {activeQuestion + 1} / {test.questions.length}
                  </span>
                )}
              </div>
            </div>

            <div className="test-top-right" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {/* View Switcher Pill */}
              {(!submitted || showAnswers) && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  background: 'rgba(0, 0, 0, 0.45)',
                  padding: '3px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.12)'
                }}>
                  <button
                    type="button"
                    onClick={() => setTestViewMode('question')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: testViewMode === 'question' ? 'var(--accent-primary)' : 'transparent',
                      color: testViewMode === 'question' ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.2s'
                    }}
                    title="प्रश्नपत्रिका दृश्य"
                  >
                    📝 प्रश्न
                  </button>
                  <button
                    type="button"
                    onClick={() => setTestViewMode('omr')}
                    style={{
                      padding: '5px 12px',
                      borderRadius: '8px',
                      border: 'none',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      background: testViewMode === 'omr' ? 'var(--accent-primary)' : 'transparent',
                      color: testViewMode === 'omr' ? '#fff' : 'var(--text-secondary)',
                      transition: 'all 0.2s'
                    }}
                    title="MPSC OMR शीट सिम्युलेटर"
                  >
                    ⭕ OMR
                  </button>
                </div>
              )}

              {/* Marking Scheme Badge */}
              <button
                type="button"
                onClick={() => {
                  if (!submitted) {
                    const next = markingScheme === 'group_c' ? 'mpsc_rajyaseva' : 'group_c';
                    setMarkingScheme(next);
                    toast.success(next === 'group_c' ? '🎯 MPSC अधिकृत मार्किंग: +१.०० / -०.२५' : '⚡ राज्यसेवा मार्किंग: +२.०० / -०.६६');
                  }
                }}
                disabled={submitted}
                title={submitted ? 'मार्किंग पद्धत' : 'क्लिक करून मार्किंग पद्धत बदला'}
                style={{
                  background: markingScheme === 'group_c' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: markingScheme === 'group_c' ? '#38bdf8' : '#fbbf24',
                  border: markingScheme === 'group_c' ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(245, 158, 11, 0.35)',
                  padding: '5px 10px',
                  borderRadius: '10px',
                  fontSize: '0.72rem',
                  fontWeight: 800,
                  cursor: submitted ? 'default' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <span>⚡</span>
                {markingScheme === 'group_c' ? '+१ / -०.२५' : '+२ / -०.६६'}
              </button>

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
                        if (testViewMode === 'omr') {
                          setTestViewMode('question');
                        }
                        setTimeout(() => {
                          const el = document.getElementById(`q-${idx}`);
                          if (el) {
                            const yOffset = -140;
                            const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
                            window.scrollTo({ top: y, behavior: 'smooth' });
                          }
                        }, 50);
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
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Main View Switcher Bar (Always accessible during exam and review) */}
          {(!submitted || showAnswers) && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-secondary)',
              padding: '10px 16px',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setTestViewMode('question')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: testViewMode === 'question' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: testViewMode === 'question' ? '#fff' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  📝 प्रश्नपत्रिका दृश्य
                </button>
                <button
                  type="button"
                  onClick={() => setTestViewMode('omr')}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '10px',
                    border: 'none',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    background: testViewMode === 'omr' ? 'var(--accent-primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: testViewMode === 'omr' ? '#fff' : 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s'
                  }}
                >
                  ⭕ MPSC OMR शीट सिम्युलेटर
                </button>
              </div>

              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {testViewMode === 'omr' 
                  ? '💡 टीप: OMR वर्तुळे भरून उत्तर नोंदवा. प्रत्यक्ष परीक्षेचा अनुभव घ्या!'
                  : '💡 टीप: वरील OMR बटनावर क्लिक करून तुम्ही वर्तुळ उत्तरपत्रिका उघडू शकता.'}
              </div>
            </div>
          )}

          {/* Results Summary Modal / Card */}
          {submitted && !showAnswers && (() => {
            const isRajyaseva = markingScheme === 'mpsc_rajyaseva';
            const marksPerCorrect = isRajyaseva ? 2.0 : 1.0;
            const penaltyPerWrong = isRajyaseva ? 0.66 : 0.25;
            let correctCount = 0, wrongCount = 0, unattemptedCount = 0;
            test.questions.forEach((q, idx) => {
              if (answers[idx] === undefined) { unattemptedCount++; }
              else if (answers[idx] === q.correctOption) { correctCount++; }
              else { wrongCount++; }
            });
            const gross = correctCount * marksPerCorrect;
            const deducted = Number((wrongCount * penaltyPerWrong).toFixed(2));
            const maxScore = test.questions.length * marksPerCorrect;
            const finalFormattedScore = (score % 1 === 0) ? score : score.toFixed(2);
            const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
            const attempted = correctCount + wrongCount;
            const accuracy = attempted > 0 ? ((correctCount / attempted) * 100).toFixed(1) : '0';
            const emoji = percent >= 80 ? '🏆' : percent >= 40 ? '👍' : '📚';
            const color = percent >= 80 ? 'var(--success)' : percent >= 40 ? 'var(--warning)' : 'var(--danger)';
            const msg = percent >= 80 ? 'उत्कृष्ट कामगिरी! MPSC कट-ऑफच्या खूप पुढे आहात.' : percent >= 40 ? 'छान प्रयत्न! निगेटिव्ह मार्किंग कमी करून आणखी सराव करा.' : 'अभ्यास वाढवा — निगेटिव्ह मार्किंगवर नियंत्रण ठेवा!';
            
            return (
              <div className="glass-card flex-col align-center" style={{ padding: '36px 24px', textAlign: 'center', animation: 'fadeIn 0.5s', position: 'relative', borderRadius: '24px' }}>
                {!isMistake && percent >= 80 && <Confetti width={width} height={height} recycle={false} numberOfPieces={500} gravity={0.15} />}

                {/* Big Score */}
                <div style={{ fontSize: '4.5rem', lineHeight: 1, marginBottom: '6px' }}>{emoji}</div>
                <h1 style={{ fontSize: '3.8rem', margin: '8px 0 4px', color: 'var(--text-primary)', fontWeight: 900, letterSpacing: '-2px' }}>
                  {finalFormattedScore}
                  <span style={{ fontSize: '1.5rem', color: 'var(--text-muted)', fontWeight: 400 }}> / {maxScore}</span>
                </h1>

                {/* Marking Scheme Badge */}
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  background: markingScheme === 'group_c' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                  color: markingScheme === 'group_c' ? '#38bdf8' : '#fbbf24',
                  padding: '5px 16px',
                  borderRadius: '20px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  marginBottom: '10px',
                  border: markingScheme === 'group_c' ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)'
                }}>
                  ⚡ {markingScheme === 'group_c' ? 'गट-क / सरळसेवा मार्किंग (+१.०० / -०.२५, १/४ Negative)' : 'MPSC अधिकृत निगेटिव्ह मार्किंग (+२.०० / -०.६६, १/३ Negative)'}
                </div>

                <p style={{ color, fontWeight: 700, fontSize: '1.05rem', margin: '0 0 20px' }}>{msg}</p>

                {/* 4 Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', width: '100%', maxWidth: '440px', marginBottom: '16px' }}>
                  {[
                    { label: `✅ बरोबर (${correctCount})`, val: `+${gross.toFixed(2)}`, c: 'rgba(34,197,94,0.12)', tc: 'var(--success)' },
                    { label: `❌ निगेटिव्ह (${wrongCount})`, val: `-${deducted}`, c: 'rgba(239,68,68,0.1)', tc: 'var(--danger)' },
                    { label: '⏭ सोडले', val: unattemptedCount, c: 'var(--glass-bg)', tc: 'var(--text-muted)' },
                    { label: '🎯 अचूकता', val: `${accuracy}%`, c: 'rgba(59,130,246,0.1)', tc: 'var(--info)' },
                  ].map(s => (
                    <div key={s.label} style={{ background: s.c, border: '1px solid var(--border-color)', borderRadius: '12px', padding: '10px 4px', textAlign: 'center' }}>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: s.tc }}>{s.val}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Net Score Row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', maxWidth: '440px', background: 'var(--glass-bg)', borderRadius: '12px', padding: '10px 16px', border: '1px solid var(--border-color)', fontSize: '0.88rem', marginBottom: '16px' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Gross <strong style={{ color: 'var(--success)' }}>+{gross.toFixed(2)}</strong> &nbsp;—&nbsp; {markingScheme === 'group_c' ? '१/४' : '१/३'} निगेटिव्ह <strong style={{ color: 'var(--danger)' }}>-{deducted}</strong>
                  </span>
                  <span style={{ fontWeight: 800, color: 'var(--accent-primary)', fontSize: '1.05rem' }}>Net: {finalFormattedScore}</span>
                </div>

                {/* Rank Banner */}
                {!isMistake && rankData.userRank && (
                  <div className="test-rank-banner" style={{ width: '100%', maxWidth: '440px', marginBottom: '12px' }}>
                    <div className="rank-left-section">
                      <div className="rank-trophy-badge">
                        {rankData.userRank === 1 ? '🥇' : rankData.userRank === 2 ? '🥈' : rankData.userRank === 3 ? '🥉' : '🏆'}
                      </div>
                      <div>
                        <div className="rank-sub-title">महा-रँक</div>
                        <div className="rank-number-display">#{rankData.userRank} <span className="rank-total-count">/ {rankData.totalParticipants}</span></div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginTop: '12px' }}>
                  <button onClick={() => navigate('/practice')} className="btn" style={{ padding: '10px 20px', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
                    ← दुसरी टेस्ट
                  </button>
                  <button 
                    onClick={() => { setShowAnswers(true); setTestViewMode('omr'); }} 
                    className="btn" 
                    style={{ padding: '10px 18px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.3)', fontWeight: 700 }}
                  >
                    ⭕ OMR शीट पहा
                  </button>
                  <button onClick={() => { setShowAnswers(true); setTestViewMode('question'); }} className="btn btn-primary" style={{ padding: '10px 24px', fontWeight: 700 }}>
                    📝 उत्तरे व स्पष्टीकरणे →
                  </button>
                  <button 
                    onClick={handleReattemptTest} 
                    className="btn" 
                    style={{ 
                      padding: '10px 20px', 
                      background: 'linear-gradient(135deg, #f59e0b, #d97706)', 
                      color: '#fff', 
                      border: 'none', 
                      fontWeight: 700, 
                      borderRadius: '8px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '6px', 
                      boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 ही टेस्ट पुन्हा सोडवा
                  </button>
                </div>
              </div>
            );
          })()}

          {/* 🌟 Live Updated Score Recap Banner (Visible in review mode after submit) */}
          {submitted && showAnswers && (() => {
            const isRajyaseva = markingScheme === 'mpsc_rajyaseva';
            const marksPerCorrect = isRajyaseva ? 2.0 : 1.0;
            const penaltyPerWrong = isRajyaseva ? 0.66 : 0.25;
            let correctCount = 0, wrongCount = 0, unattemptedCount = 0;
            test.questions.forEach((q, idx) => {
              if (answers[idx] === undefined) unattemptedCount++;
              else if (answers[idx] === q.correctOption) correctCount++;
              else wrongCount++;
            });
            const gross = Number((correctCount * marksPerCorrect).toFixed(2));
            const deducted = Number((wrongCount * penaltyPerWrong).toFixed(2));
            const currentNetScore = Number((gross - deducted).toFixed(2));
            const maxScore = Number((test.questions.length * marksPerCorrect).toFixed(2));
            const finalFormattedScore = (currentNetScore % 1 === 0) ? currentNetScore : currentNetScore.toFixed(2);
            const attempted = correctCount + wrongCount;
            const accuracy = attempted > 0 ? ((correctCount / attempted) * 100).toFixed(1) : '0';

            return (
              <div style={{
                background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.98))',
                border: '1px solid var(--accent-glow, rgba(56, 189, 248, 0.3))',
                borderRadius: '16px',
                padding: '16px 20px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.35)',
                marginBottom: '10px',
                animation: 'fadeIn 0.3s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '1.4rem' }}>🎯</span>
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#f8fafc' }}>
                        अपडेटेड स्कोअर: <span style={{ color: 'var(--accent-primary, #38bdf8)', fontSize: '1.35rem' }}>{finalFormattedScore}</span> / {maxScore}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        background: markingScheme === 'group_c' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: markingScheme === 'group_c' ? '#38bdf8' : '#fbbf24',
                        padding: '3px 10px',
                        borderRadius: '12px',
                        border: '1px solid currentColor',
                        fontWeight: 700
                      }}>
                        {markingScheme === 'group_c' ? '+१.०० / -०.२५ (१/४)' : '+२.०० / -०.६६ (१/३)'}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '0.85rem', color: '#94a3b8', flexWrap: 'wrap' }}>
                      <span>✅ बरोबर: <strong style={{ color: '#4ade80' }}>{correctCount}</strong> (+{gross})</span>
                      <span>❌ निगेटिव्ह: <strong style={{ color: '#f87171' }}>{wrongCount}</strong> (-{deducted})</span>
                      <span>⏭ सोडले: <strong style={{ color: '#cbd5e1' }}>{unattemptedCount}</strong></span>
                      <span>🎯 अचूकता: <strong style={{ color: '#60a5fa' }}>{accuracy}%</strong></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={handleReattemptTest}
                      className="btn"
                      style={{
                        padding: '9px 18px',
                        background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '10px',
                        fontWeight: 700,
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
                      }}
                    >
                      🔄 ही टेस्ट पुन्हा सोडवा
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAnswers(false)}
                      className="btn"
                      style={{
                        padding: '9px 14px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        color: '#e2e8f0',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '10px',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      📊 निकाल सारांश
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Render OMR View if active */}
          {testViewMode === 'omr' && (!submitted || showAnswers) && (
            <OmrSheetView
              questions={test.questions}
              answers={answers}
              reviews={reviews}
              onSelect={handleSelect}
              onToggleReview={toggleReview}
              onJumpToQuestion={(idx) => {
                setTestViewMode('question');
                setTimeout(() => {
                  const el = document.getElementById(`q-${idx}`);
                  if (el) {
                    const y = el.getBoundingClientRect().top + window.scrollY - 140;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                  }
                }, 100);
              }}
              submitted={submitted}
              onSubmitTest={handleSubmit}
              markingScheme={markingScheme}
              onSchemeChange={(scheme) => {
                if (!submitted) {
                  setMarkingScheme(scheme);
                }
              }}
            />
          )}

          {/* Render Question Cards if question mode is active */}
          {testViewMode === 'question' && (!submitted || showAnswers) && test.questions.map((q, qIndex) => {
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setEditingQuestionModalData({
                      qIndex,
                      originalQIndex: q.originalQIndex !== undefined ? q.originalQIndex : qIndex,
                      question: q.question,
                      options: q.options || [],
                      correctOption: q.correctOption,
                      explanation: q.explanation || ''
                    })}
                    className="btn"
                    style={{
                      padding: '7px 14px',
                      fontSize: '0.8rem',
                      background: 'rgba(59, 130, 246, 0.12)',
                      color: 'var(--info)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                    title="हा प्रश्न, पर्याय किंवा उत्तर बदलण्यासाठी येथे क्लिक करा"
                  >
                    <FiEdit size={13} /> ✏️ प्रश्न / पर्याय एडिट करा
                  </button>

                  <button 
                    type="button"
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

              {/* Fix Answer Button (shown only after submit in showAnswers mode) */}
              {submitted && showAnswers && (
                <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  {editingCorrectOption?.qIndex === qIndex ? (
                    <>
                      <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>✏️ नवीन बरोबर उत्तर:</span>
                      <select
                        value={editingCorrectOption.value}
                        onChange={e => setEditingCorrectOption({ qIndex, value: parseInt(e.target.value) })}
                        style={{ 
                          background: 'var(--bg-secondary)', border: '1px solid var(--accent-primary)', color: 'var(--text-primary)',
                          borderRadius: '8px', padding: '5px 10px', fontSize: '0.85rem', outline: 'none', cursor: 'pointer'
                        }}
                      >
                        {q.options.map((opt, oi) => (
                          <option key={oi} value={oi}>{String.fromCharCode(65 + oi)}: {opt.length > 35 ? opt.slice(0, 35) + '…' : opt}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleFixAnswer(qIndex)}
                        className="btn btn-primary"
                        style={{ padding: '5px 14px', fontSize: '0.82rem' }}
                      >
                        ✅ Save Fix
                      </button>
                      <button
                        onClick={() => setEditingCorrectOption(null)}
                        className="btn"
                        style={{ padding: '5px 10px', fontSize: '0.82rem', background: 'var(--glass-bg)', color: 'var(--text-muted)' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => setEditingCorrectOption({ qIndex, value: q.correctOption })}
                        className="btn"
                        style={{ 
                          padding: '5px 12px', fontSize: '0.78rem',
                          background: 'rgba(239,68,68,0.08)', color: 'var(--danger)',
                          border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px',
                          display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                      >
                        <FiEdit size={12} /> उत्तर चुकीचे आहे? दुरुस्त करा
                      </button>

                      <button
                        onClick={() => setEditingQuestionModalData({
                          qIndex,
                          originalQIndex: q.originalQIndex !== undefined ? q.originalQIndex : qIndex,
                          question: q.question,
                          options: q.options || [],
                          correctOption: q.correctOption,
                          explanation: q.explanation || ''
                        })}
                        className="btn"
                        style={{ 
                          padding: '5px 12px', fontSize: '0.78rem',
                          background: 'rgba(59,130,246,0.1)', color: 'var(--info)',
                          border: '1px solid rgba(59,130,246,0.3)', borderRadius: '8px',
                          display: 'flex', alignItems: 'center', gap: '6px'
                        }}
                        title="संपूर्ण प्रश्न, पर्याय आणि स्पष्टीकरण एडिट करा"
                      >
                        <FiEdit size={12} /> ✏️ प्रश्न / पर्याय एडिट करा
                      </button>
                    </div>
                  )}
                </div>
              )}

            </div>
          )
        })}
        </div>
      </div>
      
      {/* 🌟 Universal Docked Submit Bar for All Devices */}
      {!submitted && (
        <div className="test-docked-submit-bar">
          <div className="test-docked-submit-inner">
            <div className="test-docked-submit-info">
              <span className="test-docked-status-icon">🎯</span>
              <div>
                <strong>चाचणी पूर्ण झाली? निकाल पाहण्यासाठी येथे सबमिट करा</strong>
                <p>
                  एकूण {test.questions?.length || 0} पैकी <strong style={{ color: '#4ade80' }}>{Object.keys(answers).length}</strong> प्रश्न सोडवले आहेत. 
                  ({Math.max(0, (test.questions?.length || 0) - Object.keys(answers).length)} अनुत्तरित)
                </p>
              </div>
            </div>
            <button 
              type="button"
              onClick={handleSubmit} 
              className="btn btn-primary test-docked-submit-btn"
            >
              ✅ परीक्षा सबमिट करा व निकाल पहा
            </button>
          </div>
        </div>
      )}

      {/* ⚠️ Exit Confirmation Modal */}
      {showExitConfirmModal && (
        <div className="modal-overlay" onClick={() => setShowExitConfirmModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', maxWidth: '440px', textAlign: 'center', borderRadius: '20px' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '8px' }}>⚠️</div>
            <h3 style={{ fontSize: '1.25rem', margin: '0 0 8px 0', color: 'var(--text-primary)', fontWeight: 800 }}>
              चाचणी सबमिट करायची आहे का?
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '20px', lineHeight: 1.5 }}>
              तुम्ही एकूण <strong>{Object.keys(answers).length}</strong> प्रश्नांची उत्तरे नोंदवली आहेत. निकाल पाहून प्रगती आणि XP सेव्ह करायचे आहे की नंतर सुरू ठेवायचे?
            </p>
            <div className="flex-col gap-2">
              <button 
                type="button"
                onClick={() => { setShowExitConfirmModal(false); handleSubmit(); }} 
                className="btn btn-primary" 
                style={{ padding: '12px', fontSize: '0.95rem', fontWeight: 800, background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '12px' }}
              >
                ✅ होय, निकाल पहा व सबमिट करा
              </button>
              <button 
                type="button"
                onClick={() => { setShowExitConfirmModal(false); navigate(-1); }} 
                className="btn" 
                style={{ padding: '10px', background: 'var(--glass-bg)', color: 'var(--text-secondary)', fontSize: '0.9rem', borderRadius: '12px' }}
              >
                💾 नंतर सुरू ठेवा (Save & Exit)
              </button>
              <button 
                type="button"
                onClick={() => setShowExitConfirmModal(false)} 
                className="btn" 
                style={{ padding: '8px', background: 'transparent', color: 'var(--text-muted)', fontSize: '0.85rem' }}
              >
                रद्द करा (Continue Test)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Question and Options Edit Modal */}
      <EditQuestionModal
        isOpen={Boolean(editingQuestionModalData)}
        initialData={editingQuestionModalData}
        onClose={() => setEditingQuestionModalData(null)}
        onSave={handleSaveQuestionEdit}
      />
    </div>
  );
};

export default TakeTest;
