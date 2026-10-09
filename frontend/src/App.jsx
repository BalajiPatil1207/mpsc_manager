import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { Toaster } from 'react-hot-toast';
import { FiMenu } from 'react-icons/fi';
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

  useEffect(() => {
    const registerPush = async (uid) => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const swReg = await navigator.serviceWorker.register('/sw.js');
          let subscription = await swReg.pushManager.getSubscription();
          
          if (!subscription) {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
              console.warn("Notifications permission denied by user.");
              return;
            }

            subscription = await swReg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: 'BB9DI_XDO0ojtAPSffKN0pZ3F-WdnHmBaeibAbuHbe-0voUkJzatYvXA5awPLzSv8GyZQjYK6P9ZolQ3fahL5Mc' 
            });

            // Send standard local welcome notification directly so user knows it works!
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

    const unsub = onAuthStateChanged(auth, (usr) => {
      setUser(usr);
      setLoading(false);
      
      if(usr) {
        registerPush(usr.uid);
      }
    });

    return () => {
      unsub();
    };
  }, []);

  if(loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '24px', background: 'var(--bg-primary)' }}>
      <div className="loader-spin" style={{ width: '48px', height: '48px', border: '5px solid var(--border-color)', borderTopColor: 'var(--accent-primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
      <div className="skeleton-line" style={{ width: '200px', height: '24px', background: 'var(--border-color)', borderRadius: '12px' }}></div>
      <div className="skeleton-line" style={{ width: '150px', height: '16px', background: 'var(--border-color)', borderRadius: '12px' }}></div>
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
              <Sidebar user={user} isOpen={sidebarOpen} closeSidebar={() => setSidebarOpen(false)} />
              <main className="main-content">
                <div className="top-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                   {!sidebarOpen && (
                     <button onClick={() => setSidebarOpen(true)} className="btn" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', color: 'var(--text-primary)' }}>
                       <FiMenu size={24} />
                     </button>
                   )}
                   <span className="mobile-only-title" style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--text-primary)' }}>MahaPrep OS</span>
                   <div style={{ width: '40px' }}></div>
                </div>
                <Routes>
                  <Route path="/" element={<Dashboard user={user} />} />
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
