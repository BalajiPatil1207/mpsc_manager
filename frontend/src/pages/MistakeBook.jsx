import React from 'react';
import { FiXCircle, FiBook } from 'react-icons/fi';

const MistakeBook = () => {
  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      <div className="flex-row justify-between">
        <div>
          <h1 className="heading-gradient" style={{ fontSize: '2.5rem' }}>📕 Mistake Book</h1>
          <p style={{ color: 'var(--text-secondary)' }}>AI auto-saves your incorrect answers so you never repeat them. (Feature in active tracking)</p>
        </div>
        <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderColor: 'var(--danger)' }}>
          <span style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--danger)' }}>0</span>
          <br />
          <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total Mistakes</span>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Subject Breakdown</h3>
          <div className="flex-col gap-4">
            <p style={{ color: 'var(--text-muted)' }}>No mistakes tracked yet.</p>
          </div>
        </div>

        <div className="glass-panel" style={{ padding: '24px', gridColumn: 'span 2' }}>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '20px' }}>Recent Log</h2>
          <div className="flex-col gap-4">
            <p style={{ color: 'var(--text-muted)' }}>Take a Mock Test to populate your log.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MistakeBook;
