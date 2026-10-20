import React from 'react';
import { FiCheck, FiX, FiBookmark, FiExternalLink, FiInfo, FiAward } from 'react-icons/fi';

const OmrSheetView = ({
  questions = [],
  answers = {},
  reviews = {},
  onSelect,
  onToggleReview,
  onJumpToQuestion,
  onSubmitTest,
  submitted = false,
  markingScheme = 'mpsc_rajyaseva',
  onSchemeChange
}) => {
  const marksPerCorrect = markingScheme === 'group_c' ? 1.0 : 2.0;
  const penaltyPerWrong = markingScheme === 'group_c' ? 0.25 : 0.66;

  const attemptedCount = Object.keys(answers).length;
  const reviewCount = Object.values(reviews).filter(Boolean).length;
  const unattemptedCount = Math.max(0, questions.length - attemptedCount);

  return (
    <div className="flex-col gap-6" style={{ width: '100%', animation: 'fadeIn 0.25s ease-out' }}>
      
      {/* OMR Header & Instruction Sheet */}
      <div 
        className="glass-card" 
        style={{ 
          padding: '20px 24px', 
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(20, 26, 40, 0.85) 0%, rgba(13, 21, 39, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)'
        }}
      >
        <div className="flex-row justify-between align-center" style={{ flexWrap: 'wrap', gap: '16px', marginBottom: '16px' }}>
          <div className="flex-col gap-1">
            <div className="flex-row gap-2 align-center">
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f8fafc' }}>
                ⭕ MPSC अधिकृत OMR उत्तरपत्रिका (Answer Sheet)
              </span>
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'rgba(59, 130, 246, 0.15)',
                color: '#60a5fa',
                border: '1px solid rgba(59, 130, 246, 0.3)'
              }}>
                Exam Simulator
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.825rem', color: '#94a3b8' }}>
              प्रत्येक प्रश्नासमोर दिलेल्या (१) (२) (३) (४) वर्तुळावर क्लिक करून उत्तर नोंदवा किंवा बदला.
            </p>
          </div>

          {/* Negative Marking Scheme Selector */}
          <div className="flex-col gap-1" style={{ alignItems: 'flex-end' }}>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
              नेगेटिव्ह मार्किंग पद्धत (Marking Scheme):
            </span>
            <div style={{
              display: 'flex',
              background: 'rgba(0, 0, 0, 0.35)',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <button
                type="button"
                onClick={() => onSchemeChange && onSchemeChange('mpsc_rajyaseva')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: markingScheme === 'mpsc_rajyaseva' ? 'var(--accent-primary)' : 'transparent',
                  color: markingScheme === 'mpsc_rajyaseva' ? '#fff' : '#94a3b8',
                  transition: 'all 0.2s'
                }}
              >
                MPSC (+२.० / -०.६६)
              </button>
              <button
                type="button"
                onClick={() => onSchemeChange && onSchemeChange('group_c')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  background: markingScheme === 'group_c' ? 'var(--accent-primary)' : 'transparent',
                  color: markingScheme === 'group_c' ? '#fff' : '#94a3b8',
                  transition: 'all 0.2s'
                }}
              >
                गट-क / तलाठी (+१.० / -०.२५)
              </button>
            </div>
          </div>
        </div>

        {/* Legend / Status Badges Strip */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px',
          paddingTop: '14px',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <div className="flex-row gap-4 align-center" style={{ flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#22c55e' }}></span>
              सोडवलेले: <strong>{attemptedCount}</strong>
            </span>
            <span style={{ fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#a855f7' }}></span>
              पुनरावलोकन: <strong>{reviewCount}</strong>
            </span>
            <span style={{ fontSize: '0.8rem', color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '12px', height: '12px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.15)', border: '1px solid #94a3b8' }}></span>
              अनुत्तरित: <strong>{unattemptedCount}</strong>
            </span>
          </div>

          <div style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
            १/३rd निगेटिव्ह: <span style={{ color: 'var(--danger)', fontWeight: 700 }}>-{penaltyPerWrong} गुण प्रति चूक</span>
          </div>
        </div>
      </div>

      {/* OMR Sheet Grid of Bubbles */}
      <div 
        className="glass-card"
        style={{
          padding: '24px',
          borderRadius: '20px',
          background: 'rgba(15, 23, 42, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '12px'
        }}>
          {questions.map((q, idx) => {
            const selectedOpt = answers[idx];
            const isAnswered = selectedOpt !== undefined;
            const isReviewed = reviews[idx];
            const correctOpt = q.correctOption;

            return (
              <div 
                key={idx}
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  background: isAnswered ? 'rgba(255, 255, 255, 0.04)' : 'rgba(255, 255, 255, 0.015)',
                  border: isReviewed 
                    ? '1.5px solid #a855f7' 
                    : isAnswered 
                      ? '1px solid rgba(255, 255, 255, 0.12)' 
                      : '1px solid rgba(255, 255, 255, 0.05)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  transition: 'all 0.15s ease'
                }}
              >
                {/* Question Label & Jump to Question */}
                <button
                  type="button"
                  onClick={() => onJumpToQuestion && onJumpToQuestion(idx)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: isAnswered ? '#ffffff' : '#94a3b8',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 4px',
                    borderRadius: '4px'
                  }}
                  title="हा प्रश्न सोडवण्यासाठी प्रश्नपत्रिकेत उघडा"
                >
                  <span>Q.{idx + 1 < 10 ? `0${idx + 1}` : idx + 1}</span>
                  <FiExternalLink size={11} opacity={0.6} />
                </button>

                {/* 4 OMR Bubbles: (1) (2) (3) (4) */}
                <div className="flex-row gap-2 align-center">
                  {[0, 1, 2, 3].map((optIdx) => {
                    const isSelected = selectedOpt === optIdx;
                    const isThisCorrect = correctOpt === optIdx;

                    // Compute bubble appearance
                    let bubbleBg = 'rgba(255, 255, 255, 0.05)';
                    let bubbleColor = '#cbd5e1';
                    let bubbleBorder = '1.5px solid rgba(255, 255, 255, 0.2)';
                    let bubbleShadow = 'none';

                    if (!submitted) {
                      if (isSelected) {
                        bubbleBg = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
                        bubbleColor = '#ffffff';
                        bubbleBorder = '1.5px solid #f97316';
                        bubbleShadow = '0 0 10px rgba(249, 115, 22, 0.6)';
                      }
                    } else {
                      // Result view after submission
                      if (isThisCorrect) {
                        bubbleBg = '#22c55e';
                        bubbleColor = '#ffffff';
                        bubbleBorder = '1.5px solid #22c55e';
                        bubbleShadow = '0 0 8px rgba(34, 197, 94, 0.6)';
                      } else if (isSelected && !isThisCorrect) {
                        bubbleBg = '#ef4444';
                        bubbleColor = '#ffffff';
                        bubbleBorder = '1.5px solid #ef4444';
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => !submitted && onSelect && onSelect(idx, optIdx)}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '50%',
                          background: bubbleBg,
                          color: bubbleColor,
                          border: bubbleBorder,
                          boxShadow: bubbleShadow,
                          fontSize: '0.8rem',
                          fontWeight: 800,
                          cursor: submitted ? 'default' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                          padding: 0
                        }}
                        title={`पर्याय ${optIdx + 1}`}
                      >
                        {submitted && isThisCorrect ? (
                          <FiCheck size={14} />
                        ) : submitted && isSelected && !isThisCorrect ? (
                          <FiX size={14} />
                        ) : (
                          optIdx + 1
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Review Toggle Bookmark Button */}
                {!submitted && (
                  <button
                    type="button"
                    onClick={() => onToggleReview && onToggleReview(idx)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: isReviewed ? '#a855f7' : '#64748b',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    title={isReviewed ? "रिव्हिजन खूण काढा" : "पुनरावलोकनासाठी खूण करा (Bookmark)"}
                  >
                    <FiBookmark size={15} fill={isReviewed ? '#a855f7' : 'none'} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 🚀 OMR Bottom Submit Action Card */}
      {!submitted && (
        <div 
          className="glass-card"
          style={{
            marginTop: '8px',
            padding: '20px 24px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
            border: '1.5px solid rgba(34, 197, 94, 0.4)',
            boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.5), 0 0 20px rgba(34, 197, 94, 0.15)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <span style={{
              fontSize: '1.8rem',
              background: 'rgba(34, 197, 94, 0.15)',
              padding: '10px',
              borderRadius: '12px',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              ⭕
            </span>
            <div>
              <h4 style={{ margin: '0 0 4px 0', color: '#f8fafc', fontSize: '1.1rem', fontWeight: 800 }}>
                OMR उत्तरपत्रिका पूर्ण झाली आहे? निकाल पहा
              </h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                एकूण {questions.length} पैकी <strong style={{ color: '#4ade80' }}>{attemptedCount}</strong> वर्तुळे भरली आहेत. (<strong style={{ color: '#f87171' }}>{unattemptedCount}</strong> अनुत्तरित)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onSubmitTest}
            className="btn btn-primary"
            style={{
              padding: '14px 32px',
              fontSize: '1.05rem',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              boxShadow: '0 4px 20px rgba(16, 185, 129, 0.45)',
              borderRadius: '14px',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ✅ OMR उत्तरपत्रिका सबमिट करा
          </button>
        </div>
      )}

    </div>
  );
};

export default OmrSheetView;
