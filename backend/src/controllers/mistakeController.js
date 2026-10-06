const { db } = require('../config/firebase');

exports.getMistakes = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const snapshot = await db.collection('mistakeBook').where('userId', '==', userId).get();
    let mistakes = [];
    snapshot.forEach(doc => mistakes.push({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: mistakes });
  } catch(err) {
    next(err);
  }
};

exports.resolveMistake = async (req, res, next) => {
  try {
    const { mistakeId } = req.params;
    await db.collection('mistakeBook').doc(mistakeId).update({ understood: true });
    res.json({ success: true, message: "Mistake marked as understood." });
  } catch(err) {
    next(err);
  }
};
