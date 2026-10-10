import React, { useState, useEffect, useRef } from 'react';
import { FiClock, FiCheckCircle, FiPlay, FiAlertTriangle, FiBell, FiMoon, FiSun, FiCheck, FiRotateCcw, FiDownload, FiPlus } from 'react-icons/fi';
import { requestNotificationPermission, sendPushNotification } from '../utils/notify';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ConfirmModal from '../components/ConfirmModal';

const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (end === 0) {
      setDisplay(0);
      return;
    }
    const step = end / 60; 
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
};

const Dashboard = ({ user, deferredPrompt, setDeferredPrompt }) => {
  const navigate = useNavigate();
  const [showAllTasks, setShowAllTasks] = useState(false);
  const [isEditingTasks, setIsEditingTasks] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState('30 min');
  const currentReasoningSet = parseInt(localStorage.getItem('reasoningSetNumber')) || 1;
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const handleSort = () => {
    let _tasks = [...dailyTasks];
    const draggedItemContent = _tasks.splice(dragItem.current, 1)[0];
    _tasks.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setDailyTasks(_tasks);
    import('../utils/dbStore').then(({ saveToDB }) => saveToDB('user_daily_tasks', _tasks));
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        if (setDeferredPrompt) setDeferredPrompt(null);
      });
    } else {
      toast("To install, tap 'Share' or 'Menu' then 'Add to Home Screen' in your browser! 📱", {
         icon: '📲',
         style: { borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }
      });
    }
  };

  const topicsMap = {
    reasoning: ["Number Series", "Alphabet Series", "Coding-Decoding", "Analogy", "Blood Relations", "Direction Test"],
    maths: ["Number System", "BODMAS & Fractions", "LCM & HCF", "Percentage", "Profit & Loss", "Simple Interest"],
    gk_geo: ["earth & latitudes", "mountains & plateaus", "rivers & oceans", "atmosphere & weather", "monsoon & climate", "soils & natural vegetation"],
    gk_his: ["indus valley civilization", "vedic period", "maurya & gupta empires", "delhi sultanate", "mughal empire", "maratha empire"],
    gk_sci: ["measurements & motion", "force & work", "energy & heat", "light & sound", "electricity & magnetism", "atoms & molecules"],
    gk_eco: ["gdp & national income", "inflation & unemployment", "poverty & basic concepts", "rbi & banking", "monetary policy", "public finance (tax)"],
    gk_pol: ["historical background", "making of the constitution", "preamble", "fundamental rights", "directive principles", "fundamental duties"],
    gk_ca:  ["jan 2025: maharashtra", "jan 2025: india", "jan 2025: world", "jan 2025: economy", "jan 2025: science", "jan 2025: sports"]
  };

  const getTopicIndexes = () => {
    return JSON.parse(localStorage.getItem('task_indexes') || '{}');
  };

  const getLogicalDateString = () => {
    const d = new Date();
    d.setHours(d.getHours() - 6); // Shift day boundary to 6:00 AM
    return d.toLocaleDateString('en-GB');
  };

  const getTopicForTask = (taskId, indexOverride) => {
    const arr = topicsMap[taskId];
    if (!arr) return "";
    const indexes = getTopicIndexes();
    const idx = indexOverride !== undefined ? indexOverride : (indexes[taskId] || 0);
    return arr[idx % arr.length];
  };

  const getTitleForTask = (taskId, indexOverride) => {
    const indexes = getTopicIndexes();
    const idx = indexOverride !== undefined ? indexOverride : (indexes[taskId] || 0);
    const titles = {
      'reasoning': `🧠 Reasoning Practice (Set ${idx + 1})`,
      'maths': '📐 Maths Practice',
      'gk_geo': '🌍 Geography',
      'gk_his': '📜 History',
      'gk_sci': '🔬 Science',
      'gk_eco': '💰 Economics',
      'gk_pol': '🏛️ Polity',
      'gk_ca': '📰 Current Affairs'
    };
    return titles[taskId];
  };

  const initialDailyTasks = [
    { id: 'reasoning', title: getTitleForTask('reasoning'), duration: '1 hr', completed: false },
    { id: 'maths', title: getTitleForTask('maths'), duration: '2 hr', completed: false },
    { id: 'gk_geo', title: getTitleForTask('gk_geo'), duration: '30 min', completed: false },
    { id: 'gk_his', title: getTitleForTask('gk_his'), duration: '30 min', completed: false },
    { id: 'gk_sci', title: getTitleForTask('gk_sci'), duration: '30 min', completed: false },
    { id: 'gk_eco', title: getTitleForTask('gk_eco'), duration: '30 min', completed: false },
    { id: 'gk_pol', title: getTitleForTask('gk_pol'), duration: '30 min', completed: false },
    { id: 'gk_ca', title: getTitleForTask('gk_ca'), duration: '30 min', completed: false }
  ];

  const [dailyTasks, setDailyTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('user_daily_tasks');
      if (saved && saved !== 'undefined' && saved !== 'null') {
         const parsed = JSON.parse(saved);
         if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch(e) { }
    return initialDailyTasks;
  });
  const [showTaskVideo, setShowTaskVideo] = useState(false);

  const toggleTask = (taskId, isUndo = false) => {
    const updated = dailyTasks.map(t => {
      if (t.id === taskId) {
        return { ...t, completed: !isUndo };
      }
      return t;
    });
    setDailyTasks(updated);
    import('../utils/dbStore').then(({ saveToDB }) => saveToDB('user_daily_tasks', updated));
    
    if (!isUndo) {
      import('../utils/sound').then(({ playSound }) => playSound.playSuccess());
      toast.success('Task marked as completed! 🎉');

      // 100% Completion Celebration!
      if (updated.length > 0 && updated.every(t => t.completed)) {
        setShowTaskVideo(true);
      }
    }
  };

  const handleDeleteTask = (taskId) => {
    setTaskToDelete(taskId);
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;
    const updated = dailyTasks.filter(t => t.id !== taskToDelete);
    setDailyTasks(updated);
    import('../utils/dbStore').then(({ saveToDB }) => saveToDB('user_daily_tasks', updated));
    toast.success('Task removed from list!', { style: { borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }});
    setTaskToDelete(null);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return toast.error("Please enter a task title!");
    const newTask = {
      id: `custom_${Date.now()}`,
      title: newTaskTitle,
      duration: newTaskDuration,
      completed: false
    };
    const updated = [...dailyTasks, newTask];
    setDailyTasks(updated);
    import('../utils/dbStore').then(({ saveToDB }) => saveToDB('user_daily_tasks', updated));
    toast.success('Custom task added!');
    setIsAddingTask(false);
    setNewTaskTitle('');
    setNewTaskDuration('30 min');
  };

  const advanceToNextDay = async () => {
    let savedTasks = [];
    try {
       savedTasks = JSON.parse(localStorage.getItem('user_daily_tasks') || '[]');
    } catch(e) {}
    
    // If empty or corrupted, fallback to initial tasks!
    if (!Array.isArray(savedTasks) || savedTasks.length === 0) {
       savedTasks = initialDailyTasks;
    }
    const oldIndexes = getTopicIndexes();
    let newIndexes = { ...oldIndexes };
    
    // Add completed tasks to weekly tally
    const completedCount = savedTasks.filter(t => t.completed).length;
    let pastWeekly = parseInt(localStorage.getItem('weekly_completed')) || 0;
    if (new Date().getDay() === 1) pastWeekly = 0; // Reset on Monday
    pastWeekly += completedCount;
    localStorage.setItem('weekly_completed', pastWeekly);

    // Add completed tasks to Revision Queue
    const existingQueue = JSON.parse(localStorage.getItem('revision_queue') || '[]');
    const nowTime = new Date().getTime();

    // Create next set of tasks
    const resetTasks = savedTasks.map(t => {
      // Only increment index if the task was completed!
      if (t.completed) {
        newIndexes[t.id] = (newIndexes[t.id] || 0) + 1;
        existingQueue.push({
           topicId: t.id,
           title: t.title,
           dueAt: nowTime + (7 * 24 * 60 * 60 * 1000) // due in 7 days
        });
      }
      return {
        id: t.id,
        title: getTitleForTask(t.id, newIndexes[t.id] || 0) || t.title,
        duration: t.duration,
        completed: false
      };
    });
    const now = new Date();
    
    import('../utils/dbStore').then(({ saveMultipleToDB }) => {
      saveMultipleToDB({
         weekly_completed: pastWeekly,
         revision_queue: existingQueue,
         task_indexes: newIndexes,
         user_daily_tasks: resetTasks,
         last_task_date: getLogicalDateString(),
         last_task_time: now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()
      });
    });
    
    setDailyTasks(resetTasks);
    toast.success("Advanced to the next study session! 🚀");
    
    // Generate daily 6 AM Mega Test automatically (Max once a day per user)
    const megaDate = localStorage.getItem('last_mega_test_date');
    if (megaDate !== getLogicalDateString()) {
      try {
        await axios.post('https://mpsc-manager.onrender.com/api/custom-tests/mega-generate');
        localStorage.setItem('last_mega_test_date', getLogicalDateString());
      } catch(err) {
        console.error("Mega Test error:", err);
      }
    }
  };

  useEffect(() => {
    const now = new Date();
    const logicalToday = getLogicalDateString();
    const lastDate = localStorage.getItem('last_task_date');
    if (lastDate !== logicalToday && lastDate) {
      advanceToNextDay();
    } else if (!lastDate) {
      localStorage.setItem('last_task_date', logicalToday);
      localStorage.setItem('last_task_time', now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase());
    }
    
    requestNotificationPermission();

    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeString = `${currentHours}:${currentMinutes}`;
      
      // Mock daily task check
      if (currentTimeString === "19:00") {
        sendPushNotification("Task Alert 🚨", "It's time for Current Affairs!");
      }
      if (currentTimeString === "10:00") {
        sendPushNotification("Study Time 📖", "History - Modern India session begins!");
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = () => {
    toast("You're all caught up! No active alerts.", {
      icon: '🔔',
      style: { borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }
    });
  };

  const completedTasks = dailyTasks.filter(t => t.completed);
  
  let completedMinutes = 0;
  completedTasks.forEach(t => {
    if (t.duration.includes('hr')) {
      completedMinutes += parseInt(t.duration) * 60;
    } else if (t.duration.includes('min')) {
      completedMinutes += parseInt(t.duration);
    }
  });

  const displayHours = Math.floor(completedMinutes / 60);
  const displayMins = completedMinutes % 60;
  
  const progressPercent = dailyTasks.length > 0 ? Math.round((completedTasks.length / dailyTasks.length) * 100) : 0;
  
  const pastWeeklyTasks = parseInt(localStorage.getItem('weekly_completed')) || 0;
  const currentWeeklyTotal = pastWeeklyTasks + completedTasks.length;
  const weeklySyllabusPercent = Math.min(100, Math.round((currentWeeklyTotal / 56) * 100)); // 8 tasks * 7 days = 56

  const [dueRevisionCount, setDueRevisionCount] = useState(0);

  useEffect(() => {
    const existingQueue = JSON.parse(localStorage.getItem('revision_queue') || '[]');
    const nowTime = new Date().getTime();
    const dues = existingQueue.filter(item => item.dueAt <= nowTime);
    setDueRevisionCount(dues.length);
  }, [dailyTasks]);

  const practiceAccuracy = parseFloat(localStorage.getItem('practice_accuracy')) || (currentWeeklyTotal > 0 ? 85 : 0);

  const calculateDaysLeft = () => {
    const target = new Date('2027-04-04T00:00:00');
    const diff = target - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px', animation: 'fadeIn 0.6s ease-out' }}>
      
      {showTaskVideo && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 99999, background: '#000' }}>
           <video 
             src="/video/task-complete.mp4" 
             autoPlay 
             muted 
             playsInline
             onEnded={() => setShowTaskVideo(false)} 
             style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
           />
           <button onClick={() => setShowTaskVideo(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', zIndex: 100000, fontSize: '0.875rem' }}>Skip</button>
        </div>
      )}

      {/* Header Section */}
      <div className="dashboard-header flex-row justify-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div className="flex-col gap-2">
          <div className="flex-row align-center justify-between" style={{ width: '100%' }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '2px' }}>
              MPSC 2027 • DYNAMIC PREP
            </span>
            <button onClick={handleInstallClick} className="btn mobile-only-btn" style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent-primary)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} title="Install App">
              <FiDownload size={16} color="var(--accent-primary)" />
            </button>
          </div>
          <div className="flex-row gap-2 align-center">
            <h1 className="heading-gradient" style={{ fontSize: '2.5rem', margin: 0 }}>
              Good Morning, <span style={{ color: 'var(--accent-primary)', WebkitTextFillColor: 'var(--accent-primary)', textShadow: '0 0 20px var(--accent-glow)' }}>{user?.displayName ? user.displayName.split(' ')[0] : 'Student'}</span>
            </h1>
            <span style={{ fontSize: '2rem' }}>👋</span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome to your personalized Study OS</p>
        </div>
        
        <div className="dashboard-header-actions flex-row gap-4" style={{ height: 'fit-content', flexWrap: 'wrap' }}>
          {/* Days Left Card */}
          <div className="glass-card flex-col justify-center align-center" style={{ padding: '16px', animation: 'slideUp 0.8s ease-out', flex: 1, minWidth: '140px', gap: '8px', textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', margin: '0 auto' }}>⏳</div>
            <div className="flex-col" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}><AnimatedNumber value={calculateDaysLeft()} /> <span style={{fontSize:'1rem'}}>Days</span></span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>MPSC 2027</span>
            </div>
          </div>
          
          <div className="glass-card flex-col justify-center align-center" style={{ padding: '16px', animation: 'slideUp 0.9s ease-out', flex: 1, minWidth: '140px', gap: '8px', textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--accent-primary)', borderLeftColor: 'rgba(255,255,255,0.1)', transform: 'rotate(45deg)', margin: '0 auto' }}></div>
            <div className="flex-col" style={{ alignItems: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-secondary)' }}><AnimatedNumber value={parseFloat(localStorage.getItem('xp_total')) || 0} /></span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <div className="glass-card stat-card">
          <span className="stat-label">Tasks</span>
          <span className="stat-value"><AnimatedNumber value={dailyTasks.length} /></span>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total assigned today</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value"><AnimatedNumber value={dailyTasks.filter(t=>t.completed).length} /></span>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${dailyTasks.length > 0 ? (dailyTasks.filter(t=>t.completed).length / dailyTasks.length)*100 : 0}%` }}></div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Study Time</span>
          <span className="stat-value"><AnimatedNumber value={displayHours} />h <AnimatedNumber value={displayMins} />m</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--success)' }}>Active Learning</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Syllabus</span>
          <span className="stat-value"><AnimatedNumber value={progressPercent} />%</span>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column */}
        <div className="flex-col gap-6">
          
          {/* Today's Tasks */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div className="flex-row justify-between" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '8px' }}>
              <div className="flex-col gap-1">
                <h2 style={{ fontSize: '1.25rem', margin: 0 }}>📋 Today's Tasks</h2>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  new tasks fetched: {localStorage.getItem('last_task_date') || new Date().toLocaleDateString('en-GB')} at {localStorage.getItem('last_task_time') || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
                </span>
              </div>
              <div className="flex-row gap-2">
                <button onClick={() => setIsEditingTasks(!isEditingTasks)} className="btn" style={{ padding: '8px', background: isEditingTasks ? 'var(--warning)' : 'rgba(255,255,255,0.05)', color: isEditingTasks ? '#000' : 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={isEditingTasks ? "Done Editing" : "Edit Tasks"}>
                  {isEditingTasks ? <FiCheck size={16} /> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>}
                </button>
                {!isEditingTasks && <button onClick={advanceToNextDay} className="btn" style={{ padding: '6px 12px', background: 'var(--accent-glow)', color: 'var(--accent-primary)', border: '1px solid var(--accent-glow)', outline: 'none', fontSize: '0.75rem' }}>Wrap Up Day 🚀</button>}
                <button onClick={() => setShowAllTasks(!showAllTasks)} className="btn" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none' }}>{showAllTasks ? 'View Less' : 'View All'}</button>
              </div>
            </div>
            
            <div className="flex-col gap-4">
              {(showAllTasks ? dailyTasks : dailyTasks.slice(0, 3)).map((task, idx) => (
                <div 
                  key={task.id} 
                  className="task-item" 
                  draggable={isEditingTasks}
                  onDragStart={(e) => { if(isEditingTasks) dragItem.current = idx; }}
                  onDragEnter={(e) => { if(isEditingTasks) dragOverItem.current = idx; }}
                  onDragEnd={isEditingTasks ? handleSort : undefined}
                  onDragOver={(e) => e.preventDefault()}
                  style={{ background: task.completed ? 'rgba(34, 197, 94, 0.05)' : 'var(--glass-bg)', borderRadius: '12px', borderBottom: '1px solid var(--border-color)', opacity: task.completed ? 0.7 : 1, transition: 'all 0.3s ease', padding: '18px 16px', marginBottom: '8px', cursor: isEditingTasks ? 'grab' : 'default' }}
                >
                  <div className="flex-row gap-4" style={{ alignItems: 'center' }}>
                    {isEditingTasks && (
                       <div style={{ cursor: 'grab', color: 'var(--text-muted)' }}>
                         <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                       </div>
                    )}
                    {isEditingTasks ? (
                       <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title="Remove Task">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                       </button>
                    ) : (
                       task.completed ? <FiCheckCircle size={24} color="var(--success)" /> : <FiClock size={24} color="var(--accent-primary)" />
                    )}
                    <div className="flex-col gap-1" style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title.replace(' (GKGS)', '')}</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        🕒 {task.duration} {getTopicForTask(task.id) && <span>• <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', letterSpacing: '0.5px' }}>topic: {getTopicForTask(task.id)}</span></span>}
                      </span>
                    </div>
                    {!isEditingTasks && (
                      task.completed ? (
                        <button onClick={() => toggleTask(task.id, true)} className="btn task-action-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                          <span className="desktop-text">Undo</span>
                          <FiRotateCcw className="mobile-icon" size={18} />
                        </button>
                      ) : (
                        <button onClick={() => toggleTask(task.id, false)} className="btn btn-primary task-action-btn">
                          <span className="desktop-text">Complete</span>
                          <FiCheck className="mobile-icon" size={18} />
                        </button>
                      )
                    )}
                  </div>
                </div>
              ))}
              {isEditingTasks && (
                <div style={{ marginTop: '8px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--accent-secondary)', borderRadius: '12px' }}>
                  {isAddingTask ? (
                    <div className="flex-col gap-2">
                       <input type="text" placeholder="Custom Study Task Title" className="glass-card" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} style={{ padding: '12px', width: '100%', outline: 'none', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)' }} />
                       <div className="flex-row gap-2">
                         <select className="glass-card" value={newTaskDuration} onChange={e => setNewTaskDuration(e.target.value)} style={{ padding: '12px', outline: 'none', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)' }}>
                           <option value="15 min">15 min</option>
                           <option value="30 min">30 min</option>
                           <option value="45 min">45 min</option>
                           <option value="1 hr">1 hr</option>
                           <option value="2 hr">2 hr</option>
                         </select>
                         <button onClick={handleAddTask} className="btn btn-primary" style={{ flex: 1, background: 'var(--accent-secondary)' }}>Add</button>
                         <button onClick={() => setIsAddingTask(false)} className="btn" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>Cancel</button>
                       </div>
                    </div>
                  ) : (
                    <button onClick={() => setIsAddingTask(true)} className="btn" style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--accent-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                       <FiPlus size={20} /> Add Custom Task
                    </button>
                  )}
                </div>
              )}
              {dailyTasks.length === 0 && !isEditingTasks && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                   No tasks assigned! Turn on Edit mode to add some.
                </div>
              )}
            </div>
          </div>

          {/* Analytics Shortcut */}
          <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--info)', opacity: '0.05', zIndex: 0 }}></div>
            <div className="flex-row justify-between" style={{ alignItems: 'center', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: '16px' }}>
              <div className="flex-col gap-2">
                <h2 style={{ fontSize: '1.25rem' }}>📊 Performance Analytics</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Track your strengths & weak subjects</p>
              </div>
              <button className="btn btn-primary" style={{ background: 'var(--info)', borderColor: 'var(--info)' }} onClick={() => navigate('/analytics')}>View Report</button>
            </div>
          </div>
          
        </div>

        {/* Right Column */}
        <div className="flex-col gap-6">
          
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.125rem' }}>Action Items</h3>
            
            <div className="glass-card p-4" onClick={() => navigate('/practice')} title="Go to Practice Engine to revise" style={{ padding: '16px', borderLeft: dueRevisionCount > 0 ? '4px solid var(--warning)' : '4px solid var(--success)', cursor: 'pointer', transition: 'all 0.3s' }}>
              <div className="flex-row justify-between">
                <div className="flex-col gap-1">
                  <span style={{ fontWeight: 600 }}>🔄 Revision Due</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{dueRevisionCount} Topics waiting</span>
                </div>
                <span style={{ background: dueRevisionCount > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: dueRevisionCount > 0 ? 'var(--warning)' : 'var(--success)', padding: '4px 12px', borderRadius: '8px', fontWeight: 'bold' }}>{dueRevisionCount}</span>
              </div>
            </div>

            <div className="glass-card p-4" onClick={() => navigate('/mistakes')} style={{ padding: '16px', borderLeft: '4px solid var(--danger)', cursor: 'pointer', transition: 'all 0.3s' }}>
              <div className="flex-row justify-between">
                <div className="flex-col gap-1">
                  <span style={{ fontWeight: 600 }}>❌ Mistakes to Review</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>From recent mocks</span>
                </div>
                <span style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '4px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.875rem', display: 'flex', alignItems: 'center' }}>Go ➔</span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '16px' }}>Weekly Progress</h3>
            <div className="flex-col gap-4">
              <div>
                <div className="flex-row justify-between" style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Syllabus Coverage</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{weeklySyllabusPercent}%</span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${weeklySyllabusPercent}%`, background: 'var(--info)' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex-row justify-between" style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Practice Accuracy</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{practiceAccuracy > 0 ? `${practiceAccuracy.toFixed(1)}%` : '0%'}</span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: practiceAccuracy > 0 ? `${practiceAccuracy}%` : '0%', background: 'var(--success)' }}></div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      <ConfirmModal 
        isOpen={!!taskToDelete}
        title="Delete Task?"
        message="Are you sure you want to remove this task from your daily study goals?"
        confirmText="Remove"
        isDanger={true}
        onConfirm={confirmDeleteTask}
        onCancel={() => setTaskToDelete(null)}
      />
    </div>
  );
};

export default Dashboard;
