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

  if (loading) return <div style={{ color: 'var(--text-primary)', padding: '40px', textAlign: 'center' }}>Loading Reel...</div>;
  if (!reel) return <div style={{ color: 'var(--text-primary)', padding: '40px', textAlign: 'center' }}>Reel not found!</div>;

  const currentCard = reel.cards[currentIndex];

  return (
    <div style={{ height: '100vh', width: '100vw', background: 'var(--bg-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      
      {/* Background Decor */}
      <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, var(--accent-glow), transparent 70%)', zIndex: 0, opacity: 0.5 }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '50vw', height: '50vw', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.3), transparent 70%)', zIndex: 0, opacity: 0.5 }}></div>

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
      <div style={{ width: '100%', maxWidth: '420px', height: '80vh', position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column' }}>
        
        {/* Card Frame with AnimatePresence */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden', perspective: '1000px' }}>
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
                display: 'flex', flexDirection: 'column', padding: '40px 32px', 
                border: '1px solid var(--border-color)', borderRadius: '32px', 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                touchAction: 'none'
              }}
            >
              <div style={{ marginBottom: 'auto' }}>
                <span style={{ background: 'var(--accent-glow)', color: 'var(--accent-primary)', padding: '8px 16px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {currentCard.topic}
                </span>
                <h2 style={{ fontSize: '2rem', marginTop: '24px', color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {currentCard.subtopic}
                </h2>
              </div>

              <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 'auto' }}>
                {currentCard.content}
              </p>

              <div style={{ marginTop: 'auto', textAlign: 'center' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>MahaPrep AI Study OS</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '32px' }}>
          <button 
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="btn"
            style={{ borderRadius: '50%', width: '64px', height: '64px', padding: 0, background: currentIndex === 0 ? 'var(--glass-bg)' : 'var(--bg-tertiary)', color: currentIndex === 0 ? 'var(--text-muted)' : 'var(--text-primary)', border: '1px solid var(--border-color)', opacity: currentIndex === 0 ? 0.5 : 1 }}
          >
            <FiChevronUp size={32} />
          </button>
          
          <button 
            onClick={handleNext}
            disabled={currentIndex === reel.cards.length - 1}
            className="btn"
            style={{ borderRadius: '50%', width: '64px', height: '64px', padding: 0, background: currentIndex === reel.cards.length - 1 ? 'var(--glass-bg)' : 'var(--accent-primary)', color: currentIndex === reel.cards.length - 1 ? 'var(--text-muted)' : 'white', border: currentIndex === reel.cards.length - 1 ? '1px solid var(--border-color)' : 'none', opacity: currentIndex === reel.cards.length - 1 ? 0.5 : 1, boxShadow: currentIndex === reel.cards.length - 1 ? 'none' : '0 10px 25px var(--accent-glow)' }}
          >
            <FiChevronDown size={32} />
          </button>
        </div>

      </div>
    </div>
  );
};

export default ReelViewer;
