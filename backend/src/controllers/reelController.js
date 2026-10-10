const { db } = require('../config/firebase');

const webpush = require('web-push');

exports.createReel = async (req, res, next) => {
  try {
    const { title, subject, topic, cards, createdBy, creatorName } = req.body;
    if (!title || !subject || !cards || !Array.isArray(cards)) {
      return res.status(400).json({ success: false, message: 'Invalid data format' });
    }

    const reelData = {
      title,
      subject,
      topic: topic || '',
      cards,
      createdBy: createdBy || 'anonymous',
      creatorName: creatorName || 'A Student',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('studyReels').add(reelData);
    
    // Broadcast Reel creation to all other users
    try {
       const uName = creatorName || 'A student';
       const subs = await db.collection('pushSubscriptions').get();
       subs.forEach((docSnap) => {
          if (docSnap.id !== createdBy) {
             const { subscription } = docSnap.data();
             const payload = JSON.stringify({
                title: "📽️ New Study Reel Available!",
                body: `${uName} published a new Flashcard Reel: "${reelData.title}". Swipe and revise now! ✨`,
                icon: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
                url: `https://mpsc-manager.vercel.app/reel/${docRef.id}`
             });
             webpush.sendNotification(subscription, payload).catch(e => console.error("Reel Broadcast Push Failed"));
          }
       });
    } catch(broadcastErr) {
       console.error("Broadcast Reel error:", broadcastErr);
    }

    res.json({ success: true, reelId: docRef.id, message: 'Reel created successfully!' });
  } catch(err) {
    next(err);
  }
};

exports.getAllReels = async (req, res, next) => {
  try {
    const snapshot = await db.collection('studyReels').orderBy('createdAt', 'desc').get();
    let reels = [];
    snapshot.forEach(doc => {
      reels.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, data: reels });
  } catch(err) {
    next(err);
  }
};

exports.getReel = async (req, res, next) => {
  try {
    const doc = await db.collection('studyReels').doc(req.params.reelId).get();
    if (!doc.exists) {
      return res.status(404).json({ success: false, message: 'Reel not found' });
    }
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch(err) {
    next(err);
  }
};

exports.deleteReel = async (req, res, next) => {
  try {
    await db.collection('studyReels').doc(req.params.reelId).delete();
    res.json({ success: true, message: 'Reel deleted successfully' });
  } catch(err) {
    next(err);
  }
};
