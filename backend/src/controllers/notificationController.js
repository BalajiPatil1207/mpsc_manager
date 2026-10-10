const webpush = require('web-push');
const { db } = require('../config/firebase');

webpush.setVapidDetails(
  'mailto:test@example.com',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

exports.subscribe = async (req, res) => {
  const { subscription, userId } = req.body;
  if (!subscription || !userId) return res.status(400).json({ error: 'Missing data' });
  
  await db.collection('pushSubscriptions').doc(userId).set({ subscription });
  res.status(201).json({ success: true });
};

exports.testPush = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });

  try {
    const docSnap = await db.collection('pushSubscriptions').doc(userId).get();
    if (!docSnap.exists) return res.status(404).json({ error: 'No subscription found' });
    
    const { subscription } = docSnap.data();
    const payload = JSON.stringify({
      title: "🧪 Test Notification Successful!",
      body: "If you see this, your live Web Push configuration is 100% working! 🚀",
      icon: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
      badge: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      url: 'https://mpsc-manager.vercel.app/'
    });

    await webpush.sendNotification(subscription, payload);
    res.json({ success: true, message: "Test push sent successfully!" });
  } catch(err) {
    console.error("Test Push Error", err);
    res.status(500).json({ error: err.message });
  }
};

exports.startCronJobs = () => {
  const cron = require('node-cron');
  
  const checkAndSendReminders = async () => {
    try {
      const subs = await db.collection('pushSubscriptions').get();
      subs.forEach(async (docSnap) => {
        const userId = docSnap.id;
        const { subscription } = docSnap.data();
        
        const progressSnap = await db.collection('user_progress').doc(userId).get();
        if (progressSnap.exists) {
           const { user_daily_tasks } = progressSnap.data();
           if (user_daily_tasks && Array.isArray(user_daily_tasks)) {
              const pending = user_daily_tasks.filter(t => !t.completed).length;
              if (pending > 0) {
                 const payload = JSON.stringify({
                    title: "🚨 Study Alert: Tasks Pending!",
                    body: `You have ${pending} tasks incomplete for today. Open MahaPrep OS to catch up now! Consistency is key! 🎯`,
                    icon: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
                    badge: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
                    image: 'https://images.unsplash.com/photo-1506506200949-df4edab4c3ed?auto=format&fit=crop&w=800&q=80',
                    vibrate: [200, 100, 200, 100, 200, 100, 200],
                    data: {
                      dateOfArrival: Date.now(),
                      primaryKey: '2'
                    },
                    url: 'https://mpsc-manager.vercel.app/'
                 });
                 // Send web push via Vapid
                 webpush.sendNotification(subscription, payload).catch(e => console.error("Push Error", e));
              }
           }
        }
      });
    } catch(err) {
      console.error("Cron Task Error: ", err);
    }
  };

  // Routine reminders for pending tasks: 9 AM, 10 AM, 12 PM, 3 PM (15:00), 6 PM (18:00), 9 PM (21:00) IST
  const pendingTimes = ['0 9 * * *', '0 10 * * *', '0 12 * * *', '0 15 * * *', '0 18 * * *', '0 21 * * *'];
  pendingTimes.forEach(t => {
    cron.schedule(t, () => {
      console.log(`Running Pending Reminders at ${t}`);
      checkAndSendReminders();
    }, { timezone: "Asia/Kolkata" });
  });

  // Morning Wakeup: 6 AM IST
  cron.schedule('0 6 * * *', async () => {
     console.log("Running 6 AM Morning Wake-up Push");
     try {
        const subs = await db.collection('pushSubscriptions').get();
        subs.forEach(docSnap => {
           const { subscription } = docSnap.data();
           const payload = JSON.stringify({
              title: "🌅 Good Morning! Today's Tasks are Ready",
              body: "Wake up! Your Daily Mega Test and Mistake Book revisions are unlocked. Start studying now! 📚",
              icon: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
              badge: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
              vibrate: [300, 150, 300, 150, 300],
              url: 'https://mpsc-manager.vercel.app/'
           });
           webpush.sendNotification(subscription, payload).catch(e => {});
        });
     } catch(err) { console.error("6 AM Cron Error", err); }
  }, { timezone: "Asia/Kolkata" });

  // TEST CRON AT 10:05 AM
  cron.schedule('5 10 * * *', async () => {
     console.log("Running 10:05 AM TEST Push");
     try {
        const subs = await db.collection('pushSubscriptions').get();
        subs.forEach(docSnap => {
           const { subscription } = docSnap.data();
           const payload = JSON.stringify({
              title: "🔔 Scheduled Live Test (10:05 AM)",
              body: "If you received this, the timezone and automatic scheduling on the live server are working perfectly!",
              icon: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
              badge: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
              url: 'https://mpsc-manager.vercel.app/'
           });
           webpush.sendNotification(subscription, payload).catch(e => {});
        });
     } catch(err) { }
  }, { timezone: "Asia/Kolkata" });
  
  console.log("Study Notifications Cron Jobs initialized for IST.");
};
