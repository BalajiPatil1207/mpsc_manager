import React, { useState, useEffect } from 'react';
import { FiClock, FiCheckCircle, FiPlay, FiAlertTriangle, FiBell, FiMoon, FiSun } from 'react-icons/fi';
import { requestNotificationPermission, sendPushNotification } from '../utils/notify';
import { toast } from 'react-hot-toast';
import axios from 'axios';

const Dashboard = ({ user }) => {
  const currentReasoningSet = parseInt(localStorage.getItem('reasoningSetNumber')) || 1;

  const initialDailyTasks = [
    { id: 'reasoning', title: `🧠 Reasoning Practice (Set ${currentReasoningSet})`, duration: '1 hr', completed: false },
    { id: 'maths', title: '📐 Maths Practice', duration: '2 hr', completed: false },
    { id: 'gk_geo', title: '🌍 Geography (GKGS)', duration: '30 min', completed: false },
    { id: 'gk_his', title: '📜 History (GKGS)', duration: '30 min', completed: false },
    { id: 'gk_sci', title: '🔬 Science (GKGS)', duration: '30 min', completed: false },
    { id: 'gk_eco', title: '💰 Economics (GKGS)', duration: '30 min', completed: false },
    { id: 'gk_pol', title: '🏛️ Polity (GKGS)', duration: '30 min', completed: false },
    { id: 'gk_ca', title: '📰 Current Affairs', duration: '30 min', completed: false }
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

  useEffect(() => {
    // Check for a New Day to Reset Tasks and Advance Practice Sets
    const today = new Date().toLocaleDateString();
    const lastDate = localStorage.getItem('last_task_date');
    if (lastDate !== today) {
      // It's a new day!
      const savedTasks = JSON.parse(localStorage.getItem('user_daily_tasks') || '[]');
      const reasoningTask = savedTasks.find(t => t.id === 'reasoning');
      
      let nextSet = currentReasoningSet;
      // If reasoning was completed yesterday, increment the set number for today!
      if (reasoningTask && reasoningTask.completed) {
        nextSet += 1;
        localStorage.setItem('reasoningSetNumber', nextSet);
      }
      
      const resetTasks = [
        { id: 'reasoning', title: `🧠 Reasoning Practice (Set ${nextSet})`, duration: '1 hr', completed: false },
        { id: 'maths', title: '📐 Maths Practice', duration: '2 hr', completed: false },
        { id: 'gk_geo', title: '🌍 Geography (GKGS)', duration: '30 min', completed: false },
        { id: 'gk_his', title: '📜 History (GKGS)', duration: '30 min', completed: false },
        { id: 'gk_sci', title: '🔬 Science (GKGS)', duration: '30 min', completed: false },
        { id: 'gk_eco', title: '💰 Economics (GKGS)', duration: '30 min', completed: false },
        { id: 'gk_pol', title: '🏛️ Polity (GKGS)', duration: '30 min', completed: false },
        { id: 'gk_ca', title: '📰 Current Affairs', duration: '30 min', completed: false }
      ];
      setDailyTasks(resetTasks);
      localStorage.setItem('user_daily_tasks', JSON.stringify(resetTasks));
      localStorage.setItem('last_task_date', today);
    }
    
    // Request permission on load
    requestNotificationPermission();

    // Setup an interval to check task times every minute
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
    sendPushNotification("Study OS", "You are up to date!");
    toast("You're all caught up! No active alerts.", {
      icon: '🔔',
      style: { borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }
    });
  };
  
  const [theme, setTheme] = useState('dark');
  
  useEffect(() => {
    setTheme(document.body.getAttribute('data-theme') || 'dark');
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.body.setAttribute('data-theme', newTheme);
  };

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px' }}>
      
      {/* Header Section */}
      <div className="dashboard-header flex-row justify-between" style={{ alignItems: 'flex-start' }}>
        <div className="flex-col gap-2">
          <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '2px' }}>
            MPSC 2027 • DYNAMIC PREP
          </span>
          <h1 className="heading-gradient" style={{ fontSize: '2.5rem' }}>
            Good Morning, <span style={{ color: 'var(--accent-primary)', textShadow: '0 0 20px var(--accent-glow)' }}>{user?.displayName || 'Student'}</span> 👋
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome to your personalized Study OS</p>
        </div>
        
        <div className="dashboard-header-actions flex-row gap-4">
          
          <button onClick={toggleTheme} className="btn" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '42px', height: '42px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} title="Toggle Theme">
            {theme === 'dark' ? <FiSun size={20} color="var(--text-secondary)" /> : <FiMoon size={20} color="var(--text-secondary)" />}
          </button>

          <button onClick={handleNotificationClick} className="btn" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '42px', height: '42px', padding: 0 }} title="Notifications">
            <FiBell size={20} color="var(--accent-primary)" />
          </button>

          <div className="glass-card flex-row gap-4" style={{ padding: '12px 24px' }}>
            <div className="flex-col" style={{ alignItems: 'flex-end' }}>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Preparation Score</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)' }}>0%</span>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--accent-primary)', borderLeftColor: 'rgba(255,255,255,0.1)', transform: 'rotate(45deg)' }}></div>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <div className="glass-card stat-card">
          <span className="stat-label">Tasks</span>
          <span className="stat-value">{dailyTasks.length}</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total assigned today</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value">{dailyTasks.filter(t=>t.completed).length}</span>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${dailyTasks.length > 0 ? (dailyTasks.filter(t=>t.completed).length / dailyTasks.length)*100 : 0}%` }}></div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Study Time</span>
          <span className="stat-value">0h 0m</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--success)' }}>Active Learning</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Syllabus</span>
          <span className="stat-value">0%</span>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: '0%' }}></div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column */}
        <div className="flex-col gap-6">
          
          {/* Today's Tasks */}
          <div className="glass-panel" style={{ padding: '24px' }}>
            <div className="flex-row justify-between" style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '1.25rem' }}>📋 Today's Tasks</h2>
              <button className="btn" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}>View All</button>
            </div>
            
            <div className="flex-col gap-3">
              {dailyTasks.map(task => (
                <div key={task.id} className="task-item" style={{ background: task.completed ? 'rgba(34, 197, 94, 0.05)' : 'var(--glass-bg)', borderRadius: '12px', opacity: task.completed ? 0.7 : 1, transition: 'all 0.3s ease', padding: '16px' }}>
                  <div className="flex-row gap-4" style={{ alignItems: 'center' }}>
                    {task.completed ? <FiCheckCircle size={24} color="var(--success)" /> : <FiClock size={24} color="var(--accent-primary)" />}
                    <div className="flex-col gap-1" style={{ flex: 1 }}>
                      <span style={{ fontWeight: 600, color: task.completed ? 'var(--text-muted)' : 'var(--text-primary)', textDecoration: task.completed ? 'line-through' : 'none' }}>{task.title}</span>
                      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Duration: {task.duration}</span>
                    </div>
                    {task.completed ? (
                      <button onClick={() => toggleTask(task.id, true)} className="btn" style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', fontSize: '0.75rem' }}>Undo</button>
                    ) : (
                      <button onClick={() => toggleTask(task.id, false)} className="btn btn-primary" style={{ padding: '8px 16px' }}>Complete</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Daily Practice */}
          <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--accent-glow)', opacity: '0.1', zIndex: 0 }}></div>
            <div className="flex-row justify-between" style={{ alignItems: 'center', position: 'relative', zIndex: 1 }}>
              <div className="flex-col gap-2">
                <h2 style={{ fontSize: '1.25rem' }}>🧠 Daily Practice Engine</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>AI-generated tests await in the vault</p>
              </div>
              <button className="btn btn-primary" onClick={() => window.location.href='/test-maker'}>Go to Vault</button>
            </div>
          </div>
          
        </div>

        {/* Right Column */}
        <div className="flex-col gap-6">
          
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.125rem' }}>Action Items</h3>
            
            <div className="glass-card p-4" style={{ padding: '16px', borderLeft: '4px solid var(--warning)' }}>
              <div className="flex-row justify-between">
                <div className="flex-col gap-1">
                  <span style={{ fontWeight: 600 }}>🔄 Revision Due</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>0 Topics waiting</span>
                </div>
                <span style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)', padding: '4px 12px', borderRadius: '8px', fontWeight: 'bold' }}>0</span>
              </div>
            </div>

            <div className="glass-card p-4" style={{ padding: '16px', borderLeft: '4px solid var(--danger)' }}>
              <div className="flex-row justify-between">
                <div className="flex-col gap-1">
                  <span style={{ fontWeight: 600 }}>❌ Mistakes to Review</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>From recent mocks</span>
                </div>
                <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', padding: '4px 12px', borderRadius: '8px', fontWeight: 'bold' }}>0</span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '16px' }}>Weekly Progress</h3>
            <div className="flex-col gap-4">
              <div>
                <div className="flex-row justify-between" style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Syllabus Coverage</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>0%</span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: '0%', background: 'var(--info)' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex-row justify-between" style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Practice Accuracy</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>0%</span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: '0%', background: 'var(--success)' }}></div>
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
