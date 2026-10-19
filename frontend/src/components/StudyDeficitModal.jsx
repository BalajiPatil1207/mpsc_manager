import React, { useState } from 'react';
import { 
  FiAlertTriangle, FiCheckCircle, FiClock, FiTrendingDown, 
  FiRefreshCw, FiBookOpen, FiX, FiAward, FiCalendar, FiChevronRight, FiShield 
} from 'react-icons/fi';
import { recoverBacklogItem } from '../utils/deficitTracker';
import { playSound } from '../utils/sound';
import toast from 'react-hot-toast';

const StudyDeficitModal = ({ 
  isOpen, 
  onClose, 
  deficitState, 
  onStateUpdate,
  todayProgress 
}) => {
  const [activeTab, setActiveTab] = useState('backlog'); // 'backlog', 'history', 'strategy'

  if (!isOpen) return null;

  const { deficitHours = 0, totalPenalties = 0, penaltyHistory = [], backlogTasks = [], xpTotal = 0 } = deficitState || {};

  const handleRecover = (backlogId) => {
    const result = recoverBacklogItem(backlogId);
    if (result) {
      playSound.playSuccess();
      toast.success(`🎉 अभ्यास भरून काढला! +${result.xpReward} XP मिळाले आणि ${result.itemHrs} तास तूट कमी झाली!`);
      
      // Persist to DB store
      import('../utils/dbStore').then(({ saveMultipleToDB }) => {
        saveMultipleToDB({
          study_deficit_hours: result.updatedDeficitHours,
          xp_total: result.updatedXpTotal,
          study_backlog_tasks: result.updatedBacklog,
          study_penalty_history: result.updatedHistory
        });
      });

      if (onStateUpdate) {
        onStateUpdate({
          ...deficitState,
          deficitHours: result.updatedDeficitHours,
          xpTotal: result.updatedXpTotal,
          backlogTasks: result.updatedBacklog,
          penaltyHistory: result.updatedHistory
        });
      }
    }
  };

  const getSeverityBadge = () => {
    if (deficitHours === 0) {
      return (
        <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(34, 197, 94, 0.15)', color: 'var(--success)', border: '1px solid rgba(34, 197, 94, 0.3)', fontWeight: 700, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <FiCheckCircle /> 🟢 सुरळीत (No Deficit)
        </span>
      );
    }
    if (deficitHours <= 5) {
      return (
        <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', border: '1px solid rgba(245, 158, 11, 0.3)', fontWeight: 700, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <FiAlertTriangle /> 🟡 मध्यम तूट (Minor Deficit)
        </span>
      );
    }
    return (
      <span style={{ padding: '6px 14px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: '1px solid rgba(239, 68, 68, 0.3)', fontWeight: 700, fontSize: '0.875rem', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
        <FiAlertTriangle /> 🔴 गंभीर तूट (Critical Backlog!)
      </span>
    );
  };

  // Recommended catch-up days
  const recommendedExtraHours = deficitHours > 0 ? (deficitHours > 6 ? 1.5 : 1.0) : 0;
  const daysToClear = deficitHours > 0 ? Math.ceil(deficitHours / (recommendedExtraHours || 1)) : 0;

  return (
    <div className="deficit-modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      background: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(10px)',
      WebkitBackdropFilter: 'blur(10px)',
      zIndex: 99999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
      animation: 'fadeIn 0.25s ease'
    }}>
      <div className="deficit-modal-content glass-panel" style={{
        maxWidth: '750px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        padding: '28px',
        borderRadius: '24px',
        position: 'relative',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
        border: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)'
      }}>
        
        {/* Close Button */}
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'var(--glass-bg)',
            border: '1px solid var(--border-color)',
            color: 'var(--text-primary)',
            width: '36px',
            height: '36px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <FiX size={20} />
        </button>

        {/* Modal Header */}
        <div className="flex-col gap-2" style={{ marginBottom: '24px', paddingRight: '40px' }}>
          <div className="flex-row gap-2 align-center" style={{ flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }} className="heading-gradient">
              🎯 अभ्यास बॅकलॉग व तूट विश्लेषण
            </h2>
            {getSeverityBadge()}
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
            मागील अभ्यास न झालेले दिवस, कापलेले XP आणि राहिलेला अभ्यास भरून काढण्याचा संपूर्ण तपशील.
          </p>
        </div>

        {/* Metric Cards Grid */}
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '24px' }}>
          <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderLeft: deficitHours > 0 ? '4px solid var(--danger)' : '4px solid var(--success)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>एकूण बुडालेले तास</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: deficitHours > 0 ? 'var(--danger)' : 'var(--success)' }}>
              {deficitHours} <span style={{ fontSize: '0.9rem' }}>तास</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
              {deficitHours > 0 ? 'नियोजनापेक्षा मागे' : 'वेळेवर'}
            </span>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderLeft: '4px solid var(--warning)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>शिल्लक घटक</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--warning)' }}>
              {backlogTasks.length} <span style={{ fontSize: '0.9rem' }}>टास्क्स</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
              बॅकलॉग यादीत
            </span>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderLeft: '4px solid var(--danger)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>दंडामुळे कापलेले XP</span>
            <span style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--danger)' }}>
              -{totalPenalties} <span style={{ fontSize: '0.9rem' }}>XP</span>
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
              अभ्यास चुकल्यामुळे
            </span>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderLeft: '4px solid var(--info)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>रिकव्हरी प्लॅन</span>
            <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--info)' }}>
              {deficitHours > 0 ? `+${recommendedExtraHours}h` : '0h'}
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginTop: '2px' }}>
              {deficitHours > 0 ? `पुढील ${daysToClear} दिवस` : 'अभिनंदन!'}
            </span>
          </div>
        </div>

        {/* Real-time Alert for Today */}
        {todayProgress && todayProgress.incompleteCount > 0 && (
          <div style={{
            background: 'rgba(245, 158, 11, 0.1)',
            border: '1px solid rgba(245, 158, 11, 0.3)',
            borderRadius: '16px',
            padding: '14px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}>
            <div className="flex-row gap-3 align-center">
              <FiAlertTriangle size={22} color="var(--warning)" />
              <div>
                <strong style={{ color: 'var(--warning)', display: 'block', fontSize: '0.95rem' }}>
                  आजचा अभ्यास अजून शिल्लक आहे!
                </strong>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  आजचे अजून {todayProgress.incompleteCount} टास्क्स ({todayProgress.remainingHours} तास) बाकी आहेत. आज अभ्यास पूर्ण न केल्यास रात्री -{todayProgress.projectedPenalty} XP कापले जातील!
                </span>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="btn btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.85rem' }}
            >
              आजचा अभ्यास सुरू करा ➔
            </button>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex-row gap-2" style={{ borderBottom: '1px solid var(--border-color)', marginBottom: '20px', paddingBottom: '8px' }}>
          <button 
            onClick={() => setActiveTab('backlog')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              color: activeTab === 'backlog' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'backlog' ? '2px solid var(--accent-primary)' : '2px solid transparent'
            }}
          >
            📋 शिल्लक बॅकलॉग ({backlogTasks.length})
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              color: activeTab === 'history' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'history' ? '2px solid var(--accent-primary)' : '2px solid transparent'
            }}
          >
            📅 पेनल्टी इतिहास ({penaltyHistory.length})
          </button>
          <button 
            onClick={() => setActiveTab('strategy')}
            style={{
              background: 'transparent',
              border: 'none',
              padding: '8px 16px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              color: activeTab === 'strategy' ? 'var(--accent-primary)' : 'var(--text-muted)',
              borderBottom: activeTab === 'strategy' ? '2px solid var(--accent-primary)' : '2px solid transparent'
            }}
          >
            💡 भरून काढण्याची रणनीती
          </button>
        </div>

        {/* Tab 1: Backlog Tasks with Recovery */}
        {activeTab === 'backlog' && (
          <div className="flex-col gap-3">
            {backlogTasks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                <FiCheckCircle size={48} color="var(--success)" style={{ margin: '0 auto 12px', display: 'block' }} />
                <h3 style={{ color: 'var(--text-primary)', marginBottom: '6px' }}>अभिनंदन! कोणताही बॅकलॉग नाही!</h3>
                <p style={{ fontSize: '0.9rem' }}>तुमचा सर्व अभ्यास ठरलेल्या वेळेत पूर्ण होत आहे. हेच सातत्य कायम ठेवा!</p>
              </div>
            ) : (
              <>
                <div className="flex-row justify-between align-center" style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    जेव्हा तुम्ही अतिरिक्त वेळ काढून हे विषय वाचाल, तेव्हा 'अभ्यास पूर्ण केला' वर क्लिक करून XP परत मिळवा:
                  </span>
                </div>
                {backlogTasks.map((item) => (
                  <div 
                    key={item.id}
                    className="glass-card"
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderLeft: '4px solid var(--warning)',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div className="flex-col gap-1" style={{ flex: 1, minWidth: '200px' }}>
                      <div className="flex-row gap-2 align-center">
                        <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                          {item.title}
                        </span>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '6px', background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>
                          {item.duration}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        चुकलेली तारीख: <span style={{ color: 'var(--warning)' }}>{item.missedDate || 'मागील दिवस'}</span>
                      </span>
                    </div>

                    <button
                      onClick={() => handleRecover(item.id)}
                      className="btn"
                      style={{
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: 'var(--success)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        padding: '8px 16px',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FiCheckCircle /> अभ्यास पूर्ण केला (+१५ XP)
                    </button>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Tab 2: Penalty & Missed Days Audit History */}
        {activeTab === 'history' && (
          <div className="flex-col gap-3">
            {penaltyHistory.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                <FiShield size={40} color="var(--info)" style={{ margin: '0 auto 10px', display: 'block' }} />
                <p>अद्याप कोणतीही पेनल्टी लागलेली नाही! तुमचा अभ्यास वेळेवर आहे.</p>
              </div>
            ) : (
              penaltyHistory.map((log) => {
                const isBonus = log.type === 'bonus' || log.xpDeducted < 0;
                const isRecovery = log.type === 'recovered';
                return (
                  <div 
                    key={log.id || Math.random()}
                    className="glass-card"
                    style={{
                      padding: '14px 18px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderLeft: isBonus ? '4px solid var(--success)' : (isRecovery ? '4px solid var(--info)' : '4px solid var(--danger)'),
                      gap: '12px'
                    }}
                  >
                    <div className="flex-col gap-1">
                      <div className="flex-row gap-2 align-center">
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: isBonus ? 'var(--success)' : (isRecovery ? 'var(--info)' : 'var(--danger)') }}>
                          {log.reason}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {log.date} • {log.details || `${log.missedHours || 0} तास अभ्यास तूट`}
                      </span>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{
                        fontWeight: 800,
                        fontSize: '1.1rem',
                        color: isBonus ? 'var(--success)' : (isRecovery ? 'var(--info)' : 'var(--danger)')
                      }}>
                        {log.xpDeducted > 0 ? `-${log.xpDeducted}` : `+${Math.abs(log.xpDeducted)}`} XP
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 3: Catch-up Strategy */}
        {activeTab === 'strategy' && (
          <div className="flex-col gap-4">
            <div className="glass-card" style={{ padding: '18px', borderLeft: '4px solid var(--accent-primary)' }}>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '1rem', color: 'var(--accent-primary)' }}>
                ⚡ तूट भरून काढण्याचा फॉर्म्युला (Action Plan)
              </h4>
              <p style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)', margin: 0 }}>
                तुमचा अभ्यास <strong>{deficitHours} तास</strong> मागे आहे. पुढील <strong>{daysToClear || 1} दिवसांत</strong> दररोज फक्त <strong>+{recommendedExtraHours} तास</strong> अतिरिक्त अभ्यास दिल्यास संपूर्ण बॅकलॉग संपेल आणि तुमचे सर्व वजा झालेले गुण (XP) परत मिळतील!
              </p>
            </div>

            <div className="flex-col gap-2">
              <div style={{ padding: '12px 16px', background: 'var(--glass-bg)', borderRadius: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <strong>१. प्राधान्यक्रम ठरवा:</strong> सर्वात आधी जास्त तास असलेले विषय (उदा. गणित, इतिहास) पूर्ण करा.
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--glass-bg)', borderRadius: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <strong>२. शनिवार/रविवार रिव्हिजन स्लॉट:</strong> आठवड्याच्या शेवटी ३ तास केवळ जुन्या बॅकलॉगसाठी राखून ठेवा.
              </div>
              <div style={{ padding: '12px 16px', background: 'var(--glass-bg)', borderRadius: '10px', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                <strong>३. XP पेनल्टी टाळण्याचा नियम:</strong> ज्या दिवशी अभ्यास नसेल त्या दिवशी किमान ३० मिनिटे रिव्हिजन करा, जेणेकरून झिरो-स्टडी पेनल्टी (-५० XP) लागणार नाही!
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button 
            onClick={onClose}
            className="btn btn-primary"
            style={{ minWidth: '120px' }}
          >
            समजले (Close)
          </button>
        </div>

      </div>
    </div>
  );
};

export default StudyDeficitModal;
