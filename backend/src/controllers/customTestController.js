const { db } = require('../config/firebase');

const webpush = require('web-push');

exports.createTest = async (req, res, next) => {
  try {
    const { title, subject, topic, timeLimit, questions, createdBy, creatorName } = req.body;
    const newTest = { 
      title: title || 'Custom Mock Test', 
      subject: subject || 'General',
      topic: topic || '',
      timeLimit: parseInt(timeLimit) || 15, 
      questions, 
      createdBy: createdBy || 'anonymous', 
      creatorName: creatorName || 'A Student',
      createdAt: new Date().toISOString() 
    };
    const docRef = await db.collection('customTests').add(newTest);
    
    // Broadcast notification to ALL other users!
    try {
       const uName = creatorName || 'A student';
       const subs = await db.collection('pushSubscriptions').get();
       subs.forEach((docSnap) => {
          if (docSnap.id !== createdBy) {
             const { subscription } = docSnap.data();
             const payload = JSON.stringify({
                title: "📚 New Practice Test Available!",
                body: `${uName} just created a new test: "${newTest.title}". Compete and solve it now! 🔥`,
                icon: 'https://cdn-icons-png.flaticon.com/512/3242/3242257.png',
                url: `https://mpsc-manager.vercel.app/test/${docRef.id}`
             });
             webpush.sendNotification(subscription, payload).catch(e => console.error("Broadcast Push Failed"));
          }
       });
    } catch(broadcastErr) {
       console.error("Broadcast error:", broadcastErr);
    }

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
    const { answers, userId, userName, timeTaken } = req.body;
    
    const doc = await db.collection('customTests').doc(testId).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: "Test not found" });
    const test = doc.data();

    let attemptedBy = test.attemptedBy || [];
    if (userId && userId !== 'anonymous' && !attemptedBy.includes(userId)) {
      attemptedBy.push(userId);
    }

    let wrongQuestions = [];
    let correctCount = 0;
    let wrongCount = 0;
    let unattemptedCount = 0;
    
    test.questions.forEach((q, idx) => {
      if (answers[idx] === q.correctOption) {
        correctCount += 1;
      } else if (answers[idx] !== undefined && answers[idx] !== null) {
        wrongQuestions.push(q);
        wrongCount += 1;
      } else {
        unattemptedCount += 1;
      }
    });

    const totalAttempted = correctCount + wrongCount;
    const rawScore = (correctCount * 1) - (wrongCount * 0.25);
    const netScore = Math.max(0, parseFloat(rawScore.toFixed(2)));
    const penalty = parseFloat((wrongCount * 0.25).toFixed(2));
    const accuracy = totalAttempted > 0 ? parseFloat(((correctCount / totalAttempted) * 100).toFixed(1)) : 0;
    const scoreEarned = rawScore;

    // 🔒 ANTI-SPAM & QUALIFICATION LOGIC:
    // रँक मिळवण्यासाठी किमान १ प्रश्न अचूक सोडवून पॉझिटिव्ह नेट स्कोर आवश्यक आहे.
    // रिकाम्या किंवा ० मार्क्सच्या प्रयत्नांना रँक दिली जाणार नाही!
    const isQualified = correctCount > 0 && rawScore > 0 && totalAttempted > 0;

    let leaderboard = Array.isArray(test.leaderboard) ? [...test.leaderboard] : [];
    let userRank = null;

    if (isQualified && userId && userId !== 'anonymous') {
      const candidateName = userName && userName !== 'anonymous' ? userName : 'MPSC Aspirant';
      const existingIdx = leaderboard.findIndex(entry => entry.userId === userId);

      const candidateEntry = {
        userId,
        userName: candidateName,
        netScore,
        grossMarks: correctCount,
        penalty,
        accuracy,
        timeTaken: typeof timeTaken === 'number' ? timeTaken : 0,
        submittedAt: new Date().toISOString()
      };

      if (existingIdx !== -1) {
        const existing = leaderboard[existingIdx];
        // Only update if current score is better or faster
        if (
          netScore > existing.netScore ||
          (netScore === existing.netScore && accuracy > existing.accuracy) ||
          (netScore === existing.netScore && accuracy === existing.accuracy && candidateEntry.timeTaken < (existing.timeTaken || 99999))
        ) {
          leaderboard[existingIdx] = candidateEntry;
        }
      } else {
        leaderboard.push(candidateEntry);
      }

      // 🏆 Strict Ranking:
      // 1. Highest Net Score first
      // 2. Highest Accuracy first
      // 3. Lowest Time Taken (Faster) first
      leaderboard.sort((a, b) => {
        if (b.netScore !== a.netScore) return b.netScore - a.netScore;
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        return (a.timeTaken || 0) - (b.timeTaken || 0);
      });

      // Cap to Top 50 best performers
      leaderboard = leaderboard.slice(0, 50);
      userRank = leaderboard.findIndex(e => e.userId === userId) + 1;
    }

    // Update test doc with latest participant & leaderboard
    const docUpdates = { attemptedBy };
    if (isQualified && userId && userId !== 'anonymous') {
      docUpdates.leaderboard = leaderboard;
    }
    await db.collection('customTests').doc(testId).update(docUpdates);

    // Mistake Mock Generation & Update logic
    let returnMessage = "Test submitted successfully!";
    if (wrongQuestions.length > 0 && !test.isMistakeMock) {
      const existingMistakeDocs = await db.collection('customTests')
        .where('parentTestId', '==', testId)
        .where('createdBy', '==', userId || 'anonymous')
        .where('isMistakeMock', '==', true)
        .get();
        
      if (!existingMistakeDocs.empty) {
         const existingDoc = existingMistakeDocs.docs[0];
         const existingData = existingDoc.data();
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
         returnMessage = `Updated Mistake Mock with ${wrongQuestions.length} new mistakes!`;
      } else {
        const newTest = {
          title: `Mistakes: ${test.title}`,
          subject: `${test.subject || 'General'}`,
          timeLimit: Math.max(wrongQuestions.length, 5),
          questions: wrongQuestions,
          createdBy: userId || 'anonymous',
          createdAt: new Date().toISOString(),
          isMistakeMock: true,
          parentTestId: testId
        };
        await db.collection('customTests').add(newTest);
        returnMessage = `Generated Mistake Mock for revision!`;
      }
    } else if (wrongQuestions.length > 0 && test.isMistakeMock) {
        await db.collection('customTests').doc(testId).update({
            questions: wrongQuestions,
            timeLimit: Math.max(wrongQuestions.length, 5),
            updatedAt: new Date().toISOString()
        });
        returnMessage = `Progress! Only ${wrongQuestions.length} mistakes remain to revise.`;
    } else if (wrongQuestions.length === 0 && test.isMistakeMock) {
        await db.collection('customTests').doc(testId).delete();
        returnMessage = "Perfect Revision! Mistake Mock deleted automatically.";
    }

    res.json({ 
      success: true, 
      message: returnMessage, 
      scoreEarned, 
      netScore,
      correctCount,
      wrongCount,
      unattemptedCount,
      accuracy,
      userRank,
      totalParticipants: leaderboard.length,
      isQualified,
      leaderboard: leaderboard.slice(0, 10), // Top 10 for client
      subject: test.subject 
    });
  } catch(err) {
    next(err);
  }
};

exports.getTestLeaderboard = async (req, res, next) => {
  try {
    const { testId } = req.params;
    const doc = await db.collection('customTests').doc(testId).get();
    if (!doc.exists) return res.status(404).json({ success: false, message: "Test not found" });
    const test = doc.data();
    const leaderboard = Array.isArray(test.leaderboard) ? test.leaderboard : [];
    res.json({ success: true, leaderboard: leaderboard.slice(0, 20), totalParticipants: leaderboard.length });
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
    const { title, subject, timeLimit, topic } = req.body;
    let updateData = {};
    if (title !== undefined) updateData.title = title;
    if (subject !== undefined) updateData.subject = subject;
    if (timeLimit !== undefined) updateData.timeLimit = timeLimit;
    if (topic !== undefined) updateData.topic = topic;
    
    await db.collection('customTests').doc(req.params.testId).update(updateData);
    res.json({ success: true, message: "Test updated successfully" });
  } catch(err) {
    next(err);
  }
};
