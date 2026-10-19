import React, { useState, useEffect, useRef } from 'react';
import { 
  FiPlay, FiPause, FiRotateCcw, FiCheck, FiX, FiMaximize2, 
  FiMinimize2, FiVolume2, FiVolume1, FiVolumeX, FiSettings, FiChevronDown, FiBookOpen
} from 'react-icons/fi';
import { playSound } from '../utils/sound';
import toast from 'react-hot-toast';

const PRESETS = [
  { id: 'pomodoro', name: 'पोमोडोरो (25m)', minutes: 25, breakMins: 5, icon: '🍅' },
  { id: 'deepwork', name: 'दीप वर्क (50m)', minutes: 50, breakMins: 10, icon: '⚡' },
  { id: 'powerhour', name: 'पॉवर अवर (60m)', minutes: 60, breakMins: 10, icon: '🚀' },
  { id: 'stopwatch', name: 'ओपन स्टॉपवॉच', minutes: 0, breakMins: 0, icon: '⏱️' }
];

const FocusTimerModal = ({ 
  isOpen, 
  onClose, 
  task, 
  onCompleteTask, 
  dailyTasks = [], 
  onSelectTask 
}) => {
  const [selectedPreset, setSelectedPreset] = useState('deepwork');
  const [initialSeconds, setInitialSeconds] = useState(50 * 60);
  const [secondsLeft, setSecondsLeft] = useState(50 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [elapsedTotal, setElapsedTotal] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [ambientSound, setAmbientSound] = useState('rain'); // 'off', 'rain', 'whitenoise'
  const [soundVolume, setSoundVolume] = useState(0.5);
  const [isTaskDropdownOpen, setIsTaskDropdownOpen] = useState(false);
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const modalRef = useRef(null);

  // Set initial duration when preset changes
  const applyPreset = (presetId) => {
    const preset = PRESETS.find(p => p.id === presetId);
    if (!preset) return;
    setSelectedPreset(presetId);
    setIsRunning(false);
    setIsBreak(false);
    if (preset.minutes === 0) {
      setInitialSeconds(0);
      setSecondsLeft(0);
    } else {
      const secs = preset.minutes * 60;
      setInitialSeconds(secs);
      setSecondsLeft(secs);
    }
  };

  // Timer Tick Interval
  useEffect(() => {
    let interval = null;
    if (isRunning) {
      interval = setInterval(() => {
        if (selectedPreset === 'stopwatch') {
          setSecondsLeft(prev => prev + 1);
          setElapsedTotal(prev => prev + 1);
        } else {
          setSecondsLeft(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              handleTimerComplete();
              return 0;
            }
            return prev - 1;
          });
          setElapsedTotal(prev => prev + 1);
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isRunning, selectedPreset, isBreak]);

  // Update browser tab title with countdown
  useEffect(() => {
    if (isOpen && isRunning) {
      const mins = Math.floor(secondsLeft / 60);
      const secs = secondsLeft % 60;
      const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      document.title = `(${formatted}) ⏱️ ${task?.title || 'दीप वर्क'} | MahaPrep`;
    } else {
      document.title = 'MahaPrep Study OS | MPSC 2027';
    }

    return () => {
      document.title = 'MahaPrep Study OS | MPSC 2027';
    };
  }, [isOpen, isRunning, secondsLeft, task]);

  // Ambient sound handler
  const handleToggleAmbient = (type) => {
    if (ambientSound === type) {
      setAmbientSound('off');
      playSound.stopNoise();
    } else {
      setAmbientSound(type);
      playSound.startNoise(type, soundVolume);
    }
  };

  const handleVolumeChange = (newVol) => {
    setSoundVolume(newVol);
    playSound.setNoiseVolume(newVol);
  };

  // Cleanup on modal close
  useEffect(() => {
    if (!isOpen) {
      setIsRunning(false);
      playSound.stopNoise();
      document.title = 'MahaPrep Study OS | MPSC 2027';
    } else {
      // If ambient sound was active, start it
      if (ambientSound !== 'off') {
        playSound.startNoise(ambientSound, soundVolume);
      }
    }
  }, [isOpen]);

  // Handle Session Completion
  const handleTimerComplete = () => {
    setIsRunning(false);
    playSound.playSuccess();
    playSound.stopNoise();

    const minutesStudied = Math.max(1, Math.round(elapsedTotal / 60));
    const bonusXp = 25; // 25 XP for completing deep work session

    // Add session to XP
    const currentXp = parseFloat(localStorage.getItem('xp_total')) || 0;
    const newXp = (currentXp + bonusXp).toFixed(2);
    localStorage.setItem('xp_total', newXp);

    if (task) {
      const subKey = task.id?.startsWith('gk_') ? task.id.replace('gk_', '') : (task.id || 'General');
      const currentSubXp = parseFloat(localStorage.getItem(`xp_${subKey}`)) || 0;
      localStorage.setItem(`xp_${subKey}`, (currentSubXp + bonusXp).toFixed(2));
      
      // Auto complete the task on dashboard!
      if (onCompleteTask) {
        onCompleteTask(task.id, false);
      }
    }

    // Save study session record
    const sessions = JSON.parse(localStorage.getItem('study_sessions_log') || '[]');
    sessions.unshift({
      id: `session_${Date.now()}`,
      taskTitle: task?.title || 'General Deep Study',
      durationMinutes: minutesStudied,
      xpEarned: bonusXp,
      timestamp: new Date().toISOString()
    });
    localStorage.setItem('study_sessions_log', JSON.stringify(sessions.slice(0, 50)));

    toast.success(`🎯 उत्कृष्ट! ${minutesStudied} मिनिटांचे फोकस सत्र यशस्वी झाले! +${bonusXp} XP मिळाले! 🚀`, {
      duration: 6000,
      icon: '🏆',
      style: { borderRadius: '16px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid rgba(34, 197, 94, 0.4)' }
    });

    // Check if user wants break
    if (selectedPreset !== 'stopwatch' && !isBreak) {
      const preset = PRESETS.find(p => p.id === selectedPreset);
      const breakSecs = (preset?.breakMins || 5) * 60;
      setIsBreak(true);
      setSecondsLeft(breakSecs);
      setInitialSeconds(breakSecs);
      toast('☕ आता ५ मिनिटांचा ब्रेक घ्या आणि ताजेतवाने व्हा!', { icon: '☕' });
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    applyPreset(selectedPreset);
  };

  if (!isOpen) return null;

  // Format Time Display (MM:SS)
  const displayMins = Math.floor(secondsLeft / 60);
  const displaySecs = secondsLeft % 60;
  const formattedTime = `${displayMins.toString().padStart(2, '0')}:${displaySecs.toString().padStart(2, '0')}`;

  // Progress percentage
  let progress = 0;
  if (selectedPreset !== 'stopwatch' && initialSeconds > 0) {
    progress = Math.min(100, Math.round(((initialSeconds - secondsLeft) / initialSeconds) * 100));
  } else {
    progress = Math.min(100, (secondsLeft / 3600) * 100);
  }

  // SVG circular arc calculation
  const radius = 112;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  // Calculate current angle for glowing knob/dot on circle (in radians, starting from -90 deg / top)
  const angleDeg = (progress / 100) * 360 - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  const knobX = 135 + radius * Math.cos(angleRad);
  const knobY = 135 + radius * Math.sin(angleRad);

  const activePreset = PRESETS.find(p => p.id === selectedPreset) || PRESETS[1];
  const activeTaskTitle = task?.title ? task.title.replace(' (GKGS)', '') : 'Current Affairs';
  const activeTaskDuration = task?.duration || '30 min';

  return (
    <div 
      className="focus-timer-overlay" 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(3, 7, 18, 0.88)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isFullscreen ? '0' : '16px',
        animation: 'fadeIn 0.25s ease-out',
        overflowY: 'auto'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Outer Card with Mountain Sunset Landscape Background */}
      <div 
        ref={modalRef}
        style={{
          width: '100%',
          maxWidth: isFullscreen ? '100vw' : '480px',
          height: isFullscreen ? '100vh' : 'auto',
          maxHeight: isFullscreen ? '100vh' : '96vh',
          borderRadius: isFullscreen ? '0' : '32px',
          padding: isFullscreen ? '32px 24px' : '22px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          overflowY: 'auto',
          overflowX: 'hidden',
          background: 'linear-gradient(180deg, #090e18 0%, #0d1527 50%, #080c14 100%)',
          border: isFullscreen ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.9), 0 0 40px rgba(249, 115, 22, 0.15)'
        }}
      >
        
        {/* Layer 1: Mountain Sunset & Pine Trees Vector Background */}
        <div 
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 0,
            overflow: 'hidden',
            borderRadius: isFullscreen ? '0' : '32px'
          }}
        >
          {/* Warm Sunset Glow on Right Horizon */}
          <div 
            style={{
              position: 'absolute',
              top: '32%',
              right: '-10%',
              width: '380px',
              height: '380px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(254, 215, 170, 0.45) 0%, rgba(249, 115, 22, 0.35) 25%, rgba(234, 88, 12, 0.15) 50%, transparent 70%)',
              filter: 'blur(30px)'
            }}
          />

          {/* Setting Sun Orb */}
          <div 
            style={{
              position: 'absolute',
              top: '44%',
              right: '18%',
              width: '46px',
              height: '46px',
              borderRadius: '50%',
              background: '#fef3c7',
              boxShadow: '0 0 35px #f59e0b, 0 0 60px rgba(249, 115, 22, 0.8)',
              opacity: 0.9
            }}
          />

          {/* SVG Mountain Silhouettes & Pine Trees */}
          <svg 
            viewBox="0 0 500 700" 
            preserveAspectRatio="none" 
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              width: '100%',
              height: '65%',
              opacity: 0.45
            }}
          >
            {/* Birds in flight */}
            <path d="M380,240 Q388,234 396,240 Q404,234 412,240 Q404,237 396,242 Q388,237 380,240 Z" fill="#2d3748" opacity="0.7" />
            <path d="M410,260 Q416,255 422,260 Q428,255 434,260 Q428,257 422,261 Q416,257 410,260 Z" fill="#2d3748" opacity="0.6" />
            <path d="M360,270 Q365,266 370,270 Q375,266 380,270 Q375,268 370,271 Q365,268 360,270 Z" fill="#2d3748" opacity="0.5" />

            {/* Distant Mountain Ridge */}
            <path d="M0,380 L120,310 L220,350 L340,280 L440,340 L500,310 L500,700 L0,700 Z" fill="#131c2e" />

            {/* Midground Mountain Ridge */}
            <path d="M0,440 L80,390 L180,430 L290,360 L400,420 L500,370 L500,700 L0,700 Z" fill="#0d1424" />

            {/* Foreground Hills with Pine Trees Silhouette */}
            <path d="M0,520 Q120,490 250,540 T500,510 L500,700 L0,700 Z" fill="#070b14" />

            {/* Pine Tree Silhouettes along the left and right slopes */}
            <g fill="#05080f">
              {/* Left trees */}
              <polygon points="20,530 15,550 25,550" />
              <polygon points="20,515 12,540 28,540" />
              <polygon points="40,540 34,565 46,565" />
              <polygon points="40,520 30,550 50,550" />
              <polygon points="65,550 58,575 72,575" />
              <polygon points="65,535 55,560 75,560" />
              <polygon points="90,565 82,590 98,590" />
              {/* Right trees */}
              <polygon points="430,530 422,560 438,560" />
              <polygon points="430,510 418,545 442,545" />
              <polygon points="460,540 452,570 468,570" />
              <polygon points="460,525 448,555 472,555" />
            </g>
          </svg>
        </div>

        {/* Layer 2: Interactive UI Controls */}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          
          {/* Top Brand Header Row */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            {/* Logo and Tagline */}
            <div className="flex-row gap-3 align-center">
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.25) 0%, rgba(234, 88, 12, 0.1) 100%)',
                border: '1px solid rgba(249, 115, 22, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem'
              }}>
                🎓
              </div>
              <div className="flex-col">
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#ffffff', letterSpacing: '0.3px', display: 'flex', gap: '5px' }}>
                  <span style={{ color: '#f97316' }}>MahaPrep</span>
                  <span>Study OS</span>
                </div>
                <span style={{ fontSize: '0.72rem', color: '#94a3b8', fontWeight: 500 }}>
                  स्पर्धा परीक्षा तयारीसाठी तुमचा साथी
                </span>
              </div>
            </div>

            {/* Right Action Icons: VIP Crown & Close/Settings */}
            <div className="flex-row gap-2 align-center">
              <button 
                className="btn"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  fontSize: '1.05rem',
                  cursor: 'pointer'
                }}
                title="Pro Status"
              >
                👑
              </button>

              <button 
                onClick={onClose}
                className="btn"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.06)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  cursor: 'pointer'
                }}
                title="बंद करा (Close)"
              >
                <FiSettings size={18} />
              </button>
            </div>
          </div>

          {/* Current Active Task Card */}
          <div 
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '12px 14px 16px',
              borderRadius: '24px',
              background: 'rgba(20, 26, 40, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              marginBottom: '16px',
              position: 'relative'
            }}
          >
            {/* Task Subtitle & Name */}
            <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              चालू अभ्यास घटक
            </span>
            <h2 style={{
              fontSize: '1.45rem',
              fontWeight: 800,
              color: '#ffffff',
              margin: '4px 0 10px',
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <span>📰</span> {activeTaskTitle}
            </h2>

            {/* Task Selector Dropdown Pill */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '340px', marginBottom: '12px' }}>
              {isTaskDropdownOpen && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsTaskDropdownOpen(false);
                  }}
                  style={{ position: 'fixed', inset: 0, zIndex: 15 }}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setIsTaskDropdownOpen(!isTaskDropdownOpen);
                  setIsModeDropdownOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '8px 16px',
                  borderRadius: '20px',
                  background: 'rgba(255, 255, 255, 0.07)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#e2e8f0',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  <span>📰</span> {activeTaskTitle} ({activeTaskDuration})
                </span>
                <FiChevronDown size={16} color="#94a3b8" />
              </button>

              {/* Task Options List */}
              {isTaskDropdownOpen && dailyTasks.length > 0 && (
                <div style={{
                  position: 'absolute',
                  top: '110%',
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  borderRadius: '16px',
                  background: '#0d1527',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.7)',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  padding: '6px'
                }}>
                  {dailyTasks.map(t => (
                    <div 
                      key={t.id}
                      onClick={() => {
                        if (onSelectTask) onSelectTask(t);
                        setIsTaskDropdownOpen(false);
                      }}
                      style={{
                        padding: '8px 12px',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        color: t.id === task?.id ? '#f97316' : '#cbd5e1',
                        background: t.id === task?.id ? 'rgba(249, 115, 22, 0.12)' : 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span>{t.title}</span>
                      <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{t.duration}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ⏱️ Focus Mode Selector Dropdown */}
            <div style={{ position: 'relative', width: '100%', maxWidth: '340px', zIndex: 30 }}>
              {isModeDropdownOpen && (
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsModeDropdownOpen(false);
                  }}
                  style={{ position: 'fixed', inset: 0, zIndex: 40 }}
                />
              )}

              {/* Main Dropdown Button */}
              <button
                type="button"
                onClick={() => {
                  setIsModeDropdownOpen(!isModeDropdownOpen);
                  setIsTaskDropdownOpen(false);
                }}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '18px',
                  background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(15, 23, 42, 0.85) 100%)',
                  border: '1.5px solid #f97316',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(249, 115, 22, 0.25)',
                  transition: 'all 0.2s ease'
                }}
                title="फोकस मोड बदला (Change Focus Mode)"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '1.3rem' }}>{activePreset.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontWeight: 800, fontSize: '0.92rem', color: '#f97316', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{activePreset.name}</span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                      {activePreset.id === 'pomodoro' ? '२५ मि. अभ्यास + ५ मि. ब्रेक' :
                       activePreset.id === 'deepwork' ? '५० मि. सखोल अभ्यास + १० मि. ब्रेक' :
                       activePreset.id === 'powerhour' ? '६० मि. हाय-इंटेन्सिटी सराव' :
                       'अमर्याद वेळेसाठी स्टॉपवॉच'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    color: '#f97316',
                    background: 'rgba(249, 115, 22, 0.2)',
                    padding: '2px 8px',
                    borderRadius: '8px',
                    textTransform: 'uppercase'
                  }}>
                    मोड
                  </span>
                  <FiChevronDown 
                    size={18} 
                    color="#f97316"
                    style={{ 
                      transform: isModeDropdownOpen ? 'rotate(180deg)' : 'none', 
                      transition: 'transform 0.2s ease' 
                    }} 
                  />
                </div>
              </button>

              {/* Mode Dropdown Menu */}
              {isModeDropdownOpen && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 6px)',
                    left: 0,
                    right: 0,
                    borderRadius: '20px',
                    background: 'linear-gradient(145deg, #0b1120 0%, #17233d 100%)',
                    border: '1.5px solid rgba(249, 115, 22, 0.6)',
                    boxShadow: '0 20px 45px rgba(0, 0, 0, 0.95), 0 0 30px rgba(249, 115, 22, 0.35)',
                    padding: '8px',
                    zIndex: 100,
                    animation: 'fadeIn 0.15s ease-out'
                  }}
                >
                  <div style={{ padding: '6px 12px 6px', fontSize: '0.7rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', marginBottom: '6px' }}>
                    🎯 खालीलपैकी मोड निवडा:
                  </div>
                  {PRESETS.map(p => {
                    const isSelected = selectedPreset === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          applyPreset(p.id);
                          setIsModeDropdownOpen(false);
                          toast.success(`🎯 ${p.name} निवडला!`, { icon: p.icon, duration: 2500 });
                        }}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '14px',
                          background: isSelected ? 'linear-gradient(135deg, rgba(249, 115, 22, 0.3) 0%, rgba(234, 88, 12, 0.15) 100%)' : 'transparent',
                          border: isSelected ? '1px solid rgba(249, 115, 22, 0.5)' : '1px solid transparent',
                          color: isSelected ? '#ffffff' : '#cbd5e1',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '4px',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '1.35rem' }}>{p.icon}</span>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontWeight: 800, fontSize: '0.9rem', color: isSelected ? '#f97316' : '#ffffff' }}>
                              {p.name}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                              {p.id === 'pomodoro' ? '२५ मि. अभ्यास + ५ मि. ब्रेक' :
                               p.id === 'deepwork' ? '५० मि. सखोल अभ्यास + १० मि. ब्रेक' :
                               p.id === 'powerhour' ? '६० मि. हाय-इंटेन्सिटी सराव' :
                               'अमर्याद वेळेसाठी स्टॉपवॉच'}
                            </div>
                          </div>
                        </div>
                        {isSelected && <FiCheck size={18} color="#f97316" />}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Circular Progress Gauge */}
            <div style={{
              position: 'relative',
              width: '270px',
              height: '270px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '14px 0 10px'
            }}>
              <svg width="270" height="270" style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%' }}>
                {/* Background Track Ring */}
                <circle 
                  cx="135" 
                  cy="135" 
                  r={radius} 
                  stroke="rgba(255, 255, 255, 0.08)" 
                  strokeWidth="14" 
                  fill="transparent" 
                />
                
                {/* Active Progress Arc with Neon Glow */}
                <circle 
                  cx="135" 
                  cy="135" 
                  r={radius} 
                  stroke="url(#timerOrangeGrad)" 
                  strokeWidth="14" 
                  fill="transparent" 
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{ 
                    transition: 'stroke-dashoffset 0.8s ease',
                    filter: 'drop-shadow(0 0 8px rgba(249, 115, 22, 0.7))'
                  }}
                />

                {/* Gradient Definition for Stroke */}
                <defs>
                  <linearGradient id="timerOrangeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#f97316" />
                    <stop offset="100%" stopColor="#fb923c" />
                  </linearGradient>
                </defs>

                {/* Glowing Knob / Dot indicator at the leading edge of the arc */}
                {progress > 0 && progress < 100 && (
                  <circle 
                    cx={knobX} 
                    cy={knobY} 
                    r="8" 
                    fill="#ffffff"
                    stroke="#f97316"
                    strokeWidth="3"
                    style={{ filter: 'drop-shadow(0 0 6px #f97316)' }}
                  />
                )}
              </svg>

              {/* Center Digital Display */}
              <div style={{
                position: 'absolute',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '6px'
              }}>
                {/* Open Book Icon */}
                <div style={{ color: '#94a3b8', fontSize: '1.4rem', opacity: 0.8 }}>
                  📖
                </div>

                {/* Digital Time: 50:00 */}
                <span style={{ 
                  fontSize: '3.6rem', 
                  fontWeight: 900, 
                  letterSpacing: '1px', 
                  color: '#ffffff',
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  lineHeight: 1,
                  textShadow: '0 0 25px rgba(249, 115, 22, 0.3)'
                }}>
                  {formattedTime}
                </span>

                {/* Status Pill Badge */}
                <div style={{
                  padding: '4px 14px',
                  borderRadius: '20px',
                  background: 'rgba(59, 130, 246, 0.15)',
                  border: '1px solid rgba(59, 130, 246, 0.35)',
                  color: '#60a5fa',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  {isRunning ? (
                    <><span>▶️</span> {isBreak ? 'ब्रेक सुरू आहे' : 'सुरू आहे'}</>
                  ) : (
                    <><span>⏸️</span> थांबवले आहे</>
                  )}
                </div>

                {/* Progress % */}
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>
                  {progress}% पूर्ण
                </span>
              </div>
            </div>

            {/* 3 Bottom Control Buttons: Reset | Play/Pause | Fullscreen */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '32px',
              width: '100%',
              marginTop: '4px'
            }}>
              {/* Reset Button */}
              <div className="flex-col align-center" style={{ gap: '6px', cursor: 'pointer' }} onClick={handleReset}>
                <div 
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.07)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#e2e8f0',
                    transition: 'all 0.2s'
                  }}
                >
                  <FiRotateCcw size={20} />
                </div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                  रीसेट
                </span>
              </div>

              {/* Main Play / Pause Hero Button */}
              <div 
                className="flex-col align-center" 
                style={{ gap: '6px', cursor: 'pointer' }} 
                onClick={() => setIsRunning(!isRunning)}
              >
                <div 
                  style={{
                    width: '74px',
                    height: '74px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
                    boxShadow: '0 10px 30px rgba(249, 115, 22, 0.6), 0 0 20px rgba(249, 115, 22, 0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    transition: 'transform 0.15s ease'
                  }}
                >
                  {isRunning ? <FiPause size={28} /> : <FiPlay size={28} style={{ marginLeft: '4px' }} />}
                </div>
                <span style={{ fontSize: '0.85rem', color: '#f8fafc', fontWeight: 800 }}>
                  {isRunning ? 'थांबवा' : 'सुरु करा'}
                </span>
              </div>

              {/* Fullscreen Button */}
              <div 
                className="flex-col align-center" 
                style={{ gap: '6px', cursor: 'pointer' }} 
                onClick={() => setIsFullscreen(!isFullscreen)}
              >
                <div 
                  style={{
                    width: '54px',
                    height: '54px',
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.07)',
                    border: '1px solid rgba(255, 255, 255, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#e2e8f0',
                    transition: 'all 0.2s'
                  }}
                >
                  {isFullscreen ? <FiMinimize2 size={20} /> : <FiMaximize2 size={20} />}
                </div>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: 600 }}>
                  पूर्ण स्क्रीन
                </span>
              </div>
            </div>

          </div>

          {/* Bottom Card: पार्श्वभूमी आवाज (Ambient Sounds & Volume Slider) */}
          <div 
            style={{
              width: '100%',
              borderRadius: '24px',
              background: 'rgba(20, 26, 40, 0.65)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              backdropFilter: 'blur(12px)',
              padding: '16px 20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px'
            }}
          >
            {/* Ambient Sound Title */}
            <div className="flex-row gap-2 align-center">
              <span style={{ color: '#f97316', fontSize: '1.1rem' }}>🔊</span>
              <span style={{ fontSize: '0.88rem', fontWeight: 800, color: '#f8fafc' }}>
                पार्श्वभूमी आवाज:
              </span>
            </div>

            {/* 2 Sound Toggle Pills */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Rain Sound Button */}
              <button
                type="button"
                onClick={() => handleToggleAmbient('rain')}
                style={{
                  padding: '12px 16px',
                  borderRadius: '18px',
                  border: ambientSound === 'rain' ? '1.5px solid #f97316' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: ambientSound === 'rain' ? 'rgba(249, 115, 22, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                  boxShadow: ambientSound === 'rain' ? '0 0 16px rgba(249, 115, 22, 0.3)' : 'none',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🌧️</span> पाऊस
                </span>
                {ambientSound === 'rain' && (
                  <span style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#f97316',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem'
                  }}>
                    ✓
                  </span>
                )}
              </button>

              {/* White Noise Sound Button */}
              <button
                type="button"
                onClick={() => handleToggleAmbient('whitenoise')}
                style={{
                  padding: '12px 16px',
                  borderRadius: '18px',
                  border: ambientSound === 'whitenoise' ? '1.5px solid #f97316' : '1px solid rgba(255, 255, 255, 0.1)',
                  background: ambientSound === 'whitenoise' ? 'rgba(249, 115, 22, 0.16)' : 'rgba(255, 255, 255, 0.05)',
                  boxShadow: ambientSound === 'whitenoise' ? '0 0 16px rgba(249, 115, 22, 0.3)' : 'none',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>🌊</span> व्हाईट नॉईज
                </span>
                {ambientSound === 'whitenoise' && (
                  <span style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: '#f97316',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem'
                  }}>
                    ✓
                  </span>
                )}
              </button>
            </div>

            {/* Volume Range Slider */}
            <div className="flex-row gap-3 align-center" style={{ width: '100%', marginTop: '4px' }}>
              <FiVolume1 size={18} color="#94a3b8" />
              
              <div style={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
                <input 
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={soundVolume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  style={{
                    width: '100%',
                    height: '6px',
                    borderRadius: '4px',
                    appearance: 'none',
                    WebkitAppearance: 'none',
                    outline: 'none',
                    cursor: 'pointer',
                    background: `linear-gradient(to right, #f97316 0%, #f97316 ${soundVolume * 100}%, #1e293b ${soundVolume * 100}%, #1e293b 100%)`
                  }}
                />
              </div>

              <FiVolume2 size={18} color="#94a3b8" />
            </div>

          </div>

          {/* Manual Complete Session Button (Claim +25 XP) */}
          <div style={{ marginTop: '16px', width: '100%', display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={handleTimerComplete}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#22c55e',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                opacity: 0.9
              }}
            >
              <FiCheck size={16} /> अभ्यास पूर्ण झाला? सत्र संपवून +२५ XP मिळवा
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default FocusTimerModal;
