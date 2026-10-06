import React from 'react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Confirm", cancelText = "Cancel", isDanger = false }) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '16px' }}>{title}</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.5 }}>
          {message}
        </p>
        <div className="flex-row gap-4 justify-center">
          <button 
            onClick={onCancel} 
            className="btn" 
            style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
          >
            {cancelText}
          </button>
          <button 
            onClick={onConfirm} 
            className="btn" 
            style={{ background: isDanger ? 'var(--danger)' : 'var(--accent-primary)', color: 'white', border: 'none' }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
