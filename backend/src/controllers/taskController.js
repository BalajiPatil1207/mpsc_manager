const { db } = require('../config/firebase');

exports.getDailyTasks = async (req, res, next) => {
  try {
    const { userId, date } = req.query;
    if(!userId || !date) return res.status(400).json({ success: false, message: 'userId and date required' });

    const snapshot = await db.collection('dailyTasks')
      .where('userId', '==', userId)
      .where('date', '==', date)
      .get();
      
    if (snapshot.empty) return res.json({ success: true, data: [] });
    
    let tasks = [];
    snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: tasks });
  } catch(err) {
    next(err);
  }
};

exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    await db.collection('dailyTasks').doc(taskId).update({ status });
    res.json({ success: true, message: `Task status updated to ${status}` });
  } catch(err) {
    next(err);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const task = req.body;
    const docRef = await db.collection('dailyTasks').add({
      ...task,
      createdAt: new Date().toISOString()
    });
    res.json({ success: true, taskId: docRef.id, message: "Task created successfully" });
  } catch(err) {
    next(err);
  }
};
