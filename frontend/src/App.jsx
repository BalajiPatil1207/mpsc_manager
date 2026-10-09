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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const registerPush = async (uid) => {
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        try {
          const swReg = await navigator.serviceWorker.register('/sw.js');
          let subscription = await swReg.pushManager.getSubscription();
          
          if (!subscription) {
            subscription = await swReg.pushManager.subscribe({
              userVisibleOnly: true,
              applicationServerKey: 'BB9DI_XDO0ojtAPSffKN0pZ3F-WdnHmBaeibAbuHbe-0voUkJzatYvXA5awPLzSv8GyZQjYK6P9ZolQ3fahL5Mc' // from VAPID
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

  if(loading) return <div style={{color:'white', padding: '40px', textAlign: 'center'}}>Loading App...</div>;

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
                <div className="mobile-header" style={{ display: 'none', marginBottom: '24px' }}>
                   <button onClick={() => setSidebarOpen(true)} className="btn" style={{ background: 'var(--glass-bg)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px', color: 'var(--text-primary)' }}>
                     <FiMenu size={24} />
                   </button>
                   <span style={{ fontWeight: 'bold', fontSize: '1.25rem', color: 'var(--text-primary)' }}>MahaPrep OS</span>
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
