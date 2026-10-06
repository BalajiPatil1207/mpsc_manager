const express = require('express');
const cors = require('cors');
require('dotenv').config();

const examRoutes = require('./src/routes/examRoutes');
const planRoutes = require('./src/routes/planRoutes');
const aiRoutes = require('./src/routes/aiRoutes');
const taskRoutes = require('./src/routes/taskRoutes');
const mockTestRoutes = require('./src/routes/mockTestRoutes');
const mistakeRoutes = require('./src/routes/mistakeRoutes');
const userRoutes = require('./src/routes/userRoutes');
const questionRoutes = require('./src/routes/questionRoutes');
const customTestRoutes = require('./src/routes/customTestRoutes');
const reelRoutes = require('./src/routes/reelRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const errorHandler = require('./src/middlewares/errorHandler');
const cron = require('node-cron');
const webpush = require('web-push');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.send('MPSC Study OS API is running 🚀');
});
app.use('/api/exams', examRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/mock-tests', mockTestRoutes);
app.use('/api/mistakes', mistakeRoutes);
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/custom-tests', customTestRoutes);
app.use('/api/reels', reelRoutes);
app.use('/api/notifications', notificationRoutes);

// Setup Web-Push Keys 
webpush.setVapidDetails(
  'mailto:mpsc@mahapep.ai',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// Daily CRON Job for Push Notifications (Scheduled at 9:00 AM)
cron.schedule('0 9 * * *', async () => {
  console.log("CRON: Sending Daily 9 AM Notification...");
  try {
    const { db } = require('./src/config/firebase');
    const snapshot = await db.collection('pushSubscriptions').get();
    
    snapshot.forEach((doc) => {
      const { subscription } = doc.data();
      const payload = JSON.stringify({
        title: '🔔 MahaPrep AI: Daily Challenge Ready!',
        body: 'Your AI-generated Master Test and Mistake Book revisions are unlocked for today. Start practicing now!',
        icon: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
        url: 'http://localhost:5173/'
      });

      webpush.sendNotification(subscription, payload).catch(e => console.error("WebPush Send Failed:", e));
    });
  } catch(e) {
    console.error("Cron Error:", e);
  }
});

// Global Error Handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
