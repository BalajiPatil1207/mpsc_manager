import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiX, FiCheckCircle, FiBell, FiClock, FiPlay, FiFilm, FiBookOpen, FiAward, FiArrowRight } from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-hot-toast';

export const getStoredNotifications = () => {
  try {
    const data = localStorage.getItem('mpsc_inapp_notifications');
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

export const saveStoredNotifications = (notifs) => {
  try {
    localStorage.setItem('mpsc_inapp_notifications', JSON.stringify(notifs.slice(0, 30))); // Keep last 30
  } catch (e) {}
};

const formatTimeAgo = (timestamp) => {
  if (!timestamp) return 'आत्ताच';
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'आत्ताच';
  if (diffMin < 60) return `${diffMin} मिनिटांपूर्वी`;
  if (diffHour < 24) return `${diffHour} तासांपूर्वी`;
  if (diffDays === 1) return 'काल';
  return `${diffDays} दिवसांपूर्वी`;
};

const NotificationCenter = ({ isOpen, onClose, onCountChange }) => {
  const [notifications, setNotifications] = useState([]);
  const navigate = useNavigate();

  // Generate smart time-of-day notification
  const generateTimeReminders = () => {
    const now = new Date();
    const hour = now.getHours();
    const todayStr = now.toISOString().split('T')[0];

    const reminders = [];

    // Morning Reminder (8 AM - 12 PM)
    if (hour >= 8 && hour < 12) {
      reminders.push({
        id: `morning_${todayStr}`,
        title: '🌅 शुभ सकाळ! Daily MCQ Drill',
        message: 'आजच्या दिवसातील १५ सराव प्रश्न सोडवून अभ्यासाची सुरुवात करा!',
        type: 'reminder',
        link: '/practice',
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 8, 30).toISOString(),
        read: false
      });
    }

    // Afternoon PYQ Drill (12 PM - 5 PM)
    if (hour >= 12 && hour < 17) {
      reminders.push({
        id: `afternoon_${todayStr}`,
        title: '⚡ चालू घडामोडी & PYQ रिव्हिजन',
        message: 'दुपारच्या सत्रात चालू घडामोडी आणि मागील वर्षांच्या प्रश्नांची उजळणी करा!',
        type: 'reminder',
        link: '/planner',
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 13, 0).toISOString(),
        read: false
      });
    }

    // Evening Mock (5 PM - 10 PM)
    if (hour >= 17 && hour < 22) {
      reminders.push({
        id: `evening_${todayStr}`,
        title: '🎯 संध्याकाळची मॉक टेस्ट वेळ',
        message: 'आजचा स्टडी गोल पूर्ण करण्यासाठी एक टेस्ट सबमिट करा आणि रँक तपासा!',
        type: 'test',
        link: '/mock',
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0).toISOString(),
        read: false
      });
    }

    // Night Mistakes Revision (10 PM+)
    if (hour >= 22 || hour < 8) {
      reminders.push({
        id: `night_${todayStr}`,
        title: '📖 मिस्टेक बुक रिव्हिजन',
        message: 'झोपण्यापूर्वी आज चुकलेले सर्व प्रश्न Mistake Book मधून पुन्हा एकदा तपासा.',
        type: 'reminder',
        link: '/mistakes',
        createdAt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 21, 30).toISOString(),
        read: false
      });
    }

    return reminders;
  };

  const syncNotifications = async () => {
    let existing = getStoredNotifications();
    let updated = [...existing];
    let addedCount = 0;

    // 1. Merge Smart Timed Reminders
    const timedReminders = generateTimeReminders();
    timedReminders.forEach(reminder => {
      if (!updated.some(n => n.id === reminder.id)) {
        updated.unshift(reminder);
        addedCount++;
      }
    });

    // 2. Try fetching latest community tests (works whether Render is alive or fails gracefully)
    try {
      const res = await axios.get('https://mpsc-manager.onrender.com/api/custom-tests/all', { timeout: 4000 });
      if (res.data.success && Array.isArray(res.data.data)) {
        const latestTests = res.data.data.slice(0, 5);
        latestTests.forEach(test => {
          const testId = test._id || test.id;
          const notifId = `test_${testId}`;
          if (!updated.some(n => n.id === notifId)) {
            updated.push({
              id: notifId,
              title: `📝 नवीन टेस्ट: ${test.title}`,
              message: `${test.subject || 'General'} • ${test.questions?.length || 0} प्रश्न उपलब्ध`,
              type: 'test',
              link: `/test/${testId}`,
              createdAt: test.createdAt || new Date().toISOString(),
              read: false
            });
            addedCount++;
          }
        });
      }
    } catch (e) {
      // Offline fallback: Use cached tests if available
      try {
        const cached = localStorage.getItem('mpsc_cached_practice');
        if (cached) {
          const cachedTests = JSON.parse(cached).slice(0, 3);
          cachedTests.forEach(test => {
            const testId = test._id || test.id;
            const notifId = `test_${testId}`;
            if (!updated.some(n => n.id === notifId)) {
              updated.push({
                id: notifId,
                title: `📝 सराव चाचणी: ${test.title}`,
                message: `${test.subject || 'General'} • ${test.questions?.length || 0} प्रश्न`,
                type: 'test',
                link: `/test/${testId}`,
                createdAt: test.createdAt || new Date().toISOString(),
                read: false
              });
            }
          });
        }
      } catch (err) {}
    }

    // 3. Try fetching latest Reels
    try {
      const reelRes = await axios.get('https://mpsc-manager.onrender.com/api/reels/all', { timeout: 4000 });
      if (reelRes.data.success && Array.isArray(reelRes.data.data)) {
        const latestReels = reelRes.data.data.slice(0, 3);
        latestReels.forEach(reel => {
          const reelId = reel._id || reel.id;
          const notifId = `reel_${reelId}`;
          if (!updated.some(n => n.id === notifId)) {
            updated.push({
              id: notifId,
              title: `📽️ स्टडी रील: ${reel.title}`,
              message: `${reel.subject || 'General'} • ${reel.cards?.length || 0} फ्लॅशकार्ड्स उपलब्ध`,
              type: 'reel',
              link: `/reel/${reelId}`,
              createdAt: reel.createdAt || new Date().toISOString(),
              read: false
            });
            addedCount++;
          }
        });
      }
    } catch (e) {}

    // Sort by latest createdAt
    updated.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

    saveStoredNotifications(updated);
    setNotifications(updated);

    const unread = updated.filter(n => !n.read).length;
    if (onCountChange) onCountChange(unread);
  };

  useEffect(() => {
    syncNotifications();
    const interval = setInterval(syncNotifications, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    saveStoredNotifications(updated);
    if (onCountChange) onCountChange(0);
    toast.success("सर्व नोटिफिकेशन्स वाचल्या म्हणून मार्क केल्या! ✓");
  };

  const handleNotificationClick = (notif) => {
    const updated = notifications.map(n => n.id === notif.id ? { ...n, read: true } : n);
    setNotifications(updated);
    saveStoredNotifications(updated);
    const unread = updated.filter(n => !n.read).length;
    if (onCountChange) onCountChange(unread);

    onClose();
    if (notif.link) {
      navigate(notif.link);
    }
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    saveStoredNotifications([]);
    if (onCountChange) onCountChange(0);
    toast.success("सर्व नोटिफिकेशन्स क्लिअर केल्या!");
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notification-backdrop" onClick={onClose}>
      <div 
        className="notification-card-dropdown" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="notification-header">
          <div className="flex-row gap-2" style={{ alignItems: 'center' }}>
            <span style={{ fontSize: '1.2rem' }}>🔔</span>
            <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 700 }}>
              सूचना केंद्र
            </h3>
            {unreadCount > 0 && (
              <span className="notification-unread-pill">
                {unreadCount} नवीन
              </span>
            )}
          </div>
          <div className="flex-row gap-2" style={{ alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button 
                onClick={markAllAsRead} 
                className="btn-mark-read"
                title="Mark all read"
              >
                सर्व वाचले ✓
              </button>
            )}
            <button 
              onClick={onClose} 
              className="btn-close-notif"
              title="Close"
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* Offline & Realtime Sync Notice */}
        <div className="notification-status-notice">
          <span>⚡ <strong>रिअल-टाइम अपडेट्स सक्रिय:</strong> सर्व्हर स्लीपवर असले तरीही सर्व टेस्ट्स आणि वेळोवेळी येणाऱ्या सूचना या कार्डमध्ये नेहमी उपलब्ध राहतील.</span>
        </div>

        {/* Notification List */}
        <div className="notification-list">
          {notifications.length === 0 ? (
            <div className="notification-empty">
              <FiBell size={36} color="var(--text-muted)" style={{ marginBottom: '8px' }} />
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontWeight: 600 }}>कोणतीही सूचना नाही</p>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>नवीन टेस्ट आणि अभ्यासाचे अलर्ट्स येथे दिसतील.</span>
            </div>
          ) : (
            notifications.map(notif => {
              let Icon = FiBell;
              let iconBg = 'rgba(59, 130, 246, 0.15)';
              let iconColor = 'var(--info)';

              if (notif.type === 'test') {
                Icon = FiPlay;
                iconBg = 'rgba(34, 197, 94, 0.15)';
                iconColor = 'var(--success)';
              } else if (notif.type === 'reel') {
                Icon = FiFilm;
                iconBg = 'rgba(168, 85, 247, 0.15)';
                iconColor = '#a855f7';
              } else if (notif.type === 'reminder') {
                Icon = FiClock;
                iconBg = 'rgba(245, 158, 11, 0.15)';
                iconColor = 'var(--warning)';
              }

              return (
                <div 
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`notification-item ${!notif.read ? 'unread' : ''}`}
                >
                  <div className="notification-icon-wrapper" style={{ background: iconBg, color: iconColor }}>
                    <Icon size={16} />
                  </div>
                  <div className="notification-content">
                    <div className="flex-row justify-between" style={{ alignItems: 'flex-start', gap: '8px' }}>
                      <h4 className="notification-title">{notif.title}</h4>
                      {!notif.read && <span className="notification-dot"></span>}
                    </div>
                    <p className="notification-desc">{notif.message}</p>
                    <span className="notification-time">
                      <FiClock size={11} style={{ marginRight: '4px', verticalAlign: '-1px' }} />
                      {formatTimeAgo(notif.createdAt)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {notifications.length > 0 && (
          <div className="notification-footer">
            <button 
              onClick={clearAllNotifications} 
              className="btn-clear-all"
            >
              सर्व क्लिअर करा
            </button>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              MahaPrep Study OS
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationCenter;
