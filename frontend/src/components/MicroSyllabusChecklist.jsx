import React, { useState, useMemo } from 'react';
import { 
  FiSearch, FiCheckSquare, FiSquare, FiChevronDown, FiChevronUp, 
  FiPlay, FiRotateCcw, FiAward, FiBookOpen, FiFilter, FiCheck, FiCompass
} from 'react-icons/fi';
import { 
  getMicroSyllabusData, 
  getMicroSyllabusProgress, 
  toggleSubtopicStatus, 
  getMicroSyllabusStats,
  getSubtopicKey 
} from '../utils/syllabusTracker';
import { addTopicToSrs } from '../utils/srsEngine';
import { playSound } from '../utils/sound';
import toast from 'react-hot-toast';

const SUBJECT_ICONS = {
  'इतिहास': '📜',
  'भूगोल': '🌍',
  'भारतीय राज्यव्यवस्था': '🏛️',
  'राज्यव्यवस्था': '🏛️',
  'अर्थव्यवस्था': '💰',
  'सामान्य विज्ञान': '🔬',
  'पर्यावरण': '🌱',
  'अंकगणित': '📐',
  'बुद्धिमत्ता': '🧠',
  'चालू घडामोडी': '📰',
  'मराठी व्याकरण': '📖',
  'इंग्रजी व्याकरण': '🔤'
};

const MicroSyllabusChecklist = ({ onStartFocus, onOpenSrs }) => {
  const [examKey, setExamKey] = useState('MPSC_RAJYASEVA');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'studied', 'pending', 'revised'
  const [expandedSubjects, setExpandedSubjects] = useState({ 'भारतीय राज्यव्यवस्था': true, 'भूगोल': true });
  const [progress, setProgress] = useState(() => getMicroSyllabusProgress());

  const syllabus = useMemo(() => getMicroSyllabusData(examKey), [examKey]);
  const stats = useMemo(() => getMicroSyllabusStats(examKey), [examKey, progress]);

  const toggleSubjectExpand = (subName) => {
    setExpandedSubjects(prev => ({ ...prev, [subName]: !prev[subName] }));
  };

  const handleToggle = (key, type) => {
    const result = toggleSubtopicStatus(key, type);
    setProgress({ ...result.progress });
    playSound.playSuccess();

    if (result.newVal) {
      toast.success(
        type === 'studied'
          ? `✅ घटक पूर्ण केला! +${result.xpEarned} XP मिळाले!`
          : `🎉 रिव्हिजन नोंदवले! +${result.xpEarned} XP मिळाले!`
      );
    } else {
      toast("नोंद पूर्ववत केली", { icon: '↩️' });
    }
  };

  const handleAddToSrs = (subName, topName, subtopic) => {
    addTopicToSrs({
      title: `${subtopic} (${subName})`,
      subject: subName,
      keyFacts: [
        `${subName} - ${topName} अंतर्गत ${subtopic} मधील महत्त्वाच्या व्याख्या व संकल्पना`,
        'परीक्षेच्या दृष्टीने विचारले जाणारे संभाव्य प्रश्न',
        'मागील वर्षाच्या (PYQ) प्रश्नपत्रिकांमधील संदर्भ'
      ]
    });
    toast.success(`🔄 "${subtopic}" Spaced Repetition डेकमध्ये जोडला!`, { icon: '🧠' });
    if (onOpenSrs) onOpenSrs();
  };

  const handleFocusClick = (subName, subtopic) => {
    if (onStartFocus) {
      onStartFocus({
        id: `micro_${Date.now()}`,
        title: `${subtopic} (${subName})`,
        duration: '30 min',
        completed: false
      });
    }
  };

  return (
    <div className="flex-col gap-6" style={{ width: '100%' }}>
      
      {/* Top Banner & Exam Selector */}
      <div 
        className="glass-card" 
        style={{
          padding: '24px',
          background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, rgba(59, 130, 246, 0.04) 100%)',
          border: '1px solid var(--border-color)',
          borderRadius: '20px'
        }}
      >
        <div className="flex-row justify-between align-center" style={{ flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
          <div className="flex-col gap-1">
            <div className="flex-row gap-2 align-center">
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                📑 MPSC 2027 मायक्रो-अभ्यासक्रम ट्रॅकर
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'var(--accent-glow)',
                color: 'var(--accent-primary)',
                border: '1px solid var(--accent-primary)'
              }}>
                Official Micro Syllabus
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              प्रत्येक विषयातील सूक्ष्म घटकांचे ट्रॅकिंग, थेट Focus Timer व Spaced Repetition जोडणी.
            </p>
          </div>

          {/* Exam Toggle Tabs */}
          <div style={{
            display: 'flex',
            background: 'var(--bg-tertiary)',
            padding: '4px',
            borderRadius: '12px',
            border: '1px solid var(--border-color)'
          }}>
            <button 
              onClick={() => setExamKey('MPSC_RAJYASEVA')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: examKey === 'MPSC_RAJYASEVA' ? 'var(--accent-primary)' : 'transparent',
                color: examKey === 'MPSC_RAJYASEVA' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              MPSC राजसेवा (Rajyaseva 2027)
            </button>
            <button 
              onClick={() => setExamKey('TALATHI_GROUP_C')}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                background: examKey === 'TALATHI_GROUP_C' ? 'var(--accent-primary)' : 'transparent',
                color: examKey === 'TALATHI_GROUP_C' ? '#fff' : 'var(--text-muted)',
                transition: 'all 0.2s'
              }}
            >
              तलाठी व गट-क (Group-C)
            </button>
          </div>
        </div>

        {/* Overall Progress Metrics */}
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
          
          <div className="glass-card" style={{ padding: '16px', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>अभ्यासक्रम पूर्ण</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--accent-primary)', margin: '4px 0' }}>
              {stats.overallPercent}%
            </div>
            <div className="progress-container" style={{ height: '8px', marginBottom: '6px' }}>
              <div className="progress-bar" style={{ width: `${stats.overallPercent}%`, background: 'var(--accent-primary)' }}></div>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {stats.studiedCount} / {stats.totalSubtopics} मायक्रो-घटक
            </span>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>रिव्हिजन पूर्ण</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--info)', margin: '4px 0' }}>
              {stats.revisionPercent}%
            </div>
            <div className="progress-container" style={{ height: '8px', marginBottom: '6px' }}>
              <div className="progress-bar" style={{ width: `${stats.revisionPercent}%`, background: 'var(--info)' }}></div>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {stats.revisedCount} / {stats.totalSubtopics} घटक रिव्हाईज्ड
            </span>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center', background: 'rgba(0,0,0,0.2)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>शिल्लक घटक</span>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--warning)', margin: '4px 0' }}>
              {stats.totalSubtopics - stats.studiedCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              वाचायचे बाकी असलेले सूक्ष्म मुद्दे
            </span>
          </div>

        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div 
        className="glass-card flex-row justify-between align-center" 
        style={{ padding: '16px 20px', flexWrap: 'wrap', gap: '14px' }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '8px 14px',
          flex: 1,
          minWidth: '240px'
        }}>
          <FiSearch color="var(--text-muted)" size={18} />
          <input 
            type="text" 
            placeholder="घटक शोधा (उदा. मूलभूत अधिकार, सह्याद्री, RBI, हडप्पा, प्रकाश...)" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              width: '100%',
              fontSize: '0.9rem'
            }}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Pills */}
        <div className="flex-row gap-2" style={{ flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'सर्व घटक' },
            { id: 'pending', label: '⏳ बाकी' },
            { id: 'studied', label: '✅ वाचलेले' },
            { id: 'revised', label: '🔄 रिव्हाईज्ड' }
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setStatusFilter(f.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                background: statusFilter === f.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.03)',
                color: statusFilter === f.id ? '#fff' : 'var(--text-secondary)'
              }}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subjects Accordion List */}
      <div className="flex-col gap-4">
        {syllabus.map(subItem => {
          const subName = subItem.subject;
          const isExpanded = expandedSubjects[subName] !== false;
          const subStat = stats.subjectStats[subName] || { studied: 0, total: 0, percent: 0 };
          const icon = SUBJECT_ICONS[subName] || '📚';

          // Filter topics based on search & status
          const filteredTopics = (subItem.topics || []).map(top => {
            const matchingSubtopics = (top.subtopics || []).filter(subtopic => {
              const key = getSubtopicKey(subName, top.name, subtopic);
              const isStudied = Boolean(progress.studied[key]);
              const isRevised = Boolean(progress.revised[key]);

              if (statusFilter === 'studied' && !isStudied) return false;
              if (statusFilter === 'revised' && !isRevised) return false;
              if (statusFilter === 'pending' && isStudied) return false;

              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesTitle = subtopic.toLowerCase().includes(q) || top.name.toLowerCase().includes(q) || subName.toLowerCase().includes(q);
                return matchesTitle;
              }

              return true;
            });

            return {
              ...top,
              filteredSubtopics: matchingSubtopics
            };
          }).filter(top => top.filteredSubtopics.length > 0);

          if (searchQuery.trim() && filteredTopics.length === 0) {
            return null;
          }

          return (
            <div 
              key={subName}
              className="glass-panel"
              style={{
                borderRadius: '18px',
                overflow: 'hidden',
                border: '1px solid var(--border-color)'
              }}
            >
              {/* Subject Accordion Header */}
              <div 
                onClick={() => toggleSubjectExpand(subName)}
                style={{
                  padding: '18px 24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  cursor: 'pointer',
                  background: isExpanded ? 'rgba(255, 255, 255, 0.03)' : 'transparent',
                  borderBottom: isExpanded ? '1px solid var(--border-color)' : 'none',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div className="flex-row gap-3 align-center">
                  <span style={{ fontSize: '1.6rem' }}>{icon}</span>
                  <div className="flex-col gap-1">
                    <div className="flex-row gap-2 align-center">
                      <span style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {subName}
                      </span>
                      {subItem.priority === 'high' && (
                        <span style={{
                          fontSize: '0.65rem',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '6px',
                          background: 'rgba(239, 68, 68, 0.2)',
                          color: 'var(--danger)'
                        }}>
                          High Priority
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {subStat.studied} / {subStat.total} घटक पूर्ण ({subStat.percent}%)
                    </span>
                  </div>
                </div>

                <div className="flex-row gap-4 align-center">
                  <div style={{ width: '120px' }}>
                    <div className="progress-container" style={{ height: '6px', marginBottom: '2px' }}>
                      <div className="progress-bar" style={{ width: `${subStat.percent}%`, background: 'var(--accent-primary)' }}></div>
                    </div>
                  </div>
                  {isExpanded ? <FiChevronUp size={20} color="var(--text-muted)" /> : <FiChevronDown size={20} color="var(--text-muted)" />}
                </div>
              </div>

              {/* Subject Topics & Subtopics List */}
              {isExpanded && (
                <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {filteredTopics.map((top, tIdx) => (
                    <div key={tIdx} className="flex-col gap-2">
                      <div className="flex-row justify-between align-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '6px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--accent-secondary)' }}>
                          📌 {top.name}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {top.filteredSubtopics.length} उपघटक
                        </span>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '10px',
                        paddingTop: '6px'
                      }}>
                        {top.filteredSubtopics.map((subtopic, sIdx) => {
                          const key = getSubtopicKey(subName, top.name, subtopic);
                          const isStudied = Boolean(progress.studied[key]);
                          const isRevised = Boolean(progress.revised[key]);

                          return (
                            <div 
                              key={sIdx}
                              style={{
                                padding: '12px 14px',
                                borderRadius: '12px',
                                background: isStudied ? 'rgba(34, 197, 94, 0.05)' : 'var(--glass-bg)',
                                border: isStudied ? '1px solid rgba(34, 197, 94, 0.3)' : '1px solid var(--border-color)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: '8px',
                                transition: 'all 0.2s ease'
                              }}
                            >
                              <div className="flex-col gap-1" style={{ flex: 1, minWidth: 0 }}>
                                <span style={{
                                  fontWeight: 600,
                                  fontSize: '0.85rem',
                                  color: isStudied ? 'var(--text-muted)' : 'var(--text-primary)',
                                  textDecoration: isStudied ? 'line-through' : 'none',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {subtopic}
                                </span>
                                
                                <div className="flex-row gap-2 align-center">
                                  {/* Studied Toggle */}
                                  <button 
                                    onClick={() => handleToggle(key, 'studied')}
                                    style={{
                                      background: isStudied ? 'var(--success)' : 'transparent',
                                      border: isStudied ? 'none' : '1px solid var(--border-color)',
                                      color: isStudied ? '#fff' : 'var(--text-muted)',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <FiCheck size={12} /> {isStudied ? 'वाचले (+10 XP)' : 'वाचा'}
                                  </button>

                                  {/* Revised Toggle */}
                                  <button 
                                    onClick={() => handleToggle(key, 'revised')}
                                    style={{
                                      background: isRevised ? 'var(--info)' : 'transparent',
                                      border: isRevised ? 'none' : '1px solid var(--border-color)',
                                      color: isRevised ? '#fff' : 'var(--text-muted)',
                                      padding: '2px 8px',
                                      borderRadius: '6px',
                                      fontSize: '0.7rem',
                                      fontWeight: 600,
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '4px'
                                    }}
                                  >
                                    <FiRotateCcw size={10} /> {isRevised ? 'रिव्हाईज्ड' : 'रिव्हिजन'}
                                  </button>
                                </div>
                              </div>

                              {/* Action Quick Launchers */}
                              <div className="flex-row gap-1 align-center">
                                <button 
                                  onClick={() => handleFocusClick(subName, subtopic)}
                                  className="btn"
                                  style={{
                                    padding: '6px',
                                    borderRadius: '8px',
                                    background: 'rgba(249, 115, 22, 0.1)',
                                    color: 'var(--accent-primary)',
                                    border: '1px solid var(--accent-glow)'
                                  }}
                                  title="या सूक्ष्म घटकासाठी Focus Timer सुरू करा"
                                >
                                  <FiPlay size={12} />
                                </button>

                                <button 
                                  onClick={() => handleAddToSrs(subName, top.name, subtopic)}
                                  className="btn"
                                  style={{
                                    padding: '6px',
                                    borderRadius: '8px',
                                    background: 'rgba(59, 130, 246, 0.1)',
                                    color: 'var(--info)',
                                    border: '1px solid rgba(59, 130, 246, 0.25)'
                                  }}
                                  title="हा घटक Spaced Repetition (SRS) डेकमध्ये जोडा"
                                >
                                  <FiRotateCcw size={12} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

    </div>
  );
};

export default MicroSyllabusChecklist;
