import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { FiFilm, FiPlay, FiCopy, FiTrash2 } from 'react-icons/fi';
import ConfirmModal from '../components/ConfirmModal';

const NoteReels = () => {
  const [jsonInput, setJsonInput] = useState('[\n  {\n    "topic": "Geography",\n    "subtopic": "Physical Geography",\n    "content": "The Earth is divided into three main layers: crust, mantle, and core."\n  },\n  {\n    "topic": "History",\n    "subtopic": "Ancient India",\n    "content": "Indus Valley Civilization is one of the oldest civilizations..."\n  }\n]');
  const [title, setTitle] = useState('Super Quick Notes');
  const [subject, setSubject] = useState('Mixed');
  const [reelLink, setReelLink] = useState('');
  const [history, setHistory] = useState([]);
  const [filterSubject, setFilterSubject] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const navigate = useNavigate();

  const fetchHistory = async () => {
    try {
      const res = await axios.get('https://mpsc-manager.onrender.com/api/reels/all');
      if(res.data.success) {
        setHistory(res.data.data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleCreate = async () => {
    let parsedCards;
    try {
      // Remove any weird quotes if pasted from word
      const cleanedJson = jsonInput.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");
      parsedCards = JSON.parse(cleanedJson);
    } catch(e) {
      return toast.error('Invalid JSON format! Check commas and brackets.');
    }
    
    if(!Array.isArray(parsedCards)) return toast.error("JSON must be an array of objects!");
      
    try {
      const toastId = toast.loading("Creating Study Reel...");
      const res = await axios.post('https://mpsc-manager.onrender.com/api/reels', {
        title,
        subject,
        cards: parsedCards
      });

      if(res.data.success) {
        const link = `${window.location.origin}/reel/${res.data.reelId}`;
        setReelLink(link);
        toast.success('Study Reel Created!', { id: toastId });
        fetchHistory();
      }
    } catch(err) {
      toast.error('Server error saving the reel!', { id: toastId });
      console.error(err);
    }
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success("Link Copied!");
  };

  const processDelete = async () => {
    if(!deleteTarget) return;
    try {
      await axios.delete(`https://mpsc-manager.onrender.com/api/reels/${deleteTarget}`);
      toast.success("Reel deleted!");
      setDeleteTarget(null);
      fetchHistory();
    } catch(e) {
      toast.error("Failed to delete");
      setDeleteTarget(null);
    }
  };

  const filteredHistory = history.filter(h => {
    if (!filterSubject) return true;
    const subj = (h.subject || '').toLowerCase();
    const filterId = filterSubject.toLowerCase();
    if (filterId === 'history') return subj.includes('history') || subj.includes('gk');
    return subj.includes(filterId);
  });

  const SUBJECTS = [
    { id: 'History', label: 'इतिहास', icon: '📖' },
    { id: 'Geography', label: 'भूगोल', icon: '🌍' },
    { id: 'Polity', label: 'राज्यव्यवस्था', icon: '🏛️' },
    { id: 'Economics', label: 'अर्थव्यवस्था', icon: '📈' },
    { id: 'Science', label: 'सामान्य विज्ञान', icon: '🧬' },
    { id: 'Math', label: 'गणित', icon: '🧮' },
    { id: 'Reasoning', label: 'बुद्धिमत्ता', icon: '🧠' },
    { id: 'Marathi', label: 'मराठी', icon: '🔠' },
    { id: 'English', label: 'इंग्रजी', icon: '🅰️' },
    { id: 'Current Affairs', label: 'चालू घडामोडी', icon: '📰' }
  ];

  const activeSubjectData = filterSubject ? SUBJECTS.find(s => s.id === filterSubject) : null;

  if (filterSubject && activeSubjectData) {
    return (
      <div className="flex-col gap-6" style={{ paddingBottom: '40px', animation: 'fadeIn 0.3s' }}>
        <div className="flex-row gap-4 align-center" style={{ marginBottom: '8px' }}>
          <button className="btn" onClick={() => setFilterSubject('')} style={{ background: 'var(--glass-bg)', padding: '8px 16px', border: '1px solid var(--border-color)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>←</span> Back to All Subjects
          </button>
        </div>
        
        <div className="flex-row justify-between" style={{ alignItems: 'center' }}>
          <h1 className="heading-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>
            <span style={{ marginRight: '12px' }}>{activeSubjectData.icon}</span> 
            {activeSubjectData.label} Notes & Reels
          </h1>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>All fast-paced flashcard reels for {activeSubjectData.label}.</p>
        
        <div className="glass-panel" style={{ padding: '24px', gridColumn: '1 / -1' }}>
           <div className="flex-col gap-4">
             {filteredHistory.filter(h => {
               const subj = (h.subject || '').toLowerCase();
               const activeId = activeSubjectData.id.toLowerCase();
               if (activeId === 'history') return subj.includes('history') || subj.includes('gk');
               return subj.includes(activeId);
             }).length === 0 ? (
               <div style={{ textAlign: 'center', padding: '40px' }}>
                 <p style={{ color: 'var(--text-muted)' }}>No reels available for {activeSubjectData.label}.</p>
               </div>
             ) : null}
             
             {filteredHistory.filter(h => {
               const subj = (h.subject || '').toLowerCase();
               const activeId = activeSubjectData.id.toLowerCase();
               if (activeId === 'history') return subj.includes('history') || subj.includes('gk');
               return subj.includes(activeId);
             }).map(reel => (
               <div key={reel.id} className="glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--accent-secondary)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', background: 'var(--bg-primary)' }}>
                 <div className="flex-col gap-2">
                   <div className="flex-row gap-2 align-center">
                     <h3 style={{ fontSize: '1.125rem', margin: 0, color: 'var(--text-primary)' }}>{reel.title}</h3>
                     <span className="badge pending" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
                       {reel.cards?.length || 0} Cards
                     </span>
                   </div>
                   <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                     {reel.subject} • {new Date(reel.createdAt).toLocaleDateString()}
                   </p>
                 </div>
                 <div className="flex-row gap-2">
                     <button title="Delete" onClick={() => setDeleteTarget(reel.id)} className="btn task-action-btn" style={{ padding: '8px 16px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
                       <span className="desktop-text">Delete</span>
                       <FiTrash2 className="mobile-icon" size={16} />
                     </button>
                     <button title="Copy Link" onClick={() => copyLink(`${window.location.origin}/reel/${reel.id}`)} className="btn task-action-btn" style={{ padding: '8px 16px', background: 'var(--glass-bg)', color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
                       <span className="desktop-text">Share</span>
                       <FiCopy className="mobile-icon" size={16} />
                     </button>
                     <button className="btn btn-primary task-action-btn" onClick={() => navigate(`/reel/${reel.id}`)} style={{ padding: '8px 24px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', background: 'var(--accent-secondary)' }}>
                       <span className="desktop-text" style={{display:'flex', alignItems:'center', gap:'6px'}}><FiPlay size={16} /> Watch</span>
                       <FiPlay className="mobile-icon" size={16} />
                     </button>
                 </div>
               </div>
             ))}
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px', animation: 'fadeIn 0.3s' }}>
      <div className="flex-row justify-between align-center">
        <h1 className="heading-gradient" style={{ fontSize: '2.5rem' }}>Study Reels Studio</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)' }}>Create highly engaging, shareable flashcard reels for quick revision.</p>
      
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr', maxWidth: '100vw' }}>
        
        {/* Reel Library */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '100%', overflowX: 'hidden' }}>
           
           <div className="flex-row justify-between align-center" style={{ marginBottom: '16px' }}>
             <h2 style={{ fontSize: '1.25rem' }}>📚 Subject Wise Notes</h2>
             <button className="btn" onClick={() => navigate('/test-maker')} style={{ padding: '6px 12px', fontSize: '0.875rem', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>+ Create New Reel</button>
           </div>
           
           <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 280px), 1fr))' }}>
             {SUBJECTS.map(sub => {
                const reelsForThisSubject = history.filter(h => {
                  const subj = (h.subject || '').toLowerCase();
                  const subId = sub.id.toLowerCase();
                  if (subId === 'history') return subj.includes('history') || subj.includes('gk');
                  return subj.includes(subId);
                });
                
                return (
                  <div key={sub.id} className="flex-col gap-2">
                     {/* BIG SUBJECT CARD */}
                     <button 
                        onClick={() => setFilterSubject(sub.id)}
                        className="glass-card" 
                        style={{ 
                           width: '100%',
                           padding: '24px 24px', 
                           display: 'flex', 
                           alignItems: 'center', 
                           justifyContent: 'flex-start',
                           gap: '16px', 
                           background: 'var(--glass-bg)',
                           border: '1px solid var(--border-color)',
                           borderRadius: '20px',
                           cursor: 'pointer',
                           transition: 'all 0.3s ease'
                        }}
                     >
                        <span style={{ fontSize: '2.5rem' }}>{sub.icon}</span>
                        <span style={{ fontSize: '1.35rem', fontWeight: 600, color: 'var(--text-primary)' }}>{sub.label}</span>
                        <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.1)', padding: '6px 12px', borderRadius: '12px', fontSize: '0.875rem' }}>{reelsForThisSubject.length} Reels</span>
                     </button>
                  </div>
                );
             })}
           </div>
        </div>
      </div>

      <ConfirmModal 
        isOpen={!!deleteTarget}
        title="Delete Reel"
        message="Are you sure you want to permanently delete this reel? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        isDanger={true}
        onConfirm={processDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default NoteReels;
