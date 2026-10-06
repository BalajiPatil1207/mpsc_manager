const { db } = require('../config/firebase');

exports.createTest = async (req, res, next) => {
  try {
    const { title, subject, timeLimit, questions, createdBy } = req.body;
    const newTest = { 
      title: title || 'Custom Mock Test', 
      subject: subject || 'General',
      timeLimit: parseInt(timeLimit) || 15, 
      questions, // array containing { question, options, correctOption, subject(optional) }
      createdBy: createdBy || 'anonymous', 
      createdAt: new Date().toISOString() 
    };
    const docRef = await db.collection('customTests').add(newTest);
    res.json({ success: true, testId: docRef.id, message: "Test created successfully!" });
  } catch(err) {
    next(err);
  }
};

exports.getTest = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const doc = await db.collection('customTests').doc(testId).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: "Test not found" });
    res.json({ success: true, data: { id: doc.id, ...doc.data() } });
  } catch(err) {
    next(err);
  }
};

exports.getAllTests = async (req, res, next) => {
  try {
    const snapshot = await db.collection('customTests').orderBy('createdAt', 'desc').get();
    let tests = [];
    snapshot.forEach(doc => tests.push({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: tests });
  } catch(err) {
    next(err);
  }
};

exports.generateMegaTest = async (req, res, next) => {
  try {
    // 1. Fetch all previous questions from customTests
    const snapshot = await db.collection('customTests').get();
    
    let gkQuestions = [];
    let mathQuestions = [];
    let reasoningQuestions = [];

    snapshot.forEach(doc => {
      const test = doc.data();
      const testSubject = test.subject ? test.subject.toLowerCase() : '';
      
      test.questions.forEach(q => {
        // Tag question with test subject if not explicitly defined
        const qSub = (q.subject || testSubject).toLowerCase();
        
        if (qSub.includes('math') || qSub.includes('गणित')) {
          mathQuestions.push(q);
        } else if (qSub.includes('reasoning') || qSub.includes('बुद्धिमत्ता')) {
          reasoningQuestions.push(q);
        } else {
          // Assume GK/GS for everything else
          gkQuestions.push(q);
        }
      });
    });

    // Shuffle helper
    const shuffle = (array) => array.sort(() => 0.5 - Math.random());

    // Select 40 GK, 30 Math, 30 Reasoning
    const selectedGk = shuffle(gkQuestions).slice(0, 40);
    const selectedMath = shuffle(mathQuestions).slice(0, 30);
    const selectedReasoning = shuffle(reasoningQuestions).slice(0, 30);

    const megaQuestions = [...selectedGk, ...selectedMath, ...selectedReasoning];
    
    if(megaQuestions.length === 0) {
      return res.status(400).json({ success: false, message: 'Not enough custom questions available to generate a Mega Test.'});
    }

    // Create the Mega Test
    const newTest = {
      title: `🔥 Automatic Mega Test (100 Qs) - ${new Date().toLocaleDateString('mr-IN')}`,
      subject: 'Mega Test (GK 40, Math 30, Reasoning 30)',
      timeLimit: 90, // 90 Mins for 100 Qs
      questions: shuffle(megaQuestions), // mix them up
      createdBy: 'System Engine',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('customTests').add(newTest);
    res.json({ success: true, testId: docRef.id, message: "100 Q Mega Test Generated!" });
  } catch(err) {
    next(err);
  }
};

exports.submitTest = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const { answers, userId } = req.body;
    
    const doc = await db.collection('customTests').doc(testId).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: "Test not found" });
    const test = doc.data();

    let wrongQuestions = [];
    test.questions.forEach((q, idx) => {
      // Catch wrong attempts
      if (answers[idx] !== undefined && answers[idx] !== q.correctOption) {
        wrongQuestions.push(q);
      }
    });

    if (wrongQuestions.length > 0) {
      // Count previous mistakes
      const mistakeDocs = await db.collection('customTests')
        .where('createdBy', '==', userId || 'anonymous')
        .where('isMistakeMock', '==', true)
        .get();
      
      const count = mistakeDocs.size + 1;
      
      const newTest = {
        title: `Mistake Mock Test - ${count}`,
        subject: `Revision of ${test.title}`,
        timeLimit: Math.max(wrongQuestions.length, 5),
        questions: wrongQuestions,
        createdBy: userId || 'anonymous',
        createdAt: new Date().toISOString(),
        isMistakeMock: true
      };

      await db.collection('customTests').add(newTest);
      return res.json({ success: true, message: `Created Mistake Mock Test-${count} for next day revision!` });
    }

    res.json({ success: true, message: "Perfect! No mistakes!" });
  } catch(err) {
    next(err);
  }
};

exports.deleteTest = async (req, res, next) => {
  try {
    await db.collection('customTests').doc(req.params.testId).delete();
    res.json({ success: true, message: "Test deleted successfully" });
  } catch(err) {
    next(err);
  }
};

exports.updateTest = async (req, res, next) => {
  try {
    const { title, subject, timeLimit } = req.body;
    await db.collection('customTests').doc(req.params.testId).update({
      title, subject, timeLimit
    });
    res.json({ success: true, message: "Test updated successfully" });
  } catch(err) {
    next(err);
  }
};
