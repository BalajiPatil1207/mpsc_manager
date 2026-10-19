import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiPieChart, FiTrendingDown, FiAlertTriangle, FiCheckCircle, FiClock, FiRotateCcw, FiAward } from 'react-icons/fi';
import { getDeficitState } from '../utils/deficitTracker';
import { getSrsStats } from '../utils/srsEngine';

const Analytics = () => {
  const [metrics, setMetrics] = useState({
    prepScore: 0,
    syllabusCovered: 0,
    revisionHealth: 0,
    strong: [],
    weak: []
  });

  useEffect(() => {
    const daily = JSON.parse(localStorage.getItem('user_daily_tasks') || '[]');
    const pyqs = JSON.parse(localStorage.getItem('practice_pyqs') || '[]');
    const weeklyCompleted = parseInt(localStorage.getItem('weekly_completed')) || 0;
    
    const totalDailyCompleted = daily.filter(t => t.completed).length;
    const currentWeekly = weeklyCompleted + totalDailyCompleted;
    
    const prep = Math.min(100, Math.round((currentWeekly / 56) * 100));
    const pyqCount = pyqs.filter(p => p.completed).length;
    const syllabus = Math.min(100, prep + (pyqCount * 2)); 
    
    // Spaced Repetition (SRS) Engine metrics
    const srs = getSrsStats();
    const revision = srs.retentionIndex; 
    
    const subjectXP = {};
    for (let i = 0; i < localStorage.length; i++) {
       const key = localStorage.key(i);
       if (key && key.startsWith('xp_') && key !== 'xp_total') {
          const sub = key.replace('xp_', '');
          subjectXP[sub] = parseFloat(localStorage.getItem(key)) || 0;
       }
    }
    
    const sortedSubjects = Object.entries(subjectXP).sort((a,b) => b[1] - a[1]);
    const strongTopics = sortedSubjects.length > 0 ? sortedSubjects.slice(0, 3).map(s => `${s[0]} (${Math.floor(s[1])} XP)`) : [];
    
    const allKnownSubs = ['History', 'Geography', 'Polity', 'Economics', 'Science', 'Maths', 'Reasoning', 'Current Affairs'];
    const weakTopics = [];
    
    if (sortedSubjects.length > 3) {
      weakTopics.push(...sortedSubjects.slice(-3).map(s => `${s[0]} (${Math.floor(s[1])} XP)`));
    }
    
    allKnownSubs.forEach(sub => {
       if (weakTopics.length < 3 && !subjectXP[sub]) {
          weakTopics.push(`${sub} (Needs Practice)`);
       }
    });
    
    const deficit = getDeficitState();
    
    // Group backlog by subject
    const backlogBySubject = {};
    (deficit.backlogTasks || []).forEach(b => {
      const sub = b.subject || 'General';
      backlogBySubject[sub] = (backlogBySubject[sub] || 0) + 1;
    });

    setMetrics({
      prepScore: prep,
      syllabusCovered: syllabus,
      revisionHealth: revision,
      srsStats: srs,
      strong: strongTopics.length > 0 ? strongTopics : ['No robust data yet'],
      weak: weakTopics,
      deficitHours: deficit.deficitHours,
      totalPenalties: deficit.totalPenalties,
      backlogCount: deficit.backlogTasks.length,
      backlogBySubject,
      penaltyHistory: deficit.penaltyHistory.slice(0, 5),
      disciplineScore: Math.max(0, Math.round(100 - (deficit.deficitHours * 4)))
    });
  }, []);

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      <h1 className="heading-gradient" style={{ fontSize: '2.5rem' }}>Analytics Dashboard</h1>
      
      {/* Overall Performance */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>Overall Performance</h2>
        <div className="flex-col gap-6">
          <div>
            <div className="flex-row justify-between mb-2" style={{ marginBottom: '8px' }}>
              <span>Preparation Momentum</span>
              <span style={{ fontWeight: 600 }}>{metrics.prepScore}%</span>
            </div>
            <div className="progress-container" style={{ height: '12px' }}>
              <div className="progress-bar" style={{ width: `${metrics.prepScore}%` }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex-row justify-between mb-2" style={{ marginBottom: '8px' }}>
              <span>Syllabus Covered</span>
              <span style={{ fontWeight: 600 }}>{metrics.syllabusCovered}%</span>
            </div>
            <div className="progress-container" style={{ height: '12px' }}>
              <div className="progress-bar" style={{ width: `${metrics.syllabusCovered}%`, background: 'var(--info)' }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex-row justify-between mb-2" style={{ marginBottom: '8px' }}>
              <span>Revision Health</span>
              <span style={{ fontWeight: 600 }}>{metrics.revisionHealth}%</span>
            </div>
            <div className="progress-container" style={{ height: '12px' }}>
              <div className="progress-bar" style={{ width: `${metrics.revisionHealth}%`, background: 'var(--warning)' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* Study Deficit & XP Penalty Report - "माझा अभ्यास किती कमी पडत आहे?" */}
      <div className="glass-panel" style={{ padding: '24px', borderLeft: (metrics.deficitHours || 0) > 0 ? '4px solid var(--danger)' : '4px solid var(--success)' }}>
        <div className="flex-row justify-between align-center" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiTrendingDown color={(metrics.deficitHours || 0) > 0 ? 'var(--danger)' : 'var(--success)'} />
              अभ्यास तूट व XP पेनल्टी विश्लेषण (Study Deficit Audit)
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ज्या दिवशी अभ्यास झाला नाही त्या दिवसांचे कापलेले गुण आणि राहिलेला बॅकलॉग
            </span>
          </div>
          <span style={{
            padding: '6px 14px',
            borderRadius: '20px',
            background: (metrics.deficitHours || 0) > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
            color: (metrics.deficitHours || 0) > 0 ? 'var(--danger)' : 'var(--success)',
            fontWeight: 700,
            fontSize: '0.85rem'
          }}>
            {(metrics.deficitHours || 0) > 0 ? `⚠️ ${metrics.deficitHours} तास तूट` : '🟢 शून्य तूट (वेळेवर)'}
          </span>
        </div>

        {/* 3 Deficit Metric Cards */}
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>एकूण अभ्यास तूट</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: (metrics.deficitHours || 0) > 0 ? 'var(--danger)' : 'var(--success)', margin: '4px 0' }}>
              {metrics.deficitHours || 0} <span style={{ fontSize: '1rem' }}>तास</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {(metrics.deficitHours || 0) > 0 ? 'नियोजनापेक्षा मागे पडलेला वेळ' : 'पूर्ण वेळ अभ्यास'}
            </span>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>दंडामुळे वजा झालेले XP</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)', margin: '4px 0' }}>
              -{metrics.totalPenalties || 0} <span style={{ fontSize: '1rem' }}>XP</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              अभ्यास न झालेल्या दिवसांची पेनल्टी
            </span>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>शिल्लक बॅकलॉग टास्क्स</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)', margin: '4px 0' }}>
              {metrics.backlogCount || 0} <span style={{ fontSize: '1rem' }}>विषय</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              भरून काढायचे राहिलेले टास्क्स
            </span>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>अभ्यास सातत्य स्कोअर</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--info)', margin: '4px 0' }}>
              {metrics.disciplineScore || 100}%
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Discipline & Consistency
            </span>
          </div>
        </div>

        {/* Subject-wise Deficit Breakdown */}
        {metrics.backlogBySubject && Object.keys(metrics.backlogBySubject).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--warning)' }}>
              📚 कोणत्या विषयाचा अभ्यास किती कमी पडत आहे?
            </h3>
            <div className="flex-row gap-3" style={{ flexWrap: 'wrap' }}>
              {Object.entries(metrics.backlogBySubject).map(([sub, count]) => (
                <div key={sub} style={{ padding: '10px 16px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', fontSize: '0.875rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{sub}: </strong>
                  <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{count} टास्क्स मागे</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Penalty Logs */}
        {metrics.penaltyHistory && metrics.penaltyHistory.length > 0 && (
          <div>
            <h3 style={{ fontSize: '1rem', marginBottom: '12px' }}>
              📅 मागील पेनल्टी नोंदी (Recent Deductions)
            </h3>
            <div className="flex-col gap-2">
              {metrics.penaltyHistory.map((p, idx) => (
                <div key={idx} style={{ padding: '10px 14px', background: 'var(--glass-bg)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    <strong>{p.date}</strong> — {p.reason}
                  </span>
                  <span style={{ fontWeight: 700, color: p.xpDeducted > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {p.xpDeducted > 0 ? `-${p.xpDeducted}` : `+${Math.abs(p.xpDeducted)}`} XP
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Spaced Repetition (SRS) Retention Engine Report */}
      <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--accent-primary)' }}>
        <div className="flex-row justify-between align-center" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiRotateCcw color="var(--accent-primary)" />
              स्मरण व रिव्हिजन चक्र (Spaced Repetition Retention Engine)
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Hermann Ebbinghaus [1, 3, 7, 15, 30 दिवस] नियमानुसार स्मरण क्षमता व प्रभुत्व पातळी
            </span>
          </div>
          <span style={{
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'var(--accent-glow)',
            color: 'var(--accent-primary)',
            fontWeight: 700,
            fontSize: '0.85rem',
            border: '1px solid var(--accent-primary)'
          }}>
            Retention Index: {metrics.revisionHealth || 0}%
          </span>
        </div>

        {/* Stage Distribution Cards */}
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { stage: 1, title: 'Stage 1 (Day 1)', count: metrics.srsStats?.stageCounts?.[1] || 0, color: '#ef4444', desc: 'प्राथमिक स्मरण' },
            { stage: 2, title: 'Stage 2 (Day 3)', count: metrics.srsStats?.stageCounts?.[2] || 0, color: '#f59e0b', desc: 'दृढीकरण' },
            { stage: 3, title: 'Stage 3 (Day 7)', count: metrics.srsStats?.stageCounts?.[3] || 0, color: '#3b82f6', desc: 'मध्यम मुदत' },
            { stage: 4, title: 'Stage 4 (Day 15)', count: metrics.srsStats?.stageCounts?.[4] || 0, color: '#8b5cf6', desc: 'दीर्घ स्मरण' },
            { stage: 5, title: 'Stage 5 (Mastered)', count: metrics.srsStats?.stageCounts?.[5] || 0, color: '#22c55e', desc: 'तोंडपाठ' },
          ].map(s => (
            <div key={s.stage} className="glass-card" style={{ padding: '14px', textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.title}</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, margin: '4px 0' }}>
                {s.count}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{s.desc}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 18px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            डेकमध्ये एकूण: <strong>{metrics.srsStats?.totalTopics || 0} विषय</strong> | आज रिव्हिजन बाकी: <strong style={{ color: 'var(--warning)' }}>{metrics.srsStats?.dueCount || 0} घटक</strong> | पूर्ण तोंडपाठ: <strong style={{ color: 'var(--success)' }}>{metrics.srsStats?.masteredCount || 0} घटक</strong>
          </span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '16px', color: 'var(--danger)' }}>🔴 Priority Areas (Weak)</h3>
          <div className="flex-col gap-3">
             {metrics.weak.map((topic, i) => (
                <div key={i} style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--danger)' }}>
                   {topic}
                </div>
             ))}
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '16px', color: 'var(--success)' }}>🟢 Strong Topics</h3>
          <div className="flex-col gap-3">
             {metrics.strong.map((topic, i) => (
                <div key={i} style={{ padding: '12px 16px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--success)' }}>
                   {topic}
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
