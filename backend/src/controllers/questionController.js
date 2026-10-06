const { db } = require('../config/firebase');

exports.getQuestionsForTopic = async (req, res, next) => {
  try {
    const { topic, subject } = req.query;
    let query = db.collection('questions');
    
    if (topic) query = query.where('topic', '==', topic);
    if (subject) query = query.where('subject', '==', subject);
    
    const snapshot = await query.limit(25).get();
    let questions = [];
    snapshot.forEach(doc => questions.push({ id: doc.id, ...doc.data() }));
    
    // Dev Mock Fallback if DB is empty
    if(questions.length === 0) {
      questions = [
        {
          id: "q_mock_1",
          question: "Which article deals with Fundamental Rights?",
          options: ["Article 12-35", "Article 36-51", "Article 51A", "Article 1-4"],
          correctAnswerIndex: 0,
          explanation: "Part III of the Indian Constitution (Articles 12-35) deals with Fundamental Rights.",
          subject: "Polity",
          topic: "Fundamental Rights"
        }
      ];
    }
    res.json({ success: true, data: questions });
  } catch(err) {
    next(err);
  }
};
