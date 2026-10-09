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
    const snapshot = await db.collection('customTests').get();
    
    let gkQuestionsMap = new Map();
    let mathQuestionsMap = new Map();
    let reasoningQuestionsMap = new Map();

    snapshot.forEach(doc => {
      const test = doc.data();
      if (test.isMistakeMock) return;

      const testSubject = test.subject ? test.subject.toLowerCase() : '';
      
      test.questions.forEach(q => {
        if (!q || !q.question) return;
        const qSub = (q.subject || testSubject).toLowerCase();
        
        // Deduplicate using Map based on question text string
        const qText = q.question.trim().toLowerCase();
        
        if (qSub.includes('math') || qSub.includes('गणित')) {
          if(!mathQuestionsMap.has(qText)) mathQuestionsMap.set(qText, q);
        } else if (qSub.includes('reasoning') || qSub.includes('बुद्धिमत्ता')) {
          if(!reasoningQuestionsMap.has(qText)) reasoningQuestionsMap.set(qText, q);
        } else {
          if(!gkQuestionsMap.has(qText)) gkQuestionsMap.set(qText, q);
        }
      });
    });

    const shuffle = (array) => array.sort(() => 0.5 - Math.random());
    const selectedGk = shuffle(Array.from(gkQuestionsMap.values())).slice(0, 40);
    const selectedMath = shuffle(Array.from(mathQuestionsMap.values())).slice(0, 30);
    const selectedReasoning = shuffle(Array.from(reasoningQuestionsMap.values())).slice(0, 30);

    const megaQuestions = [...selectedGk, ...selectedMath, ...selectedReasoning];
    
    if(megaQuestions.length === 0) {
      return res.status(400).json({ success: false, message: 'Not enough custom questions available in database to generate a Mega Test.'});
    }

    const newTest = {
      title: `🔥 Automatic Mega Test (100 Qs) - ${new Date().toLocaleDateString('mr-IN')}`,
      subject: 'Mega Database Engine (GK, Math, Reasoning)',
      timeLimit: 90, 
      questions: shuffle(megaQuestions), 
      createdBy: 'System Engine',
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('customTests').add(newTest);
    res.json({ success: true, testId: docRef.id, message: "100 Q Mega Test Generated successfully from Database!" });
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

    if (wrongQuestions.length > 0 && !test.isMistakeMock) {
      // Check if a mistake mock already exists for this original test
      const existingMistakeDocs = await db.collection('customTests')
        .where('parentTestId', '==', testId)
        .where('createdBy', '==', userId || 'anonymous')
        .where('isMistakeMock', '==', true)
        .get();
        
      if (!existingMistakeDocs.empty) {
         // Append to existing
         const existingDoc = existingMistakeDocs.docs[0];
         const existingData = existingDoc.data();
         
         // Merge questions and deduplicate by question text
         const mergedQuestions = [...existingData.questions];
         wrongQuestions.forEach(wq => {
            if (!mergedQuestions.find(q => q.question === wq.question)) {
               mergedQuestions.push(wq);
            }
         });
         
         await db.collection('customTests').doc(existingDoc.id).update({
            questions: mergedQuestions,
            timeLimit: Math.max(mergedQuestions.length, 5),
            updatedAt: new Date().toISOString()
         });
         
         return res.json({ success: true, message: `Updated Mistake Mock with ${wrongQuestions.length} new mistakes!`, scoreEarned, subject: test.subject });
      } else {
        const newTest = {
          title: `Mistakes: ${test.title}`,
          subject: `${test.subject || 'General'}`, // For subject sorting in Analytics
          timeLimit: Math.max(wrongQuestions.length, 5),
          questions: wrongQuestions,
          createdBy: userId || 'anonymous',
          createdAt: new Date().toISOString(),
          isMistakeMock: true,
          parentTestId: testId
        };
        await db.collection('customTests').add(newTest);
        return res.json({ success: true, message: `Generated Mistake Mock for revision!`, scoreEarned, subject: test.subject });
      }
    } else if (wrongQuestions.length > 0 && test.isMistakeMock) {
        // Auto-remove correctly answered questions by only saving the still-wrong ones!
        await db.collection('customTests').doc(testId).update({
            questions: wrongQuestions,
            timeLimit: Math.max(wrongQuestions.length, 5),
            updatedAt: new Date().toISOString()
        });
        return res.json({ success: true, message: `Progress! Only ${wrongQuestions.length} mistakes remain to revise.`, scoreEarned, subject: test.subject });
    } else if (wrongQuestions.length === 0 && test.isMistakeMock) {
        // If it was a mistake mock and they got everything right, delete it!
        await db.collection('customTests').doc(testId).delete();
        return res.json({ success: true, message: "Perfect Revision! Mistake Mock deleted automatically.", scoreEarned, subject: test.subject });
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
