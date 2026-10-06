const { db } = require('../config/firebase');

exports.createReel = async (req, res, next) => {
  try {
    const { title, subject, cards } = req.body;
    if (!title || !subject || !cards || !Array.isArray(cards)) {
      return res.status(400).json({ success: false, message: 'Invalid data format' });
    }

    const reelData = {
      title,
      subject,
      cards,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('studyReels').add(reelData);
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
