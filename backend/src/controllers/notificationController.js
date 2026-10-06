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
