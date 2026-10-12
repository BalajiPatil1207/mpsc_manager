import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { FiChevronUp, FiChevronDown, FiX, FiShare2 } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';

const ReelViewer = () => {
  const { reelId } = useParams();
  const navigate = useNavigate();
  const [reel, setReel] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0); // 1 = down, -1 = up

  useEffect(() => {
    const fetchReel = async () => {
      try {
        const res = await axios.get(`https://mpsc-manager.onrender.com/api/reels/${reelId}`);
        if(res.data.success) {
          setReel(res.data.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchReel();
  }, [reelId]);

  const handleNext = () => {
    if (reel && currentIndex < reel.cards.length - 1) {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setDirection(-1);
      setCurrentIndex(prev => prev - 1);
    }
  };
  
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, reel]);

  useEffect(() => {
    if (!reel || currentIndex >= reel.cards.length - 1) return;
    
    // Auto advance every 15 seconds
    const timer = setTimeout(() => {
      setDirection(1);
      setCurrentIndex(prev => prev + 1);
    }, 15000);
    
    return () => clearTimeout(timer);
  }, [currentIndex, reel]);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100dvh', gap: '32px' }}>
      <div className="premium-loader">
         <div className="ring"></div>
         <div className="ring"></div>
         <div className="ring"></div>
         <span className="premium-loader-text" style={{ fontSize: '1.25rem', fontFamily: 'serif', fontStyle: 'italic', color: 'var(--accent-primary)' }}>1207</span>
      </div>
      <p style={{ color: 'var(--text-secondary)', letterSpacing: '3px', textTransform: 'uppercase', animation: 'pulse 1.5s infinite', fontSize: '0.875rem', fontWeight: 600 }}>Loading Reel Data</p>
    </div>
  );
  if (!reel) return <div style={{ color: 'var(--text-primary)', padding: '40px', textAlign: 'center' }}>Reel not found!</div>;

  const currentCard = reel.cards[currentIndex];

  const renderCardContent = (card) => {
    if (!card) return null;

    // Check all potential keys for content/points
    const rawContent = 
      card.points || 
      card.bullets || 
      card.bullet_points || 
      card.details || 
      card.content || 
      card.notes || 
      card.description || 
      card.text ||
      card.explanation ||
      card.info;

    // If it's an Array of points
    if (Array.isArray(rawContent) && rawContent.length > 0) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
          {rawContent.map((point, idx) => (
            <div 
              key={idx} 
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                background: 'var(--glass-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '12px 14px',
                fontSize: '1.05rem',
                color: 'var(--text-primary)',
                lineHeight: 1.5,
                boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
              }}
            >
              <span style={{ color: 'var(--accent-primary)', fontSize: '1.1rem', flexShrink: 0, marginTop: '2px' }}>⚡</span>
              <span style={{ flex: 1, fontWeight: 500 }}>{typeof point === 'string' ? point : JSON.stringify(point)}</span>
            </div>
          ))}
        </div>
      );
    }

    // If it's a string
    if (typeof rawContent === 'string' && rawContent.trim().length > 0) {
      const lines = rawContent.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length > 1) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            {lines.map((line, idx) => (
              <div 
                key={idx} 
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  fontSize: '1.05rem',
                  color: 'var(--text-primary)',
                  lineHeight: 1.5,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.03)'
                }}
              >
                <span style={{ color: 'var(--accent-primary)', fontSize: '1.1rem', flexShrink: 0, marginTop: '2px' }}>⚡</span>
                <span style={{ flex: 1, fontWeight: 500 }}>{line.replace(/^[-*•\d.]\s*/, '')}</span>
              </div>
            ))}
          </div>
        );
      }
      return (
        <div style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--border-color)',
          borderRadius: '16px',
          padding: '18px 20px',
          fontSize: '1.15rem',
          color: 'var(--text-primary)',
          lineHeight: 1.6,
          fontWeight: 500,
          whiteSpace: 'pre-wrap'
        }}>
          {rawContent}
        </div>
      );
    }

    // Fallback: check if there are any other properties in card
    const otherKeys = Object.keys(card).filter(k => 
      !['topic', 'subtopic', 'title', 'heading', 'subject', 'category'].includes(k.toLowerCase())
    );
    if (otherKeys.length > 0) {
      const fallbackVal = card[otherKeys[0]];
      if (Array.isArray(fallbackVal)) {
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%' }}>
            {fallbackVal.map((pt, idx) => (
              <div key={idx} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                background: 'var(--glass-bg)',
                border: '1px solid var(--border-color)',
                borderRadius: '14px',
                padding: '12px 14px',
                fontSize: '1.05rem',
                color: 'var(--text-primary)',
                lineHeight: 1.5
              }}>
                <span style={{ color: 'var(--accent-primary)', fontSize: '1.1rem', flexShrink: 0, marginTop: '2px' }}>⚡</span>
                <span style={{ flex: 1 }}>{typeof pt === 'string' ? pt : JSON.stringify(pt)}</span>
              </div>
            ))}
          </div>
        );
      }
      if (fallbackVal) {
        return (
          <div style={{
            background: 'var(--glass-bg)',
            border: '1px solid var(--border-color)',
            borderRadius: '16px',
            padding: '18px 20px',
            fontSize: '1.15rem',
            color: 'var(--text-primary)',
            lineHeight: 1.6
          }}>
            {String(fallbackVal)}
          </div>
        );
      }
    }

    return (
      <div style={{ color: 'var(--text-muted)', fontStyle: 'italic', padding: '16px 0', textAlign: 'center' }}>
        (माहिती उपलब्ध नाही)
      </div>
    );
  };

  return (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Decor */}
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)', zIndex: 0, opacity: 0.5 }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 70%)', zIndex: 0, opacity: 0.5 }}></div>

      {/* Auto-Advance Progress Bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'rgba(255,255,255,0.05)', zIndex: 100 }}>
        {reel && currentIndex < reel.cards.length - 1 && (
          <motion.div 
            key={currentIndex}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 15, ease: 'linear' }}
            style={{ height: '100%', background: 'var(--accent-primary)', boxShadow: '0 0 10px var(--accent-glow)' }}
          />
        )}
      </div>

      {/* Close and Share */}
      <div style={{ position: 'absolute', top: '24px', left: '24px', zIndex: 20 }}>
        <button className="btn" onClick={() => navigate('/reels')} style={{ background: 'var(--glass-bg)', color: 'var(--text-primary)', borderRadius: '50%', width: '48px', height: '48px', padding: 0, border: '1px solid var(--border-color)' }}>
          <FiX size={24} />
        </button>
      </div>

      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 20, display: 'flex', gap: '16px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
          {currentIndex + 1} / {reel.cards.length}
        </span>
        <button className="btn" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Reel link shared!"); }} style={{ background: 'var(--glass-bg)', color: 'var(--text-primary)', borderRadius: '50%', width: '48px', height: '48px', padding: 0, border: '1px solid var(--border-color)' }}>
          <FiShare2 size={24} />
        </button>
      </div>

      {/* Main Card Container */}
      <div style={{ width: '100%', maxWidth: '440px', height: 'min(84vh, 660px)', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', margin: '0 16px' }}>
        
        {/* Card Frame with AnimatePresence */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', perspective: '1000px', borderRadius: '32px' }}>
          <AnimatePresence initial={false} custom={direction} mode="popLayout">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={{
                enter: (dir) => ({
                  y: dir > 0 ? 1000 : -1000,
                  opacity: 0,
                  rotateX: dir > 0 ? 45 : -45,
                  scale: 0.9
                }),
                center: {
                  zIndex: 1,
                  y: 0,
                  opacity: 1,
                  rotateX: 0,
                  scale: 1
                },
                exit: (dir) => ({
                  zIndex: 0,
                  y: dir < 0 ? 1000 : -1000,
                  opacity: 0,
                  rotateX: dir < 0 ? 45 : -45,
                  scale: 0.9
                })
              }}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 350, damping: 25 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={0.8}
              onDragEnd={(e, { offset, velocity }) => {
                const swipePower = Math.abs(offset.y) * velocity.y;
                if (swipePower < -50000 || offset.y < -150) {
                  handleNext();
                } else if (swipePower > 50000 || offset.y > 150) {
                  handlePrev();
                }
              }}
              className="glass-card" 
              style={{ 
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', flexDirection: 'column', padding: '32px 24px 20px 24px', 
                border: '1px solid var(--border-color)', borderRadius: '32px', 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
                background: 'var(--bg-secondary)',
                overflow: 'hidden'
              }}
            >
              {/* Header: Topic Badge + Subtopic Title */}
              <div style={{ flexShrink: 0, marginBottom: '14px' }}>
                <span style={{ 
                  background: 'var(--accent-glow)', 
                  color: 'var(--accent-primary)', 
                  padding: '6px 14px', 
                  borderRadius: '100px', 
                  fontSize: '0.78rem', 
                  fontWeight: 800, 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.8px',
                  display: 'inline-block'
                }}>
                  {currentCard.topic || currentCard.subject || currentCard.category || 'MPSC Study OS'}
                </span>
                <h2 style={{ 
                  fontSize: '1.65rem', 
                  marginTop: '12px', 
                  marginBottom: 0,
                  color: 'var(--text-primary)', 
                  lineHeight: 1.25,
                  fontWeight: 800
                }}>
                  {currentCard.subtopic || currentCard.title || currentCard.heading || ''}
                </h2>
              </div>

              {/* Scrollable Points / Content Body */}
              <div 
                className="reel-card-content-scroll"
                style={{ 
                  flex: 1, 
                  overflowY: 'auto', 
                  paddingRight: '4px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-start',
                  minHeight: 0
                }}
              >
                {renderCardContent(currentCard)}
              </div>

              {/* Footer Stamp */}
              <div style={{ flexShrink: 0, marginTop: '12px', paddingTop: '10px', textAlign: 'center', borderTop: '1px solid var(--border-color)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px' }}>MahaPrep AI Study OS</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="btn"
            style={{ borderRadius: '50%', width: '56px', height: '56px', padding: 0, background: currentIndex === 0 ? 'var(--glass-bg)' : 'var(--bg-tertiary)', color: currentIndex === 0 ? 'var(--text-muted)' : 'var(--text-primary)', border: '1px solid var(--border-color)', opacity: currentIndex === 0 ? 0.4 : 1 }}
          >
            <FiChevronUp size={28} />
          </button>
          
          <button 
            onClick={handleNext}
            disabled={currentIndex === reel.cards.length - 1}
            className="btn"
            style={{ borderRadius: '50%', width: '56px', height: '56px', padding: 0, background: currentIndex === reel.cards.length - 1 ? 'var(--glass-bg)' : 'var(--accent-primary)', color: currentIndex === reel.cards.length - 1 ? 'var(--text-muted)' : 'white', border: currentIndex === reel.cards.length - 1 ? '1px solid var(--border-color)' : 'none', opacity: currentIndex === reel.cards.length - 1 ? 0.4 : 1, boxShadow: currentIndex === reel.cards.length - 1 ? 'none' : '0 8px 20px var(--accent-glow)' }}
          >
            <FiChevronDown size={28} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReelViewer;
