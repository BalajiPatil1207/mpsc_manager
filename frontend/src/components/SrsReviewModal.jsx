import React, { useState, useEffect } from 'react';
import { 
  FiRotateCcw, FiCheckCircle, FiAward, FiBookOpen, 
  FiX, FiChevronRight, FiChevronLeft, FiPlus, FiEye, FiZap, FiTarget, FiHelpCircle
} from 'react-icons/fi';
import { 
  getSrsDeck, 
  getDueSrsItems, 
  reviewSrsItem, 
  addTopicToSrs, 
  getSrsStats,
  SRS_INTERVALS_DAYS 
} from '../utils/srsEngine';
import { playSound } from '../utils/sound';
import toast from 'react-hot-toast';

const STAGE_LABELS = {
  1: { label: 'Stage 1 • १ ला दिवस', interval: '1 Day', color: '#ef4444', desc: 'नवीन / प्राथमिक स्मरण' },
  2: { label: 'Stage 2 • ३ रा दिवस', interval: '3 Days', color: '#f59e0b', desc: 'सुरुवातीचे दृढीकरण' },
  3: { label: 'Stage 3 • ७ वा दिवस', interval: '7 Days', color: '#3b82f6', desc: 'मध्यम मुदत स्मरण' },
  4: { label: 'Stage 4 • १५ वा दिवस', interval: '15 Days', color: '#8b5cf6', desc: 'दीर्घकालीन स्मरण' },
  5: { label: 'Stage 5 • ३० वा दिवस (Mastered)', interval: '30 Days', color: '#22c55e', desc: 'पूर्ण तोंडपाठ व प्रभुत्व' }
};

const SUBJECT_COLORS = {
  'राज्यशास्त्र': { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', icon: '🏛️' },
  'महाराष्ट्र भूगोल': { bg: 'rgba(34, 197, 94, 0.15)', text: '#4ade80', icon: '🌍' },
  'इतिहास': { bg: 'rgba(245, 158, 11, 0.15)', text: '#fbbf24', icon: '📜' },
  'अर्थव्यवस्था': { bg: 'rgba(236, 72, 153, 0.15)', text: '#f472b6', icon: '💰' },
  'सामान्य विज्ञान': { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', icon: '🔬' },
  'Reasoning': { bg: 'rgba(20, 184, 166, 0.15)', text: '#2dd4bf', icon: '🧠' },
  'Maths': { bg: 'rgba(249, 115, 22, 0.15)', text: '#fb923c', icon: '📐' },
  'चालू घडामोडी': { bg: 'rgba(239, 68, 68, 0.15)', text: '#f87171', icon: '📰' }
};

const SrsReviewModal = ({ isOpen, onClose, onXpChange }) => {
  const [deck, setDeck] = useState([]);
  const [dueCards, setDueCards] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const [viewMode, setViewMode] = useState('due'); // 'due' or 'all'
  const [sessionReviewedCount, setSessionReviewedCount] = useState(0);
  const [sessionXpEarned, setSessionXpEarned] = useState(0);
  const [isAddingTopic, setIsAddingTopic] = useState(false);
  const [newTopicData, setNewTopicData] = useState({
    title: '',
    subject: 'राज्यशास्त्र',
    question: '',
    facts: ''
  });

  const refreshDeckData = () => {
    const fullDeck = getSrsDeck();
    const dues = getDueSrsItems();
    setDeck(fullDeck);
    setDueCards(dues);
  };

  useEffect(() => {
    if (isOpen) {
      refreshDeckData();
      setCurrentIndex(0);
      setIsRevealed(false);
      setSessionReviewedCount(0);
      setSessionXpEarned(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const activeList = viewMode === 'due' ? dueCards : deck;
  const currentCard = activeList[currentIndex];
  const stats = getSrsStats();

  const handleReveal = () => {
    setIsRevealed(true);
    playSound.playSuccess();
  };

  const handleRate = (rating) => {
    if (!currentCard) return;

    const result = reviewSrsItem(currentCard.id, rating);
    playSound.playSuccess();

    setSessionReviewedCount(prev => prev + 1);
    setSessionXpEarned(prev => prev + result.xpEarned);

    if (onXpChange) {
      onXpChange(result.xpEarned);
    }

    if (rating === 'hard') {
      toast.error(`⚠️ Reset to Stage 1. उद्या पुन्हा रिव्हिजन येईल (+${result.xpEarned} XP)`);
    } else if (rating === 'good') {
      toast.success(`👍 छान! पुढील इंटरव्हलवर गेले (+${result.xpEarned} XP)`);
    } else if (rating === 'easy') {
      toast.success(`🌟 उत्तम! Stage ${result.nextStage} वर उडी (+${result.xpEarned} XP)`);
    }

    // Refresh deck lists
    const updatedFull = getSrsDeck();
    const updatedDues = getDueSrsItems();
    setDeck(updatedFull);
    setDueCards(updatedDues);

    setIsRevealed(false);

    // If in due mode and item was reviewed, index might stay or clamp
    const currentListLen = (viewMode === 'due' ? updatedDues : updatedFull).length;
    if (currentIndex >= currentListLen) {
      setCurrentIndex(Math.max(0, currentListLen - 1));
    }
  };

  const handleAddTopicSubmit = (e) => {
    e.preventDefault();
    if (!newTopicData.title.trim()) {
      return toast.error("कृपया घटकाचे नाव टाका!");
    }

    const factsArray = newTopicData.facts
      .split('\n')
      .map(f => f.trim())
      .filter(f => f.length > 0);

    addTopicToSrs({
      title: newTopicData.title.trim(),
      subject: newTopicData.subject,
      keyFacts: factsArray
    });

    toast.success("✅ नवीन घटक Spaced Repetition मध्ये जोडला!");
    setIsAddingTopic(false);
    setNewTopicData({ title: '', subject: 'राज्यशास्त्र', question: '', facts: '' });
    refreshDeckData();
  };

  const currentSubjectInfo = currentCard ? (SUBJECT_COLORS[currentCard.subject] || {
    bg: 'rgba(255, 255, 255, 0.1)',
    text: 'var(--text-primary)',
    icon: '📚'
  }) : null;

  const currentStageInfo = currentCard ? (STAGE_LABELS[currentCard.stage || 1] || STAGE_LABELS[1]) : null;

  return (
    <div 
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        background: 'rgba(0, 0, 0, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div 
        className="glass-card"
        style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '24px',
          maxWidth: '680px',
          width: '100%',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px var(--accent-glow)'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, transparent 100%)'
        }}>
          <div className="flex-col gap-1">
            <div className="flex-row gap-2 align-center">
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                🔄 Spaced Repetition Revision
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                background: 'var(--accent-glow)',
                color: 'var(--accent-primary)',
                border: '1px solid var(--accent-primary)'
              }}>
                1-3-7-15-30 Ebbinghaus Rule
              </span>
            </div>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              विस्मरण वक्र (Forgetting Curve) टाळून घटकांची दीर्घकालीन स्मरणात साठवणूक
            </span>
          </div>

          <button 
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FiX size={22} />
          </button>
        </div>

        {/* Stats Strip */}
        <div style={{
          padding: '12px 24px',
          background: 'rgba(0, 0, 0, 0.25)',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div className="flex-row gap-3 align-center">
            <div className="flex-col">
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Retention Index</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: stats.retentionIndex >= 70 ? 'var(--success)' : 'var(--warning)' }}>
                {stats.retentionIndex}%
              </span>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>
            <div className="flex-col">
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Due Today</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: stats.dueCount > 0 ? 'var(--warning)' : 'var(--success)' }}>
                {stats.dueCount} Topics
              </span>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'var(--border-color)' }}></div>
            <div className="flex-col">
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Mastered</span>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--success)' }}>
                {stats.masteredCount}
              </span>
            </div>
          </div>

          {/* Mode Switcher */}
          <div className="flex-row gap-2 align-center">
            <div style={{
              display: 'flex',
              background: 'var(--bg-tertiary)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid var(--border-color)'
            }}>
              <button 
                onClick={() => { setViewMode('due'); setCurrentIndex(0); setIsRevealed(false); }}
                style={{
                  padding: '4px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: viewMode === 'due' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'due' ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                आज बाकी ({dueCards.length})
              </button>
              <button 
                onClick={() => { setViewMode('all'); setCurrentIndex(0); setIsRevealed(false); }}
                style={{
                  padding: '4px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: viewMode === 'all' ? 'var(--accent-primary)' : 'transparent',
                  color: viewMode === 'all' ? '#fff' : 'var(--text-muted)',
                  transition: 'all 0.2s'
                }}
              >
                सर्व डेक ({deck.length})
              </button>
            </div>

            <button 
              onClick={() => setIsAddingTopic(true)}
              className="btn"
              style={{
                padding: '5px 10px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid var(--border-color)',
                fontSize: '0.75rem',
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="नवीन विषय Spaced Repetition मध्ये जोडा"
            >
              <FiPlus /> घटक जोडा
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          {isAddingTopic ? (
            /* Add New Topic Form */
            <form onSubmit={handleAddTopicSubmit} className="flex-col gap-4" style={{ animation: 'fadeIn 0.2s ease-out' }}>
              <div className="flex-row justify-between align-center">
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--accent-primary)' }}>
                  ✨ नवीन MPSC रिव्हिजन घटक जोडा
                </h3>
                <button 
                  type="button" 
                  onClick={() => setIsAddingTopic(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  रद्द करा ✕
                </button>
              </div>

              <div className="flex-col gap-1">
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>विषय (Subject):</label>
                <select 
                  value={newTopicData.subject}
                  onChange={e => setNewTopicData({ ...newTopicData, subject: e.target.value })}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                >
                  <option value="राज्यशास्त्र">🏛️ राज्यशास्त्र (Polity)</option>
                  <option value="महाराष्ट्र भूगोल">🌍 महाराष्ट्र भूगोल (Geography)</option>
                  <option value="इतिहास">📜 इतिहास (History)</option>
                  <option value="अर्थव्यवस्था">💰 अर्थव्यवस्था (Economics)</option>
                  <option value="सामान्य विज्ञान">🔬 सामान्य विज्ञान (Science)</option>
                  <option value="Reasoning">🧠 बुद्धिमत्ता चाचणी (Reasoning)</option>
                  <option value="Maths">📐 अंकगणित (Maths)</option>
                  <option value="चालू घडामोडी">📰 चालू घडामोडी (Current Affairs)</option>
                </select>
              </div>

              <div className="flex-col gap-1">
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>घटकाचे नाव (Topic Title):</label>
                <input 
                  type="text" 
                  placeholder="उदा. १८५७ चा उठाव व महाराष्ट्रातील पडसाद"
                  value={newTopicData.title}
                  onChange={e => setNewTopicData({ ...newTopicData, title: e.target.value })}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                  }}
                  required
                />
              </div>

              <div className="flex-col gap-1">
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  परीक्षेसाठी महत्त्वाचे मुद्दे (Key Facts / उत्तरे - एका ओळीत एक मुद्दा):
                </label>
                <textarea 
                  rows={4}
                  placeholder="१. प्रमुख नेते व ठिकाणे&#10;२. परीक्षेला विचारलेले संदर्भ&#10;३. महत्त्वाच्या तारखा"
                  value={newTopicData.facts}
                  onChange={e => setNewTopicData({ ...newTopicData, facts: e.target.value })}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    fontFamily: 'inherit'
                  }}
                />
              </div>

              <button 
                type="submit"
                className="btn btn-primary"
                style={{ padding: '12px', fontWeight: 700, marginTop: '8px' }}
              >
                💾 डेकमध्ये साठवा (Save to Deck)
              </button>
            </form>
          ) : activeList.length === 0 ? (
            /* Empty State: All Caught Up */
            <div style={{
              textAlign: 'center',
              padding: '40px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '16px'
            }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                background: 'rgba(34, 197, 94, 0.15)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem'
              }}>
                🏆
              </div>
              <div className="flex-col gap-2">
                <h3 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-primary)' }}>
                  शाब्बास! आजचे सर्व रिव्हिजन पूर्ण झाले आहेत!
                </h3>
                <p style={{ color: 'var(--text-secondary)', maxWidth: '420px', margin: '0 auto', fontSize: '0.9rem' }}>
                  तुमचा सध्याचा Retention Index <strong>{stats.retentionIndex}%</strong> आहे. 
                  Ebbinghaus च्या 1-3-7-15-30 नियमानुसार पुढील रिव्हिजन वेळेवर उपलब्ध होतील.
                </p>
              </div>

              {sessionReviewedCount > 0 && (
                <div style={{
                  padding: '12px 20px',
                  borderRadius: '12px',
                  background: 'rgba(249, 115, 22, 0.1)',
                  border: '1px solid rgba(249, 115, 22, 0.25)',
                  color: 'var(--accent-primary)',
                  fontWeight: 700,
                  fontSize: '0.9rem'
                }}>
                  🎉 आजच्या सत्रात तुम्ही {sessionReviewedCount} टॉपिक्स रिव्हाईज केले आणि +{sessionXpEarned} XP मिळवले!
                </div>
              )}

              <div className="flex-row gap-3" style={{ marginTop: '12px' }}>
                <button 
                  onClick={() => { setViewMode('all'); setCurrentIndex(0); }}
                  className="btn"
                  style={{
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: '10px 18px',
                    fontWeight: 600
                  }}
                >
                  सर्व {deck.length} कार्ड्स पुन्हा चाळा
                </button>
                <button 
                  onClick={onClose}
                  className="btn btn-primary"
                  style={{ padding: '10px 24px', fontWeight: 700 }}
                >
                  पूर्ण करा (Done)
                </button>
              </div>
            </div>
          ) : currentCard ? (
            /* Active Flashcard Viewer */
            <div className="flex-col gap-4" style={{ animation: 'fadeIn 0.25s ease-out' }}>
              
              {/* Card Meta Header */}
              <div className="flex-row justify-between align-center" style={{ flexWrap: 'wrap', gap: '8px' }}>
                <div className="flex-row gap-2 align-center">
                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: currentSubjectInfo.bg,
                    color: currentSubjectInfo.text,
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {currentSubjectInfo.icon} {currentCard.subject}
                  </span>

                  <span style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    background: `${currentStageInfo.color}20`,
                    color: currentStageInfo.color,
                    border: `1px solid ${currentStageInfo.color}50`,
                    fontWeight: 700,
                    fontSize: '0.75rem'
                  }}>
                    {currentStageInfo.label}
                  </span>
                </div>

                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  कार्ड {currentIndex + 1} of {activeList.length}
                </span>
              </div>

              {/* Flashcard Box */}
              <div 
                style={{
                  background: 'linear-gradient(145deg, rgba(255, 255, 255, 0.04) 0%, rgba(255, 255, 255, 0.01) 100%)',
                  border: isRevealed ? '1px solid var(--accent-primary)' : '1px solid var(--border-color)',
                  borderRadius: '18px',
                  padding: '24px',
                  minHeight: '280px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  transition: 'all 0.3s ease',
                  boxShadow: isRevealed ? '0 10px 30px -10px var(--accent-glow)' : 'none'
                }}
              >
                {/* Question Section */}
                <div className="flex-col gap-3">
                  <span style={{ fontSize: '0.85rem', color: 'var(--accent-secondary)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px' }}>
                    घटक: {currentCard.title}
                  </span>

                  <h3 style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4, fontWeight: 700 }}>
                    {currentCard.question}
                  </h3>

                  {!isRevealed && (
                    <div style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px dashed var(--border-color)',
                      marginTop: '12px',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <FiHelpCircle size={18} color="var(--accent-primary)" />
                      <span>💡 <strong>सक्रिय स्मरण (Active Recall):</strong> अगोदर स्वतः उत्तरे आठवा किंवा मनात सांगा, मग खालील बटण दाबून तथ्ये तपासा.</span>
                    </div>
                  )}
                </div>

                {/* Answer / Key Facts Section */}
                {isRevealed ? (
                  <div style={{ marginTop: '20px', animation: 'fadeIn 0.3s ease-out' }}>
                    <div style={{ 
                      borderTop: '1px solid var(--border-color)', 
                      paddingTop: '16px', 
                      marginBottom: '16px' 
                    }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--success)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1px' }}>
                        🎯 MPSC परीक्षाभिमुख मुख्य तथ्ये (Key Facts):
                      </span>
                    </div>

                    <div className="flex-col gap-2">
                      {currentCard.keyFacts && currentCard.keyFacts.map((fact, fIdx) => (
                        <div 
                          key={fIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            padding: '10px 14px',
                            borderRadius: '10px',
                            borderLeft: '3px solid var(--accent-primary)'
                          }}
                        >
                          <span style={{ color: 'var(--accent-primary)', fontWeight: 800 }}>•</span>
                          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                            {fact}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: '30px', textAlign: 'center' }}>
                    <button 
                      onClick={handleReveal}
                      className="btn"
                      style={{
                        background: 'linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%)',
                        color: '#fff',
                        padding: '14px 28px',
                        borderRadius: '14px',
                        fontWeight: 800,
                        fontSize: '1rem',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        boxShadow: '0 8px 20px var(--accent-glow)'
                      }}
                    >
                      <FiEye size={18} /> उत्तरे व तथ्ये उघडा (Reveal Facts)
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons: Rating (Hard / Good / Easy) */}
              {isRevealed && (
                <div className="flex-col gap-2" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', fontWeight: 600 }}>
                    तुमचे स्मरण कसे होते? योग्य पर्यायावर क्लिक करा:
                  </span>

                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '12px'
                  }}>
                    {/* Hard */}
                    <button 
                      onClick={() => handleRate('hard')}
                      className="btn"
                      style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.35)',
                        color: 'var(--danger)',
                        padding: '12px 8px',
                        borderRadius: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🔴 विसरलो (Hard)</span>
                      <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>Stage 1 • +5 XP</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>उद्या पुन्हा येईल</span>
                    </button>

                    {/* Good */}
                    <button 
                      onClick={() => handleRate('good')}
                      className="btn"
                      style={{
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.35)',
                        color: 'var(--warning)',
                        padding: '12px 8px',
                        borderRadius: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🟡 आठवले (Good)</span>
                      <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>पुढील पायरी • +15 XP</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>नियमित अंतर</span>
                    </button>

                    {/* Easy */}
                    <button 
                      onClick={() => handleRate('easy')}
                      className="btn"
                      style={{
                        background: 'rgba(34, 197, 94, 0.1)',
                        border: '1px solid rgba(34, 197, 94, 0.35)',
                        color: 'var(--success)',
                        padding: '12px 8px',
                        borderRadius: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>🟢 सोपे (Mastered)</span>
                      <span style={{ fontSize: '0.75rem', opacity: 0.85 }}>+2 स्टेजेस • +25 XP</span>
                      <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>तोंडपाठ झाले</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Navigation Arrows for Browsing */}
              <div className="flex-row justify-between align-center" style={{ marginTop: '8px' }}>
                <button 
                  onClick={() => {
                    setCurrentIndex(prev => Math.max(0, prev - 1));
                    setIsRevealed(false);
                  }}
                  disabled={currentIndex === 0}
                  className="btn"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: currentIndex === 0 ? 'var(--text-muted)' : 'var(--text-primary)',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    opacity: currentIndex === 0 ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <FiChevronLeft /> मागील कार्ड
                </button>

                <button 
                  onClick={() => {
                    setCurrentIndex(prev => Math.min(activeList.length - 1, prev + 1));
                    setIsRevealed(false);
                  }}
                  disabled={currentIndex >= activeList.length - 1}
                  className="btn"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border-color)',
                    color: currentIndex >= activeList.length - 1 ? 'var(--text-muted)' : 'var(--text-primary)',
                    padding: '8px 16px',
                    fontSize: '0.85rem',
                    opacity: currentIndex >= activeList.length - 1 ? 0.4 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  पुढील कार्ड <FiChevronRight />
                </button>
              </div>

            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--border-color)',
          background: 'var(--bg-tertiary)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-muted)'
        }}>
          <span>
            {sessionReviewedCount > 0 ? (
              <span style={{ color: 'var(--success)', fontWeight: 600 }}>
                🎉 सत्रात पूर्ण: {sessionReviewedCount} टॉपिक्स (+{sessionXpEarned} XP)
              </span>
            ) : (
              <span>Ebbinghaus Interval: [1, 3, 7, 15, 30 दिवस]</span>
            )}
          </span>

          <button 
            onClick={onClose}
            className="btn"
            style={{
              padding: '6px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-primary)'
            }}
          >
            बंद करा (Close)
          </button>
        </div>
      </div>
    </div>
  );
};

export default SrsReviewModal;
