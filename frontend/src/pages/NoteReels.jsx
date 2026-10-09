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

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      <div className="flex-row justify-between align-center">
        <h1 className="heading-gradient" style={{ fontSize: '2.5rem' }}>Study Reels Studio</h1>
      </div>
      <p style={{ color: 'var(--text-secondary)' }}>Create highly engaging, shareable flashcard reels for quick revision.</p>
      
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
        
        {/* Reel Library */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: '650px' }}>
           <div className="flex-row justify-between align-center">
             <h2 style={{ fontSize: '1.25rem' }}>📚 Your Reels</h2>
             <button className="btn" onClick={() => navigate('/test-maker')} style={{ padding: '6px 12px', fontSize: '0.875rem', background: 'var(--glass-bg)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>+ Create New Reel</button>
           </div>
           
           <div className="flex-col gap-4">
             {history.length === 0 ? (
               <div style={{ textAlign: 'center', padding: '40px', background: 'var(--glass-bg)', borderRadius: '12px' }}>
                 <p style={{ color: 'var(--text-muted)' }}>No reels found.</p>
                 <button onClick={() => navigate('/test-maker')} className="btn btn-primary" style={{ marginTop: '16px' }}>Go to Creator Studio</button>
               </div>
             ) : null}
             
             {history.map(reel => (
               <div key={reel.id} className="glass-card" style={{ padding: '16px', borderLeft: '4px solid var(--accent-secondary)' }}>
                 <div className="flex-row justify-between align-center" style={{ marginBottom: '8px' }}>
                   <h3 style={{ fontSize: '1.125rem', margin: 0 }}>{reel.title}</h3>
                   <span className="badge pending" style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)' }}>
                     {reel.cards?.length || 0} Cards
                   </span>
                 </div>
                 <div className="flex-row justify-between align-center" style={{ flexWrap: 'wrap', gap: '12px' }}>
                   <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                     {reel.subject} • {new Date(reel.createdAt).toLocaleDateString()}
                   </p>
                   <div className="flex-row gap-2">
                     <button title="Delete Reel" onClick={() => setDeleteTarget(reel.id)} className="btn task-action-btn" style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
                       <span className="desktop-text">Delete</span>
                       <FiTrash2 className="mobile-icon" size={16} />
                     </button>
                     <button title="Copy Link" onClick={() => copyLink(`${window.location.origin}/reel/${reel.id}`)} className="btn task-action-btn" style={{ padding: '6px 12px', background: 'var(--glass-bg)', color: 'var(--text-secondary)', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}>
                       <span className="desktop-text">Share</span>
                       <FiCopy className="mobile-icon" size={16} />
                     </button>
                     <button className="btn btn-primary task-action-btn" onClick={() => navigate(`/reel/${reel.id}`)} style={{ padding: '6px 12px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', background: 'var(--accent-secondary)' }}>
                       <span className="desktop-text">Watch Now</span>
                       <FiPlay className="mobile-icon" size={16} />
                     </button>
                   </div>
                 </div>
               </div>
             ))}
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
