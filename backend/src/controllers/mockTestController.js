const { db } = require('../config/firebase');

exports.submitMockTest = async (req, res, next) => {
  try {
    const data = req.body;
    const mockRef = await db.collection('mockTests').add({
       ...data,
       completedAt: new Date().toISOString()
    });
    res.json({ success: true, mockId: mockRef.id, message: "Mock Result Saved!" });
  } catch(err) {
    next(err);
  }
};

exports.getMockResults = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.collection('mockTests').where('userId', '==', userId).get();
    let results = [];
    snapshot.forEach(doc => results.push({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: results });
  } catch(err) {
    next(err);
  }
};
