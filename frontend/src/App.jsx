import React, { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { db, auth } from './firebase';
import { Toaster, toast } from 'react-hot-toast';
import { FiMenu, FiSun, FiMoon, FiBell, FiCloud, FiDownload } from 'react-icons/fi';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import NotificationCenter, { getStoredNotifications, saveStoredNotifications } from './components/NotificationCenter';
import { sendPushNotification } from './utils/notify';
import { playSound } from './utils/sound';

// Lazy-loaded routes for 2x faster initial bundle load & code splitting
const Dashboard = lazy(() => import('./pages/Dashboard'));
const StudyPlanner = lazy(() => import('./pages/StudyPlanner'));
const Practice = lazy(() => import('./pages/Practice'));
const MockTests = lazy(() => import('./pages/MockTests'));
const Analytics = lazy(() => import('./pages/Analytics'));
const MistakeBook = lazy(() => import('./pages/MistakeBook'));
const TestMaker = lazy(() => import('./pages/TestMaker'));
const TakeTest = lazy(() => import('./pages/TakeTest'));
const NoteReels = lazy(() => import('./pages/NoteReels'));
const ReelViewer = lazy(() => import('./pages/ReelViewer'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

const PageLoader = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '60vh',
    gap: '14px'
  }}>
    <div 
      className="spin-animation" 
      style={{
        width: '42px',
        height: '42px',
        borderRadius: '50%',
        border: '3px solid var(--border-color)',
        borderTopColor: 'var(--accent-primary)'
      }} 
    />
    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>लोड होत आहे...</span>
  </div>
);

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [theme, setTheme] = useState('light');
  const [isSyncing, setIsSyncing] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  
  const [showIntro, setShowIntro] = useState(() => {
    return sessionStorage.getItem('intro_played') ? false : true;
  });

  const hideIntro = () => {
    sessionStorage.setItem('intro_played', 'true');
    setShowIntro(false);
  };

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
    
    const initialTheme = document.body.getAttribute('data-theme') || 'light';
    setTheme(initialTheme);
    document.body.setAttribute('data-theme', initialTheme);

    // 🚀 Background Pre-warm Render Server immediately on frontend load
    axios.get('https://mpsc-manager.onrender.com/api/health', { timeout: 8000 }).catch(() => {});
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
        if (key && (key.startsWith('xp_') || key.includes('accuracy') || key.includes('task') || key.includes('queue') || key.includes('deficit') || key.includes('penalty') || key.includes('backlog'))) {
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
    setShowNotifications(prev => !prev);
    // Request permission if not yet decided, quietly in background
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  };

  useEffect(() => {
    const registerPush = async (uid, email) => {
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
            userId: uid,
            email: email || ''
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

        // Fetch / sync server feature flags
        try {
          const profileRes = await axios.post(`https://mpsc-manager.onrender.com/api/users/${usr.uid}/sync`, {
            email: usr.email,
            displayName: usr.displayName
          }, { timeout: 4000 });
          if (profileRes.data.success && profileRes.data.data?.features) {
            usr.features = profileRes.data.data.features;
          }
        } catch (e) {}

        setUser(usr); // Set user after loading DB cache & features!
        registerPush(usr.uid, usr.email);
      } else {
        const isGuest = localStorage.getItem('guest_user') === 'true';
        if (isGuest) {
          setUser({ uid: 'guest_user_101', displayName: 'MPSC Aspirant', email: 'aspirant@mpsc.local', features: {} });
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => {
      unsub();
    };
  }, []);

  // 🌸 Special Continuous Motivational Notification (Dynamic Feature Flag & Server Sync)
  useEffect(() => {
    const userEmail = (user?.email || '').trim().toLowerCase();
    const hasQuoteFeature = Boolean(user?.features?.quoteNotifications || userEmail === 'balu@gmail.com');
    if (!hasQuoteFeature) return;

    // 2.5 hours = 150 minutes (continuous periodic reminder between 2-3 hours)
    const INTERVAL_MS = 2.5 * 60 * 60 * 1000;

    const checkAndTriggerQuoteNotification = () => {
      const currentEmail = (auth.currentUser?.email || user?.email || '').trim().toLowerCase();
      const isAllowed = Boolean(user?.features?.quoteNotifications || currentEmail === 'balu@gmail.com');
      if (!isAllowed) return;

      const lastSentStr = localStorage.getItem('balu_last_quote_time');
      const lastSentTime = lastSentStr ? parseInt(lastSentStr, 10) : 0;
      const now = Date.now();

      if (now - lastSentTime >= INTERVAL_MS) {
        sendPushNotification(
          'One day, everything will make sense. ❤️',
          'स्वतःवर विश्वास ठेवा, तुमचे प्रामाणिक प्रयत्न नक्कीच रंग आणतील. Keep pushing forward! ✨'
        );

        try { playSound.playSuccess(); } catch (e) {}

        localStorage.setItem('balu_last_quote_time', now.toString());

        try {
          const stored = getStoredNotifications();
          const notifId = `balu_quote_${now}`;
          if (!stored.some(n => n.id === notifId)) {
            const newNotif = {
              id: notifId,
              title: 'One day, everything will make sense. ❤️',
              message: 'कष्टावर विश्वास ठेवा. तुमचा प्रत्येक तास तुम्हाला ध्येयाच्या जवळ नेत आहे! 🌟',
              type: 'reminder',
              link: '/',
              createdAt: new Date().toISOString(),
              read: false
            };
            saveStoredNotifications([newNotif, ...stored]);
            setUnreadNotifCount(prev => prev + 1);
          }
        } catch (e) {
          console.error(e);
        }
      }
    };

    // Check immediately on mount/login
    checkAndTriggerQuoteNotification();

    // Check periodically every minute so that after 2-3 hours it fires automatically
    const timer = setInterval(checkAndTriggerQuoteNotification, 60 * 1000);

    return () => clearInterval(timer);
  }, [user]);

  if(loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '32px', background: 'var(--bg-primary)' }}>
      <div className="premium-loader">
         <div className="ring"></div>
         <div className="ring"></div>
         <div className="ring"></div>
         <span className="premium-loader-text" style={{ fontSize: '1.25rem', fontFamily: 'serif', fontStyle: 'italic', color: 'var(--accent-primary)' }}>1207</span>
      </div>
      <p style={{ color: 'var(--text-secondary)', letterSpacing: '3px', textTransform: 'uppercase', animation: 'pulse 1.5s infinite', fontSize: '0.875rem', fontWeight: 600 }}>Loading MahaPrep</p>
    </div>
  );

  if (showIntro) {
    return (
      <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 99999, background: '#000' }}>
         <video 
           src="/video/intro.mp4" 
           autoPlay 
           muted
           playsInline
           onEnded={hideIntro} 
           style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
         />
         <button onClick={hideIntro} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', zIndex: 100000, fontSize: '0.875rem' }}>Skip Intro</button>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />
      <Suspense fallback={<PageLoader />}>
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
                        <button 
                          onClick={handleNotificationClick} 
                          className="btn" 
                          style={{ 
                            background: 'var(--glass-bg)', 
                            border: '1px solid var(--border-color)', 
                            borderRadius: '50%', 
                            width: '40px', 
                            height: '40px', 
                            padding: 0,
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }} 
                          title="Notifications"
                        >
                           <FiBell size={18} color="var(--accent-primary)" />
                           {unreadNotifCount > 0 && (
                             <span className="bell-badge-pill">
                               {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                             </span>
                           )}
                        </button>
                     </div>
                  </div>

                  <NotificationCenter 
                    isOpen={showNotifications} 
                    onClose={() => setShowNotifications(false)} 
                    onCountChange={setUnreadNotifCount} 
                    user={user}
                  />
                  <Suspense fallback={<PageLoader />}>
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
                  </Suspense>
                </main>
                <BottomNav />
              </div>
              ) : <Navigate to="/register" />
            } 
          />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
