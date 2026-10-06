import React, { useState, useEffect } from 'react';
import { FiTrendingUp, FiPieChart } from 'react-icons/fi';

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
    const revision = totalDailyCompleted > 0 ? 85 : 40; 
    
    const strongTopics = [];
    if (pyqs.some(p => p.id === 'his_foundation' && p.completed)) strongTopics.push('History Foundation');
    if (pyqs.some(p => p.id === 'geo_basics' && p.completed)) strongTopics.push('Geography');
    if (daily.some(t => t.id === 'reasoning' && t.completed)) strongTopics.push('Reasoning');
    if (daily.some(t => t.id === 'maths' && t.completed)) strongTopics.push('Maths');
    
    const defaultWeak = ['Polity Framework', 'Basic Economics', 'Monthly Current Affairs'];
    
    setMetrics({
      prepScore: prep,
      syllabusCovered: syllabus,
      revisionHealth: revision,
      strong: strongTopics.length > 0 ? strongTopics : ['No robust data yet'],
      weak: defaultWeak
    });
  }, []);

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      <h1 className="heading-gradient" style={{ fontSize: '2.5rem' }}>Analytics Dashboard</h1>
      
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
