import toast from 'react-hot-toast';

export const requestNotificationPermission = async () => {
  if (typeof window === 'undefined' || !("Notification" in window)) {
    console.log("This browser does not support notifications");
    return;
  }
  try {
    if (Notification.permission !== "denied") {
      await Notification.requestPermission();
    }
  } catch (e) {
    console.warn("Notification permission request warning:", e);
  }
};

export const sendPushNotification = (title, body) => {
  // 1. Show in-app toast notification (Universal across all mobile & desktop browsers)
  try {
    toast(title + (body ? "\n" + body : ""), {
      icon: '🔔',
      duration: 5000,
      style: {
        borderRadius: '12px',
        background: '#1f1f23',
        color: '#f8fafc',
        border: '1px solid var(--accent-glow)',
        boxShadow: '0 4px 20px var(--accent-glow)',
      },
    });
  } catch (e) {}

  // 2. Show OS-level notification safely
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === "granted") {
    const options = {
      body: body || '',
      icon: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png'
    };

    // Chrome on Android explicitly forbids `new Notification()` and requires ServiceWorkerRegistration.showNotification
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready
        .then((reg) => {
          if (reg && reg.showNotification) {
            reg.showNotification(title, options);
          }
        })
        .catch(() => {
          // Gracefully ignore service worker errors
        });
      return;
    }

    // Fallback for Desktop browsers where new Notification() constructor is allowed
    try {
      new Notification(title, options);
    } catch (err) {
      // Intentionally suppress Illegal Constructor error on mobile platforms
      console.warn("Desktop Notification constructor not supported on this platform:", err);
    }
  }
};
