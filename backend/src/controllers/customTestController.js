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

    const isMistakeMockTest = Boolean(test.isMistakeMock || (test.title && test.title.includes('Mistakes:')));

    // 🔒 ANTI-SPAM & QUALIFICATION LOGIC:
    // रँक मिळवण्यासाठी किमान १ प्रश्न अचूक सोडवून पॉझिटिव्ह नेट स्कोर आवश्यक आहे.
    // मिस्टेक मॉक (Mistake Mock) ही केवळ वैयक्तिक रिव्हिजन असल्याने तिच्यावर रँक नसतो!
    const isQualified = !isMistakeMockTest && correctCount > 0 && rawScore > 0 && totalAttempted > 0;

    let userRank = null;
    let globalLeaderboard = [];
    let totalParticipants = 0;

    // 🌐 GLOBAL ALL-TESTS LEADERBOARD UPDATE:
    // प्रत्येक स्वतंत्र टेस्टसाठी वेगळा लीडरबोर्ड न ठेवता सर्व टेस्ट्सचा मिळून एकत्रित महा-लीडरबोर्ड अपडेट केला जातो.
    if (!isMistakeMockTest && isQualified && userId && userId !== 'anonymous') {
      const candidateName = userName && userName !== 'anonymous' ? userName : 'MPSC Aspirant';
      const userRef = db.collection('globalLeaderboard').doc(userId);
      const userDoc = await userRef.get();
      
      let testsMap = {};
      let existingName = candidateName;

      if (userDoc.exists) {
        const uData = userDoc.data();
        testsMap = uData.testsMap || {};
        if (uData.userName && (!userName || userName === 'anonymous')) {
          existingName = uData.userName;
        }
      }

      // Record / update candidate's best result for this specific test
      const existingTest = testsMap[testId];
      if (
        !existingTest || 
        netScore > existingTest.netScore || 
        (netScore === existingTest.netScore && accuracy > existingTest.accuracy)
      ) {
        testsMap[testId] = {
          testId,
          testTitle: test.title || 'MPSC Test',
          netScore,
          grossMarks: correctCount,
          penalty,
          accuracy,
          timeTaken: typeof timeTaken === 'number' ? timeTaken : 0,
          submittedAt: new Date().toISOString()
        };
      }

      // Calculate aggregate cumulative metrics across all tests
      const testEntries = Object.values(testsMap);
      const totalTests = testEntries.length;
      const totalScore = parseFloat(testEntries.reduce((sum, t) => sum + (t.netScore || 0), 0).toFixed(2));
      const totalCorrect = testEntries.reduce((sum, t) => sum + (t.grossMarks || 0), 0);
      const totalPenalty = parseFloat(testEntries.reduce((sum, t) => sum + (t.penalty || 0), 0).toFixed(2));
      const totalAttempts = testEntries.reduce((sum, t) => sum + ((t.grossMarks || 0) + (Math.round((t.penalty || 0) * 4))), 0);
      const overallAccuracy = totalAttempts > 0 ? parseFloat(((totalCorrect / totalAttempts) * 100).toFixed(1)) : accuracy;
      const totalTimeSpent = testEntries.reduce((sum, t) => sum + (t.timeTaken || 0), 0);

      const updatedUserData = {
        userId,
        userName: existingName,
        totalTests,
        totalScore,
        totalCorrect,
        totalPenalty,
        accuracy: overallAccuracy,
        totalTimeSpent,
        testsMap,
        lastActive: new Date().toISOString()
      };

      await userRef.set(updatedUserData, { merge: true });

      // Fetch all users to compute global rank
      const allDocs = await db.collection('globalLeaderboard').get();
      const allUsers = [];
      allDocs.forEach(d => {
        const dData = d.data();
        if (dData && (dData.totalScore > 0 || dData.totalTests > 0)) {
          allUsers.push({
            userId: dData.userId || d.id,
            userName: dData.userName || 'MPSC Aspirant',
            totalScore: dData.totalScore || 0,
            totalTests: dData.totalTests || 0,
            accuracy: dData.accuracy || 0,
            totalTimeSpent: dData.totalTimeSpent || 0,
            lastActive: dData.lastActive
          });
        }
      });

      // Rank across all tests combined:
      allUsers.sort((a, b) => {
        if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
        if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
        if (b.totalTests !== a.totalTests) return b.totalTests - a.totalTests;
        return (a.totalTimeSpent || 0) - (b.totalTimeSpent || 0);
      });

      totalParticipants = allUsers.length;
      userRank = allUsers.findIndex(u => u.userId === userId) + 1;
      globalLeaderboard = allUsers.slice(0, 20);
    }

    // Update test document with participant info
    await db.collection('customTests').doc(testId).update({ attemptedBy });

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
      totalParticipants,
      isQualified,
      leaderboard: globalLeaderboard.slice(0, 10), // Top 10 All-Tests Global Leaderboard
      subject: test.subject 
    });
  } catch(err) {
    next(err);
  }
};

// 🏆 Get Global Cumulative Leaderboard (All tests combined)
exports.getGlobalLeaderboard = async (req, res, next) => {
  try {
    const allDocs = await db.collection('globalLeaderboard').get();
    const allUsers = [];
    allDocs.forEach(d => {
      const dData = d.data();
      if (dData && (dData.totalScore > 0 || dData.totalTests > 0)) {
        allUsers.push({
          userId: dData.userId || d.id,
          userName: dData.userName || 'MPSC Aspirant',
          totalScore: dData.totalScore || 0,
          totalTests: dData.totalTests || 0,
          accuracy: dData.accuracy || 0,
          totalTimeSpent: dData.totalTimeSpent || 0,
          lastActive: dData.lastActive
        });
      }
    });

    allUsers.sort((a, b) => {
      if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
      if (b.accuracy !== a.accuracy) return b.accuracy - a.accuracy;
      if (b.totalTests !== a.totalTests) return b.totalTests - a.totalTests;
      return (a.totalTimeSpent || 0) - (b.totalTimeSpent || 0);
    });

    res.json({
      success: true,
      leaderboard: allUsers.slice(0, 50),
      totalParticipants: allUsers.length
    });
  } catch(err) {
    next(err);
  }
};

exports.getTestLeaderboard = async (req, res, next) => {
  try {
    // Redirect to global leaderboard as leaderboards are now all-tests combined
    return exports.getGlobalLeaderboard(req, res, next);
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
