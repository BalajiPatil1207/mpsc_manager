const { db } = require('../config/firebase');

const SCHEDULE_GROUPS = {
  A: {
    key: 'A',
    name: "गट 'अ' (Day A)",
    daysName: 'सोमवार, बुधवार, शुक्रवार',
    days: [1, 3, 5],
    tasks: [
      { id: 'gk_pol', title: '🏛️ भारतीय राज्यव्यवस्था (Polity)', duration: '2 hr', estimatedMinutes: 120, subject: 'Polity', studyType: 'संकल्पनात्मक + पाठांतर' },
      { id: 'gk_his', title: '📜 आधुनिक भारत व महाराष्ट्र इतिहास (History)', duration: '2 hr', estimatedMinutes: 120, subject: 'History', studyType: 'नोट्स रिव्हिजन' },
      { id: 'gk_ca', title: '📰 चालू घडामोडी (Current Affairs)', duration: '1 hr', estimatedMinutes: 60, subject: 'Current Affairs', studyType: 'ताज्या घडामोडी' },
      { id: 'csat_maths_reasoning', title: '📐 अंकगणित व बुद्धिमत्ता (CSAT Daily)', duration: '1.5 hr', estimatedMinutes: 90, subject: 'CSAT', studyType: 'दररोजचे २०-२५ प्रश्न' }
    ]
  },
  B: {
    key: 'B',
    name: "गट 'ब' (Day B)",
    daysName: 'मंगळवार, गुरुवार, शनिवार',
    days: [2, 4, 6],
    tasks: [
      { id: 'gk_geo', title: '🌍 भूगोल व पर्यावरण (Geography & Environment)', duration: '2 hr', estimatedMinutes: 120, subject: 'Geography', studyType: 'नकाशे व फॅक्ट्स' },
      { id: 'gk_sci', title: '🔬 सामान्य विज्ञान (General Science)', duration: '2 hr', estimatedMinutes: 120, subject: 'Science', studyType: 'फॉर्म्युले, Bio/Phy संकल्पना' },
      { id: 'gk_eco', title: '💰 भारतीय अर्थव्यवस्था (Economics)', duration: '1.5 hr', estimatedMinutes: 90, subject: 'Economics', studyType: 'संकल्पना + चालू बजेट/योजना' },
      { id: 'csat_maths_reasoning', title: '📐 अंकगणित व बुद्धिमत्ता (CSAT Daily)', duration: '1.5 hr', estimatedMinutes: 90, subject: 'CSAT', studyType: 'दररोजचे २०-२५ प्रश्न' }
    ]
  },
  C: {
    key: 'C',
    name: 'रविवार (Sunday Consolidation Day)',
    daysName: 'रविवार',
    days: [0],
    tasks: [
      { id: 'srs_weekly_review', title: '⚡ संपूर्ण आठवड्याची रिव्हिजन (SRS Flashcards)', duration: '2 hr', estimatedMinutes: 120, subject: 'Revision', studyType: 'नवीन काहीही वाचायचे नाही! आठवडा उजळणी' },
      { id: 'sunday_mega_mock', title: '📋 १ फुल मॉक टेस्ट (100 Qs / 200 Marks)', duration: '1.5 hr', estimatedMinutes: 90, subject: 'Mock Test', studyType: 'परीक्षा हॉल वेळेत प्रत्यक्ष सराव' },
      { id: 'mistake_book_audit', title: '📖 मिस्टेक बुक ॲनालिसिस व त्रुटी सुधारणा', duration: '1.5 hr', estimatedMinutes: 90, subject: 'Mistakes', studyType: 'चुकलेल्या प्रश्नांचे सखोल विश्लेषण' },
      { id: 'backlog_recovery', title: '🎯 आठवड्याचा बॅकलॉग भरून काढणे', duration: '1 hr', estimatedMinutes: 60, subject: 'Backlog', studyType: 'आठवड्याची अभ्यास तूट भरून काढणे' }
    ]
  }
};

const getGroupForDate = (dateInput) => {
  let target = new Date();
  if (!dateInput) {
    target.setHours(target.getHours() - 6);
  } else if (typeof dateInput === 'string') {
    if (dateInput.includes('/')) {
      const parts = dateInput.split('/');
      if (parts.length === 3) target = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]), 12, 0, 0);
    } else if (dateInput.includes('-')) {
      const parts = dateInput.split('-');
      if (parts.length === 3) target = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
    } else {
      target = new Date(dateInput);
    }
  } else if (dateInput instanceof Date) {
    target = new Date(dateInput.getTime());
    target.setHours(target.getHours() - 6);
  }

  const day = target.getDay();

  if (day === 0) return SCHEDULE_GROUPS.C;
  if (day === 1 || day === 3 || day === 5) return SCHEDULE_GROUPS.A;
  return SCHEDULE_GROUPS.B;
};

exports.SCHEDULE_GROUPS = SCHEDULE_GROUPS;
exports.getGroupForDate = getGroupForDate;

// GET /api/tasks/schedule - Returns 3+3 alternate schedule details and tasks for a given date
exports.getSchedule = async (req, res, next) => {
  try {
    const { date } = req.query;
    const activeGroup = getGroupForDate(date);

    res.json({
      success: true,
      currentGroup: activeGroup.key,
      groupDetails: activeGroup,
      allGroups: SCHEDULE_GROUPS,
      rules: {
        dailyAnchor: 'अंकगणित व बुद्धिमत्ता (Maths & Reasoning) दररोज १.५ तास सराव',
        groupA: 'सोमवार, बुधवार, शुक्रवार: राज्यव्यवस्था, इतिहास, चालू घडामोडी + CSAT',
        groupB: 'मंगळवार, गुरुवार, शनिवार: भूगोल, विज्ञान, अर्थव्यवस्था + CSAT',
        sunday: 'रविवार: नवीन वाचन पूर्ण बंद! फक्त रिव्हिजन, १ फुल मॉक, मिस्टेक बुक व बॅकलॉग भरून काढणे'
      }
    });
  } catch (err) {
    next(err);
  }
};

exports.getDailyTasks = async (req, res, next) => {
  try {
    const { userId, date } = req.query;
    if (!userId || !date) return res.status(400).json({ success: false, message: 'userId and date required' });

    const snapshot = await db.collection('dailyTasks')
      .where('userId', '==', userId)
      .where('date', '==', date)
      .get();
      
    if (snapshot.empty) {
      // Auto return schedule template for that day
      const activeGroup = getGroupForDate(date);
      const generatedTasks = activeGroup.tasks.map(t => ({
        ...t,
        userId,
        date,
        status: 'pending',
        group: activeGroup.key,
        completed: false
      }));
      return res.json({ success: true, data: generatedTasks, autoGenerated: true, group: activeGroup.key });
    }
    
    let tasks = [];
    snapshot.forEach(doc => tasks.push({ id: doc.id, ...doc.data() }));
    res.json({ success: true, data: tasks });
  } catch (err) {
    next(err);
  }
};

exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    await db.collection('dailyTasks').doc(taskId).update({ 
      status,
      updatedAt: new Date().toISOString()
    });
    res.json({ success: true, message: `Task status updated to ${status}` });
  } catch (err) {
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
  } catch (err) {
    next(err);
  }
};
