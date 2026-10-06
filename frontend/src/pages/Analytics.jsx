import React from 'react';
import { FiTrendingUp, FiPieChart } from 'react-icons/fi';

const Analytics = () => {
  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      <h1 className="heading-gradient" style={{ fontSize: '2.5rem' }}>Analytics Dashboard</h1>
      
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>Overall Performance</h2>
        <div className="flex-col gap-6">
          <div>
            <div className="flex-row justify-between mb-2" style={{ marginBottom: '8px' }}>
              <span>Preparation</span>
              <span>0%</span>
            </div>
            <div className="progress-container" style={{ height: '12px' }}>
              <div className="progress-bar" style={{ width: '0%' }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex-row justify-between mb-2" style={{ marginBottom: '8px' }}>
              <span>Syllabus Covered</span>
              <span>0%</span>
            </div>
            <div className="progress-container" style={{ height: '12px' }}>
              <div className="progress-bar" style={{ width: '0%', background: 'var(--info)' }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex-row justify-between mb-2" style={{ marginBottom: '8px' }}>
              <span>Revision Health</span>
              <span>0%</span>
            </div>
            <div className="progress-container" style={{ height: '12px' }}>
              <div className="progress-bar" style={{ width: '0%', background: 'var(--warning)' }}></div>
            </div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '16px', color: 'var(--danger)' }}>🔴 Weak Topics</h3>
          <div className="flex-col gap-4">
             <p style={{color: 'var(--text-muted)'}}>No data available.</p>
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '16px', color: 'var(--success)' }}>🟢 Strong Topics</h3>
          <div className="flex-col gap-4">
             <p style={{color: 'var(--text-muted)'}}>No data available.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;
