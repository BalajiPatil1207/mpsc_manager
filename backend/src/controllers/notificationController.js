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
                    title: "Pending Study Tasks ⚠️",
                    body: `You still have ${pending} tasks incomplete today. Keep studying, don't break the streak!`,
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

  // Schedule for 10 AM, 12 PM, 3 PM (15:00), 6 PM (18:00), and 9 PM (21:00) IST
  const times = ['0 10 * * *', '0 12 * * *', '0 15 * * *', '0 18 * * *', '0 21 * * *'];
  
  times.forEach(t => {
    cron.schedule(t, () => {
      console.log(`Running Scheduled Push Reminders at ${t}`);
      checkAndSendReminders();
    }, {
      timezone: "Asia/Kolkata"
    });
  });
  
  console.log("Study Notifications Cron Jobs initialized for IST.");
};
