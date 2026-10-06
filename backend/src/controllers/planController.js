const { db } = require('../config/firebase');
const syllabusData = require('../helpers/syllabusHelper');

exports.generatePlan = async (req, res) => {
  const { userId, examId, syllabusKey, targetDate, dailyStudyHours } = req.body;
  
  try {
    const syllabus = syllabusData.syllabus[syllabusKey];
    if (!syllabus) throw new Error("Invalid syllabus key provided");

    let totalTopics = 0;
    syllabus.forEach(sub => totalTopics += sub.topics.length);
    
    const planRef = await db.collection('studyPlans').add({
      userId: userId || 'testUser',
      examId,
      syllabusKey,
      targetDate,
      dailyStudyHours,
      totalTopics,
      status: 'active',
      createdAt: new Date().toISOString()
    });

    res.json({ success: true, planId: planRef.id, message: "Smart 120 Days Plan Generated Successfully!" });
  } catch (error) {
    console.error('Error generating plan:', error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};

exports.getPlan = async (req, res) => {
  try {
    const { userId } = req.params;
    const plansRef = db.collection('studyPlans');
    const snapshot = await plansRef.where('userId', '==', userId).get();
    
    if (snapshot.empty) {
      return res.json({ success: true, hasPlan: false });
    }
    
    let plans = [];
    snapshot.forEach(doc => { plans.push({ id: doc.id, ...doc.data() }) });
    plans.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ success: true, hasPlan: true, plan: plans[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: 'Server Error' });
  }
};
