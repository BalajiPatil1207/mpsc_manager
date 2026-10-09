import toast from 'react-hot-toast';

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) {
    console.log("This browser does not support desktop notification");
    return;
  }
  if (Notification.permission !== "denied") {
    await Notification.requestPermission();
  }
};

export const sendPushNotification = (title, body) => {
  // Show in-app toast (Premium UI)
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

  // Show OS level push notification
  if (Notification.permission === "granted") {
    new Notification(title, {
      body,
      icon: '/vite.svg' // We can replace this with app logo later
    });
  }
};
