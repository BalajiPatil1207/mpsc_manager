import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Toaster, toast } from 'react-hot-toast';
import { FiMenu, FiSun, FiMoon, FiBell, FiCloud, FiDownload } from 'react-icons/fi';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import StudyPlanner from './pages/StudyPlanner';
import Practice from './pages/Practice';
import MockTests from './pages/MockTests';
import Analytics from './pages/Analytics';
import MistakeBook from './pages/MistakeBook';
import TestMaker from './pages/TestMaker';
import TakeTest from './pages/TakeTest';
import NoteReels from './pages/NoteReels';
import ReelViewer from './pages/ReelViewer';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [theme, setTheme] = useState('light');
  const [isSyncing, setIsSyncing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    
    const initialTheme = document.body.getAttribute('data-theme') || 'light';
    setTheme(initialTheme);
    document.body.setAttribute('data-theme', initialTheme);
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.body.setAttribute('data-theme', newTheme);
  };

  const handleCloudSync = async () => {
    if (!user) return;
    setIsSyncing(true);
    const toastId = toast.loading('Syncing data to cloud... ☁️');
    try {
      const userRef = doc(db, 'user_progress', user.uid);
      const backupData = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('xp_') || key.includes('accuracy') || key.includes('task') || key.includes('queue'))) {
           backupData[key] = localStorage.getItem(key);
        }
      }
      backupData.lastSynced = new Date().toISOString();
      await setDoc(userRef, backupData, { merge: true });
      toast.success('Backup Successful! Data is safe in Cloud.', { id: toastId });
      import('./utils/sound').then(({ playSound }) => playSound.playXpGain());
    } catch(err) {
      console.error("Sync error:", err);
      toast.error('Cloud sync failed!', { id: toastId });
    } finally {
      setIsSyncing(false);
    }
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
        setDeferredPrompt(null);
      });
    } else {
      toast("To install, tap 'Share' or 'Menu' then 'Add to Home Screen' in your browser! 📱", {
         icon: '📲',
         style: { borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }
      });
    }
  };

  const handleNotificationClick = () => {
    if (Notification.permission !== "granted") {
      Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
           toast.success("Notification permissions enabled! 🔔");
        } else {
           alert("Please enable notification permissions in your browser settings!");
        }
      });
    } else {
      toast("You're all caught up! No active alerts.", {
        icon: '🔔',
        style: { borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }
      });
    }
  };

  useEffect(() => {
    const registerPush = async (uid) => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const swReg = await navigator.serviceWorker.register('/sw.js');
          let subscription = await swReg.pushManager.getSubscription();
          
          if (!subscription) {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') return;

            subscription = await swReg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: 'BB9DI_XDO0ojtAPSffKN0pZ3F-WdnHmBaeibAbuHbe-0voUkJzatYvXA5awPLzSv8GyZQjYK6P9ZolQ3fahL5Mc' 
            });

            new Notification("MahaPrep OS Active! 🚀", {
              body: "Notifications are successfully enabled. You will get daily reminders!",
              icon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png"
            });
          }
          
          await axios.post('https://mpsc-manager.onrender.com/api/notifications/subscribe', {
            subscription,
            userId: uid
          });
        } catch (e) {
          console.error("Vapid SW Push Registration failed", e);
        }
      }
    };

    const unsub = onAuthStateChanged(auth, async (usr) => {
      if(usr) {
        // Fetch source of truth from DB immediately
        const { loadProgressFromDB } = await import('./utils/dbStore');
        const loaded = await loadProgressFromDB(usr.uid);
        setUser(usr); // Set user after loading DB cache!
        registerPush(usr.uid);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => {
      unsub();
    };
  }, []);

  if(loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '32px', background: 'var(--bg-primary)' }}>
      <div className="premium-loader">
         <div className="ring"></div>
         <div className="ring"></div>
         <div className="ring"></div>
         <span className="premium-loader-text">OS</span>
      </div>
      <p style={{ color: 'var(--text-secondary)', letterSpacing: '3px', textTransform: 'uppercase', animation: 'pulse 1.5s infinite', fontSize: '0.875rem', fontWeight: 600 }}>Loading AI Engine</p>
    </div>
  );

  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />
      <Routes>
        <Route path="/test/:testId" element={<TakeTest />} />
        <Route path="/reel/:reelId" element={<ReelViewer />} />
        <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
        <Route path="/register" element={user ? <Navigate to="/" /> : <Register />} />
        <Route 
          path="*" 
          element={
            user ? (
            <div className="app-container">
              <Sidebar user={user} isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} onSync={handleCloudSync} isSyncing={isSyncing} />
              <main className="main-content">
                <div className="top-header">
                   <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                     {!sidebarOpen && (
                       <button onClick={() => setSidebarOpen(true)} className="btn" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', color: 'var(--text-primary)' }}>
                         <FiMenu size={24} />
                       </button>
                     )}
                     <span className="mobile-only-title" style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--text-primary)' }}>MahaPrep OS</span>
                   </div>
                   <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={toggleTheme} className="btn" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} title="Toggle Theme">
                        {theme === 'dark' ? <FiSun size={18} color="var(--text-secondary)" /> : <FiMoon size={18} color="var(--text-secondary)" />}
                      </button>
                      <button onClick={handleNotificationClick} className="btn" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '50%', width: '40px', height: '40px', padding: 0 }} title="Notifications">
                         <FiBell size={18} color="var(--accent-primary)" />
                      </button>
                   </div>
                </div>
                <Routes>
                  <Route path="/" element={<Dashboard user={user} deferredPrompt={deferredPrompt} setDeferredPrompt={setDeferredPrompt} />} />
                  <Route path="/planner" element={<StudyPlanner user={user} />} />
                  <Route path="/practice" element={<Practice />} />
                  <Route path="/mock" element={<MockTests />} />
                  <Route path="/analytics" element={<Analytics />} />
                  <Route path="/mistakes" element={<MistakeBook />} />
                  <Route path="/test-maker" element={<TestMaker />} />
                  <Route path="/reels" element={<NoteReels />} />
                </Routes>
              </main>
              <BottomNav />
            </div>
            ) : <Navigate to="/login" />
          } 
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
