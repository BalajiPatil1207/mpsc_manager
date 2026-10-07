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

const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.generateMegaTest = async (req, res, next) => {
  try {
    let megaQuestions = [];
    
    // Attempt AI Generation first
    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "dummy");
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const prompt = `Generate a 100-question MPSC objective test in Marathi. Format MUST be a strict, valid JSON array.
Breakdown: 30 Maths, 30 Reasoning, 40 GK (Geo, His, Sci, Polity, Eco, CA).
Format:
[
  {
    "question": "question text in marathi",
    "options": ["opt1", "opt2", "opt3", "opt4"],
    "correctOption": 1,
    "subject": "History"
  }
]
Output ONLY raw JSON. No markdown blocks, no text before or after.`;

      const result = await model.generateContent(prompt);
      let text = result.response.text();
      text = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(text);
      
      if(Array.isArray(parsed) && parsed.length > 50) {
         megaQuestions = parsed;
      } else {
         throw new Error("AI returned too few questions");
      }
    } catch(aiErr) {
      console.log("AI Generation failed for Mega Test, falling back to DB pool:", aiErr.message);
      
      // Fallback: Fetch all previous questions from customTests
      const snapshot = await db.collection('customTests').get();
      
      let gkQuestions = [];
      let mathQuestions = [];
      let reasoningQuestions = [];

      snapshot.forEach(doc => {
        const test = doc.data();
        if (test.isMistakeMock) return;

        const testSubject = test.subject ? test.subject.toLowerCase() : '';
        
        test.questions.forEach(q => {
          const qSub = (q.subject || testSubject).toLowerCase();
          
          if (qSub.includes('math') || qSub.includes('गणित')) {
            mathQuestions.push(q);
          } else if (qSub.includes('reasoning') || qSub.includes('बुद्धिमत्ता')) {
            reasoningQuestions.push(q);
          } else {
            gkQuestions.push(q);
          }
        });
      });

      const shuffle = (array) => array.sort(() => 0.5 - Math.random());
      const selectedGk = shuffle(gkQuestions).slice(0, 40);
      const selectedMath = shuffle(mathQuestions).slice(0, 30);
      const selectedReasoning = shuffle(reasoningQuestions).slice(0, 30);

      megaQuestions = [...selectedGk, ...selectedMath, ...selectedReasoning];
    }
    
    if(megaQuestions.length === 0) {
      return res.status(400).json({ success: false, message: 'Not enough custom questions available to generate a Mega Test.'});
    }

    const newTest = {
      title: `🔥 Auto AI Mega Test (${megaQuestions.length} Qs) - ${new Date().toLocaleDateString('mr-IN')}`,
      subject: 'Mega AI Engine (GK, Math, Reasoning)',
      timeLimit: 90, 
      questions: megaQuestions.sort(() => 0.5 - Math.random()), 
      createdBy: 'System Engine',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('customTests').add(newTest);
    res.json({ success: true, testId: docRef.id, message: "100 Q Mega Test Generated successfully!" });
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

    let attemptedBy = test.attemptedBy || [];
    if (userId && userId !== 'anonymous' && !attemptedBy.includes(userId)) {
      attemptedBy.push(userId);
      await db.collection('customTests').doc(testId).update({ attemptedBy });
    }

    let wrongQuestions = [];
    let scoreEarned = 0;
    
    test.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctOption) {
        scoreEarned += 1;
      } else if (answers[idx] !== undefined && answers[idx] !== null) {
        wrongQuestions.push(q);
        scoreEarned -= 0.25;
      }
    });

    if (wrongQuestions.length > 0) {
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
      return res.json({ success: true, message: `Created Mistake Mock Test-${count} for next day revision!`, scoreEarned, subject: test.subject });
    }

    res.json({ success: true, message: "Perfect! No mistakes!", scoreEarned, subject: test.subject });
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
