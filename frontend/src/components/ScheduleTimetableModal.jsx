import React from 'react';
import { FiX, FiCheckCircle, FiClock, FiCalendar, FiArrowRight, FiShield, FiZap, FiBookOpen } from 'react-icons/fi';
import { SCHEDULE_GROUPS } from '../utils/deficitTracker';

const ScheduleTimetableModal = ({ isOpen, onClose, activeGroupKey, onApplyGroup }) => {
  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      padding: '16px'
    }}>
      <div style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        animation: 'slideUp 0.3s ease-out'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <span style={{
                background: 'var(--accent-glow)',
                color: 'var(--accent-primary)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                letterSpacing: '0.5px'
              }}>
                MPSC MASTER STRATEGY
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                ३+३ Alternate + Daily CSAT
              </span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              🎯 MPSC दैनिक अभ्यास वेळापत्रक व विभागणी
            </h2>
            <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              एकाच दिवशी ६-७ विषयांचा ताण न घेता ३ जीएस विषय + रोज CSAT सराव आणि रविवारी १००% रिव्हिजन!
            </p>
          </div>
          <button 
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-color)',
              color: 'var(--text-secondary)',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Daily Anchor Banner */}
        <div style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(239, 68, 68, 0.08) 100%)',
          border: '1px solid rgba(245, 158, 11, 0.3)',
          borderRadius: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '1.8rem' }}>📐</span>
          <div style={{ flex: 1 }}>
            <strong style={{ color: '#f59e0b', fontSize: '0.95rem' }}>
              दैनिक आधारस्तंभ (Daily Anchor - दररोज न चुकता):
            </strong>
            <p style={{ margin: '2px 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <strong>अंकगणित व बुद्धिमत्ता (CSAT):</strong> रोज १.५ तास (किंवा २०-२५ प्रश्न). दुपारी किंवा रात्री जेव्हा वाचनाचा कंटाळा येतो तेव्हा पेन-कागद घेऊन प्रश्न सोडवा.
            </p>
          </div>
        </div>

        {/* 3 Group Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          
          {/* Group A Card */}
          <div style={{
            background: activeGroupKey === 'A' ? 'rgba(59, 130, 246, 0.08)' : 'var(--glass-bg)',
            border: activeGroupKey === 'A' ? '2px solid #3b82f6' : '1px solid var(--border-color)',
            borderRadius: '18px',
            padding: '18px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#3b82f6',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  padding: '4px 10px',
                  borderRadius: '8px'
                }}>
                  गट 'अ' (Day A)
                </span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  सोमवार, बुधवार, शुक्रवार
                </strong>
                {activeGroupKey === 'A' && (
                  <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 700, background: 'rgba(59, 130, 246, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                    ● आज सक्रिय (Today)
                  </span>
                )}
              </div>
              <button
                onClick={() => onApplyGroup('A')}
                className="btn"
                style={{
                  background: activeGroupKey === 'A' ? '#3b82f6' : 'rgba(59, 130, 246, 0.12)',
                  color: activeGroupKey === 'A' ? '#fff' : '#3b82f6',
                  border: '1px solid #3b82f6',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {activeGroupKey === 'A' ? 'सध्या सुरू आहे ✓' : 'आज हा गट निवडा ➔'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
              {SCHEDULE_GROUPS.A.tasks.map(t => (
                <div key={t.id} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{t.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>⏱️ {t.duration}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>• {t.studyType}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Group B Card */}
          <div style={{
            background: activeGroupKey === 'B' ? 'rgba(16, 185, 129, 0.08)' : 'var(--glass-bg)',
            border: activeGroupKey === 'B' ? '2px solid #10b981' : '1px solid var(--border-color)',
            borderRadius: '18px',
            padding: '18px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#10b981',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  padding: '4px 10px',
                  borderRadius: '8px'
                }}>
                  गट 'ब' (Day B)
                </span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  मंगळवार, गुरुवार, शनिवार
                </strong>
                {activeGroupKey === 'B' && (
                  <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                    ● आज सक्रिय (Today)
                  </span>
                )}
              </div>
              <button
                onClick={() => onApplyGroup('B')}
                className="btn"
                style={{
                  background: activeGroupKey === 'B' ? '#10b981' : 'rgba(16, 185, 129, 0.12)',
                  color: activeGroupKey === 'B' ? '#fff' : '#10b981',
                  border: '1px solid #10b981',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {activeGroupKey === 'B' ? 'सध्या सुरू आहे ✓' : 'आज हा गट निवडा ➔'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
              {SCHEDULE_GROUPS.B.tasks.map(t => (
                <div key={t.id} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{t.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>⏱️ {t.duration}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>• {t.studyType}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Sunday Consolidation Card */}
          <div style={{
            background: activeGroupKey === 'C' ? 'rgba(168, 85, 247, 0.08)' : 'var(--glass-bg)',
            border: activeGroupKey === 'C' ? '2px solid #a855f7' : '1px solid var(--border-color)',
            borderRadius: '18px',
            padding: '18px',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{
                  background: '#a855f7',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  padding: '4px 10px',
                  borderRadius: '8px'
                }}>
                  रविवार (Day C)
                </span>
                <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                  Consolidation & Recovery Day
                </strong>
                {activeGroupKey === 'C' && (
                  <span style={{ fontSize: '0.75rem', color: '#a855f7', fontWeight: 700, background: 'rgba(168, 85, 247, 0.15)', padding: '2px 8px', borderRadius: '6px' }}>
                    ● आज सक्रिय (Today)
                  </span>
                )}
              </div>
              <button
                onClick={() => onApplyGroup('C')}
                className="btn"
                style={{
                  background: activeGroupKey === 'C' ? '#a855f7' : 'rgba(168, 85, 247, 0.12)',
                  color: activeGroupKey === 'C' ? '#fff' : '#a855f7',
                  border: '1px solid #a855f7',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {activeGroupKey === 'C' ? 'सध्या सुरू आहे ✓' : 'रविवार मोड निवडा ➔'}
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
              {SCHEDULE_GROUPS.C.tasks.map(t => (
                <div key={t.id} style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '12px' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)', marginBottom: '4px' }}>{t.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}>⏱️ {t.duration}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>• {t.studyType}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            className="btn btn-primary"
            style={{ padding: '10px 24px', borderRadius: '12px', fontWeight: 700 }}
          >
            वेळापत्रक बंद करा
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleTimetableModal;
