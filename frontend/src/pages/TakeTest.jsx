import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiBookmark, FiTarget, FiArrowLeft, FiArrowRight } from 'react-icons/fi';
import Confetti from 'react-confetti';
import { useWindowSize } from 'react-use';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { auth } from '../firebase';

const TakeTest = () => {
  const { testId } = useParams();
  const [test, setTest] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State
  const [answers, setAnswers] = useState({});
  const [reviews, setReviews] = useState({}); // { questionIndex: boolean }
  const [timeLeft, setTimeLeft] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [showAnswers, setShowAnswers] = useState(false);
  const navigate = useNavigate();
  const { width, height } = useWindowSize();

  useEffect(() => {
    const fetchTest = async () => {
      try {
        const res = await axios.get(`https://mpsc-manager.onrender.com/api/custom-tests/${testId}`);
        if(res.data.success) {
          setTest(res.data.data);
          setTimeLeft(res.data.data.timeLimit * 60);
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
    if (timeLeft > 0 && !submitted) {
      const timerId = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timerId);
    } else if (timeLeft === 0 && test && !submitted) {
      handleSubmit(); // Auto submit
    }
  }, [timeLeft, submitted, test]);

  const handleSelect = (qIndex, oIndex) => {
    if(submitted) return;
    setAnswers({ ...answers, [qIndex]: oIndex });
  };

  const toggleReview = (qIndex) => {
    if(submitted) return;
    setReviews(prev => ({ ...prev, [qIndex]: !prev[qIndex] }));
  };

  const handleSubmit = async () => {
    let currentScore = 0;
    test.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctOption) {
        currentScore += 1;
      } else if (answers[idx] !== undefined) {
        currentScore -= 0.25;
      }
    });
    setScore(currentScore);
    setSubmitted(true);

    try {
      const res = await axios.post(`https://mpsc-manager.onrender.com/api/custom-tests/${testId}/submit`, {
        answers,
        userId: auth.currentUser?.uid || 'anonymous'
      });
      if(res.data.success) {
        if (res.data.message.includes('Mistake Mock')) {
          toast.success(res.data.message, { duration: 5000, icon: '🔥' });
        }
        
        // Add Points!
        if (res.data.scoreEarned > 0) {
           const sub = res.data.subject || 'General';
           const oldPoints = parseFloat(localStorage.getItem(`xp_${sub}`)) || 0;
           localStorage.setItem(`xp_${sub}`, (oldPoints + res.data.scoreEarned).toFixed(2));
           
           const totalOld = parseFloat(localStorage.getItem('xp_total')) || 0;
           localStorage.setItem('xp_total', (totalOld + res.data.scoreEarned).toFixed(2));
           
           toast.success(`🎉 Earned +${res.data.scoreEarned} XP for ${sub}!`);
        }
      }
    } catch(err) {
      console.error(err);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  if (loading) return <div style={{color:'var(--text-primary)', padding: '40px', textAlign: 'center'}}>Loading test...</div>;
  if (!test) return <div style={{color:'var(--text-primary)', padding: '40px', textAlign: 'center'}}>Test not found or invalid link.</div>;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', color: 'var(--text-primary)', padding: '20px', paddingBottom: '100px', fontFamily: 'system-ui' }}>
      
      {/* Header Sticky */}
      <div style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', backdropFilter: 'blur(10px)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 50, marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
           <button onClick={() => navigate(-1)} style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }} title="Go Back">
              <FiArrowLeft size={24} />
           </button>
           <h2 style={{ margin: 0, fontSize: '1.25rem' }}>{test.title}</h2>
        </div>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          {!submitted && (
             <h2 style={{ margin: 0, color: timeLeft < 60 ? 'var(--warning)' : 'var(--accent-primary)' }}>
               ⏱ {formatTime(timeLeft)}
             </h2>
          )}
          {!submitted && (
            <button onClick={handleSubmit} className="btn btn-primary desktop-submit-btn" style={{ padding: '8px 16px' }}>Submit Test</button>
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
                     {config.showConfetti && <Confetti width={width} height={height} recycle={false} numberOfPieces={600} gravity={0.15} />}
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
              
              {/* Negative Marking Impact Analysis */}
              {(() => {
                let lost = 0;
                let wrongCount = 0;
                test.questions.forEach((q, idx) => {
                  if (answers[idx] !== undefined && answers[idx] !== q.correctOption) {
                    lost += 0.25;
                    wrongCount += 1;
                  }
                });
                return lost > 0 ? (
                  <div style={{ marginTop: '16px', marginBottom: '24px', padding: '16px', background: 'rgba(239, 68, 68, 0.1)', border: '1px dashed var(--danger)', borderRadius: '12px' }}>
                    <p style={{ margin: 0, color: 'var(--danger)', fontWeight: 600 }}>⚠️ Negative Marking Impact</p>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      तुम्ही {wrongCount} चुकीचे उत्तर दिले, ज्यामुळे तुमचे <strong>{lost} मार्क्स</strong> वजा झाले. 
                      जर तुम्ही हे प्रश्न सोडवले नसते, तर तुमचा स्कोर <strong>{score + lost}</strong> असता!
                    </p>
                  </div>
                ) : (
                  <div style={{ marginTop: '16px', marginBottom: '24px', padding: '16px', background: 'rgba(34, 197, 94, 0.1)', border: '1px dashed var(--success)', borderRadius: '12px' }}>
                    <p style={{ margin: 0, color: 'var(--success)', fontWeight: 600 }}>🎉 Perfect Accuracy!</p>
                    <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                      एकही चुकीचं उत्तर नाही! Negative Marking मुळे तुमचे ० मार्क्स वजा झाले!
                    </p>
                  </div>
                );
              })()}

              <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button onClick={() => navigate('/mock')} className="btn" style={{ padding: '12px 24px', fontSize: '1.1rem', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>
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

        {/* Right Column: Question Palette */}
        {(!submitted || showAnswers) && (
          <div className="glass-panel test-palette-container" style={{ width: '320px', padding: '24px', position: 'sticky', top: '100px', alignSelf: 'flex-start' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '16px' }}>Question Palette</h3>
            <div className="palette-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px' }}>
              {test.questions.map((_, idx) => {
                const isAttempted = answers[idx] !== undefined;
                let bgState = 'var(--glass-bg)';
                let colorState = 'var(--text-primary)';
                let borderState = 'var(--border-color)';
                
                if (submitted) {
                  if (answers[idx] === test.questions[idx].correctOption) {
                    bgState = 'rgba(34, 197, 94, 0.2)'; colorState = 'var(--success)'; borderState = 'transparent';
                  } else if (isAttempted) {
                    bgState = 'rgba(239, 68, 68, 0.2)'; colorState = '#ef4444'; borderState = 'transparent';
                  }
                } else if (reviews[idx]) {
                  bgState = isAttempted ? 'linear-gradient(135deg, var(--accent-primary), var(--warning))' : 'rgba(245, 158, 11, 0.2)'; 
                  colorState = isAttempted ? '#fff' : 'var(--warning)'; 
                  borderState = isAttempted ? 'transparent' : 'var(--warning)';
                } else if (isAttempted) {
                  bgState = 'var(--accent-primary)'; colorState = '#fff'; borderState = 'transparent';
                }

                return (
                  <div 
                    key={idx} 
                    onClick={() => {
                      const el = document.getElementById(`q-${idx}`);
                      if (el) {
                        const yOffset = -100; 
                        const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
                        window.scrollTo({top: y, behavior: 'smooth'});
                      }
                    }}
                    style={{ 
                      width: '40px', height: '40px', borderRadius: '8px', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.875rem', cursor: 'pointer',
                      background: bgState,
                      color: colorState,
                      border: `1px solid ${borderState}`,
                      transition: 'all 0.2s'
                    }}
                  >
                    {idx+1}
                  </div>
                )
              })}
            </div>
            
            {!submitted && (
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', background: 'var(--accent-primary)', borderRadius: '4px' }}></div> Answered</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '4px' }}></div> Not Answered</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', background: 'rgba(245, 158, 11, 0.2)', border: '1px solid var(--warning)', borderRadius: '4px' }}></div> Marked (Unanswered)</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', background: 'linear-gradient(135deg, var(--accent-primary), var(--warning))', borderRadius: '4px' }}></div> Marked (Answered)</div>
              </div>
            )}
            {submitted && (
              <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', background: 'rgba(34, 197, 94, 0.2)', border: '1px solid var(--success)', borderRadius: '4px' }}></div> Correct</div>
                 <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ width: '16px', height: '16px', background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)', borderRadius: '4px' }}></div> Incorrect</div>
              </div>
            )}
          </div>
        )}

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
