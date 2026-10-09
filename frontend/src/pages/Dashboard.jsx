import React, { useState, useEffect } from 'react';
import { FiClock, FiCheckCircle, FiPlay, FiAlertTriangle, FiBell, FiMoon, FiSun, FiCheck, FiRotateCcw } from 'react-icons/fi';
import { requestNotificationPermission, sendPushNotification } from '../utils/notify';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

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

const Dashboard = ({ user }) => {
  const navigate = useNavigate();
  const [showAllTasks, setShowAllTasks] = useState(false);
  const currentReasoningSet = parseInt(localStorage.getItem('reasoningSetNumber')) || 1;

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
    const saved = localStorage.getItem('user_daily_tasks');
    return saved ? JSON.parse(saved) : initialDailyTasks;
  });

  const toggleTask = (taskId, isUndo = false) => {
    const updated = dailyTasks.map(t => {
      if (t.id === taskId) {
        return { ...t, completed: !isUndo };
      }
      return t;
    });
    setDailyTasks(updated);
    localStorage.setItem('user_daily_tasks', JSON.stringify(updated));
    if (!isUndo) {
      toast.success('Task marked as completed! 🎉');
    }
  };

  const advanceToNextDay = async () => {
    const savedTasks = JSON.parse(localStorage.getItem('user_daily_tasks') || '[]');
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
        title: getTitleForTask(t.id, newIndexes[t.id] || 0),
        duration: t.duration,
        completed: false
      };
    });
    localStorage.setItem('revision_queue', JSON.stringify(existingQueue));

    const now = new Date();
    localStorage.setItem('task_indexes', JSON.stringify(newIndexes));
    setDailyTasks(resetTasks);
    localStorage.setItem('user_daily_tasks', JSON.stringify(resetTasks));
    localStorage.setItem('last_task_date', getLogicalDateString());
    localStorage.setItem('last_task_time', now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase());
    toast.success("Advanced to the next study session! 🚀");
    
    // Generate daily 6 AM Mega Test automatically!
    try {
      await axios.post('https://mpsc-manager.onrender.com/api/custom-tests/mega-test');
      toast.success("Daily 100-Q Mega Test has been auto-generated!");
    } catch(err) {
      console.error(err);
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

  const calculateDaysLeft = () => {
    const target = new Date('2027-04-04T00:00:00');
    const diff = target - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px', animation: 'fadeIn 0.6s ease-out' }}>
      
      {/* Header Section */}
      <div className="dashboard-header flex-row justify-between" style={{ alignItems: 'flex-start' }}>
        <div className="flex-col gap-2">
          <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '2px' }}>
            MPSC 2027 • DYNAMIC PREP
          </span>
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
          <div className="glass-card flex-row gap-4" style={{ padding: '12px 24px', animation: 'slideUp 0.8s ease-out' }}>
            <div className="flex-col" style={{ alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>MPSC 2027 In</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}><AnimatedNumber value={calculateDaysLeft()} /> <span style={{fontSize:'1rem'}}>Days</span></span>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem' }}>⏳</div>
          </div>
          
          <div className="glass-card flex-row gap-4" style={{ padding: '12px 24px', animation: 'slideUp 0.9s ease-out' }}>
            <div className="flex-col" style={{ alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total XP Earned</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-secondary)' }}><AnimatedNumber value={parseFloat(localStorage.getItem('xp_total')) || 0} /></span>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--accent-primary)', borderLeftColor: 'rgba(255,255,255,0.1)', transform: 'rotate(45deg)' }}></div>
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
                <button onClick={advanceToNextDay} className="btn" style={{ padding: '6px 12px', background: 'var(--accent-glow)', color: 'var(--accent-primary)', border: '1px solid var(--accent-glow)', outline: 'none', fontSize: '0.75rem' }}>Wrap Up Day 🚀</button>
                <button onClick={() => setShowAllTasks(!showAllTasks)} className="btn" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none' }}>{showAllTasks ? 'View Less' : 'View All'}</button>
              </div>
            </div>
            
            <div className="flex-col gap-4">
              {(showAllTasks ? [...dailyTasks].sort((a, b) => a.completed === b.completed ? 0 : a.completed ? 1 : -1) : [...dailyTasks].sort((a, b) => a.completed === b.completed ? 0 : a.completed ? 1 : -1).slice(0, 3)).map(task => (
                <div key={task.id} className="task-item" style={{ background: task.completed ? 'rgba(34, 197, 94, 0.05)' : 'var(--glass-bg)', borderRadius: '12px', borderBottom: '1px solid var(--border-color)', opacity: task.completed ? 0.7 : 1, transition: 'all 0.3s ease', padding: '18px 16px', marginBottom: '8px' }}>
                  <div className="flex-row gap-4" style={{ alignItems: 'center' }}>
                    {task.completed ? <FiCheckCircle size={24} color="var(--success)" /> : <FiClock size={24} color="var(--accent-primary)" />}
                    <div className="flex-col gap-1" style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title.replace(' (GKGS)', '')}</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                        🕒 {task.duration} {getTopicForTask(task.id) && <span>• <span style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', letterSpacing: '0.5px' }}>topic: {getTopicForTask(task.id)}</span></span>}
                      </span>
                    </div>
                    {task.completed ? (
                      <button onClick={() => toggleTask(task.id, true)} className="btn task-action-btn" style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)' }}>
                        <span className="desktop-text">Undo</span>
                        <FiRotateCcw className="mobile-icon" size={18} />
                      </button>
                    ) : (
                      <button onClick={() => toggleTask(task.id, false)} className="btn btn-primary task-action-btn">
                        <span className="desktop-text">Complete</span>
                        <FiCheck className="mobile-icon" size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{currentWeeklyTotal > 0 ? '85%' : '0%'}</span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: currentWeeklyTotal > 0 ? '85%' : '0%', background: 'var(--success)' }}></div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
    </div>
  );
};

export default Dashboard;
