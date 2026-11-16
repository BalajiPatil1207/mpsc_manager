import React, { useState, useEffect } from 'react';
import { FiX, FiCheck, FiSave, FiAlertCircle, FiHelpCircle, FiPlus, FiTrash2 } from 'react-icons/fi';
import toast from 'react-hot-toast';

const EditQuestionModal = ({
  isOpen,
  onClose,
  initialData, // { question, options, correctOption, explanation, qIndex }
  onSave
}) => {
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState(['', '', '', '']);
  const [correctOption, setCorrectOption] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialData && isOpen) {
      setQuestionText(initialData.question || '');
      const rawOpts = Array.isArray(initialData.options) && initialData.options.length > 0 
        ? [...initialData.options] 
        : ['', '', '', ''];
      setOptions(rawOpts);
      setCorrectOption(typeof initialData.correctOption === 'number' ? initialData.correctOption : 0);
      setExplanation(initialData.explanation || '');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleOptionChange = (index, value) => {
    const updated = [...options];
    updated[index] = value;
    setOptions(updated);
  };

  const handleAddOption = () => {
    if (options.length >= 6) {
      return toast.error("जास्तीत जास्त ६ पर्याय ठेवता येतील.");
    }
    setOptions([...options, '']);
  };

  const handleRemoveOption = (index) => {
    if (options.length <= 2) {
      return toast.error("किमान २ पर्याय असणे आवश्यक आहे.");
    }
    const updated = options.filter((_, i) => i !== index);
    setOptions(updated);
    if (correctOption === index) {
      setCorrectOption(0);
    } else if (correctOption > index) {
      setCorrectOption(correctOption - 1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!questionText.trim()) {
      return toast.error("कृपया प्रश्न टाईप करा!");
    }
    const filledOptions = options.map(o => o.trim());
    if (filledOptions.some(o => !o)) {
      return toast.error("सर्व पर्यायांमध्ये मजकूर असणे आवश्यक आहे!");
    }
    if (correctOption < 0 || correctOption >= filledOptions.length) {
      return toast.error("कृपया योग्य उत्तर (Correct Option) निवडा!");
    }

    try {
      setSaving(true);
      await onSave({
        qIndex: initialData.qIndex,
        originalQIndex: initialData.originalQIndex,
        question: questionText.trim(),
        options: filledOptions,
        correctOption: Number(correctOption),
        explanation: explanation.trim()
      });
      onClose();
    } catch (err) {
      console.error("Save question error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        background: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !saving) onClose();
      }}
    >
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '20px',
          padding: '24px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '14px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ✏️ प्रश्न व पर्याय एडिट करा
            </h3>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              प्रश्नाचा मजकूर, पर्याय व बरोबर उत्तर दुरुस्त करा
            </span>
          </div>
          <button
            onClick={onClose}
            disabled={saving}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <FiX size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Question Text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              📝 प्रश्न मजकूर (Question Text):
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="येथे प्रश्न टाईप करा..."
              rows={3}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.95rem',
                lineHeight: 1.5,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Options Section */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                🔘 पर्याय आणि बरोबर उत्तर निवडा (Select Correct Answer):
              </label>
              {options.length < 6 && (
                <button
                  type="button"
                  onClick={handleAddOption}
                  style={{
                    background: 'rgba(249, 115, 22, 0.12)',
                    color: 'var(--accent-primary)',
                    border: '1px solid rgba(249, 115, 22, 0.3)',
                    borderRadius: '8px',
                    padding: '4px 10px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <FiPlus size={14} /> पर्याय जोडा
                </button>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {options.map((opt, idx) => {
                const isSelected = correctOption === idx;
                const optLetter = String.fromCharCode(65 + idx);

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(34, 197, 94, 0.08)' : 'var(--bg-tertiary)',
                      border: isSelected ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid var(--border-color)',
                      transition: 'all 0.2s'
                    }}
                  >
                    {/* Radio Button for Correct Answer */}
                    <label 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        cursor: 'pointer',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        background: isSelected ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
                        color: isSelected ? 'var(--success)' : 'var(--text-muted)',
                        fontWeight: 700,
                        fontSize: '0.85rem'
                      }}
                      title="या पर्यायाला बरोबर उत्तर म्हणून मार्क करा"
                    >
                      <input
                        type="radio"
                        name="correctOptionRadio"
                        checked={isSelected}
                        onChange={() => setCorrectOption(idx)}
                        style={{ accentColor: 'var(--success)', cursor: 'pointer', width: '16px', height: '16px' }}
                      />
                      <span>({optLetter})</span>
                    </label>

                    {/* Option Text Input */}
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => handleOptionChange(idx, e.target.value)}
                      placeholder={`पर्याय ${optLetter} मजकूर...`}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'transparent',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none'
                      }}
                    />

                    {isSelected && (
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <FiCheck /> बरोबर
                      </span>
                    )}

                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveOption(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--danger)',
                          cursor: 'pointer',
                          padding: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          opacity: 0.7
                        }}
                        title="हा पर्याय काढा"
                      >
                        <FiTrash2 size={16} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanation Text (Optional) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              💡 स्पष्टीकरण / संदर्भ (Explanation - पर्यायी):
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="या प्रश्नाचे योग्य स्पष्टीकरण येथे जोडू शकता..."
              rows={2}
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '10px',
                background: 'var(--bg-tertiary)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                lineHeight: 1.4,
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="btn"
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                padding: '8px 18px',
                fontSize: '0.9rem'
              }}
            >
              रद्द करा
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary"
              style={{
                padding: '8px 22px',
                fontSize: '0.9rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <FiSave size={16} />
              {saving ? 'सेव्ह होत आहे...' : 'बदल सेव्ह करा'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditQuestionModal;
