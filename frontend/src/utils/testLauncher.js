// Smart Test Launcher Engine for MahaPrep OS
// Enables 1-click test launches:
// 1. Practice Test: Matches today's active timetable subjects (unsolved preferred, random fallback)
// 2. Daily Mega Test: Instant launch of today's official 100 Qs Mega Test
// 3. Mock Explorer: Standard navigation to full mock list

import { getScheduleForDate, getLogicalDateString } from './deficitTracker.js';
import { generateDynamicMpscTest } from './dynamicMockGenerator.js';
import { MPSC_SEED_MOCKS } from '../data/mpscMockTestsSeed.js';
import { toast } from 'react-hot-toast';
import axios from 'axios';

// Master PYQ catalog items
export const PYQ_DRILLS = [
  {
    id: 'polity_const_drill',
    title: 'MPSC राज्यघटना: घटनादुरुस्ती व मूलभूत हक्क',
    subject: 'भारतीय राज्यव्यवस्था',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'group_c',
    group: 'A'
  },
  {
    id: 'his_reformers',
    title: 'आधुनिक इतिहास: १८५७ चा उठाव व समाजसुधारक',
    subject: 'इतिहास',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'group_c',
    group: 'A'
  },
  {
    id: 'ca_current_affairs',
    title: 'चालू घडामोडी: महाराष्ट्र व राष्ट्रीय पुरस्कार व योजना',
    subject: 'चालू घडामोडी',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'group_c',
    group: 'A'
  },
  {
    id: 'geo_mh_rivers',
    title: 'महाराष्ट्र भूगोल: सह्याद्री, नद्या व हवामान',
    subject: 'भूगोल',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'group_c',
    group: 'B'
  },
  {
    id: 'sci_physics_bio',
    title: 'सामान्य विज्ञान: भौतिकशास्त्र व जीवशास्त्र संकल्पना',
    subject: 'सामान्य विज्ञान',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'group_c',
    group: 'B'
  },
  {
    id: 'econ_rbi_budget',
    title: 'अर्थव्यवस्था: RBI धोरणे, दारिद्र्य व पंचवार्षिक योजना',
    subject: 'अर्थव्यवस्था',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'group_c',
    group: 'B'
  },
  {
    id: 'csat_reasoning',
    title: 'CSAT बुद्धिमत्ता: तर्कक्षमता व वेन आकृत्या संच',
    subject: 'बुद्धिमत्ता',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'group_c',
    group: 'DAILY'
  },
  {
    id: 'csat_maths',
    title: 'CSAT अंकगणित: शेकडेवारी, नफा-तोटा व काळ-काम-वेग',
    subject: 'अंकगणित',
    questionCount: 15,
    timeLimit: 15,
    markingScheme: 'group_c',
    group: 'DAILY'
  }
];

// Helper to get all solved test IDs
export const getSolvedTestIds = () => {
  try {
    const solved = JSON.parse(localStorage.getItem('mpsc_solved_tests') || '[]');
    const hist = JSON.parse(localStorage.getItem('mpsc_test_history') || '[]');
    return new Set([...solved, ...hist.map(h => h.testId).filter(Boolean)]);
  } catch (e) {
    return new Set();
  }
};

// Check if a test matches today's subjects
export const doesTestMatchTodaySubjects = (test, activeGroupKey) => {
  if (!test) return false;
  if (activeGroupKey === 'C') return true; // Sunday: all subjects eligible

  const text = `${test.subject || ''} ${test.topic || ''} ${test.title || ''}`.toLowerCase();

  const groupAKeywords = [
    'polity', 'राज्यव्यवस्था', 'राज्यघटना', 'संविधान', 'मूलभूत हक्क', 'पंचायत राज',
    'history', 'इतिहास', 'समाजसुधारक', 'स्वातंत्र्य', '१८५७', 'गांधी',
    'current affairs', 'चालू घडामोडी', 'घडामोडी', 'पुरस्कार', 'योजना'
  ];

  const groupBKeywords = [
    'geography', 'भूगोल', 'सह्याद्री', 'नद्या', 'हवामान', 'खनिजे', 'प्राकृतिक',
    'science', 'विज्ञान', 'भौतिकशास्त्र', 'जीवशास्त्र', 'रसायनशास्त्र', 'आरोग्यशास्त्र',
    'economics', 'अर्थव्यवस्था', 'rbi', 'बँकिंग', 'बजेट', 'दारिद्र्य'
  ];

  const csatKeywords = [
    'csat', 'maths', 'math', 'reasoning', 'बुद्धिमत्ता', 'अंकगणित', 'तर्क', 'संख्यामाला'
  ];

  // CSAT is daily anchor for both Group A and Group B
  const isCsat = csatKeywords.some(k => text.includes(k));
  if (isCsat) return true;

  if (activeGroupKey === 'A') {
    return groupAKeywords.some(k => text.includes(k));
  } else if (activeGroupKey === 'B') {
    return groupBKeywords.some(k => text.includes(k));
  }
  return true;
};

// 1. Launch Today's Subject Practice Test
// Randomly picks an unsolved test for today's scheduled subjects, or solved if all done!
export const launchTodayPracticeTest = async (navigate) => {
  const toastId = toast.loading('आजच्या वेळापत्रकानुसार योग्य सराव चाचणी शोधत आहे...');
  try {
    const logicalToday = getLogicalDateString();
    const currentSchedule = getScheduleForDate(logicalToday);
    const solvedSet = getSolvedTestIds();

    // Collect all candidate tests
    let allAvailable = [];

    // A. Cached practice tests
    try {
      const cachedPractice = JSON.parse(localStorage.getItem('mpsc_cached_practice') || '[]');
      if (Array.isArray(cachedPractice)) allAvailable.push(...cachedPractice);
    } catch (e) {}

    // B. Cached mocks
    try {
      const cachedMocks = JSON.parse(localStorage.getItem('mpsc_cached_mocks') || '[]');
      if (Array.isArray(cachedMocks)) allAvailable.push(...cachedMocks);
    } catch (e) {}

    // C. Seed mocks
    if (Array.isArray(MPSC_SEED_MOCKS)) {
      allAvailable.push(...MPSC_SEED_MOCKS);
    }

    // D. Pre-curated PYQ drills
    allAvailable.push(...PYQ_DRILLS);

    // Deduplicate by test ID
    const uniqueMap = new Map();
    allAvailable.forEach(t => {
      const id = t.id || t._id;
      if (id && !uniqueMap.has(id)) uniqueMap.set(id, t);
    });

    const candidates = Array.from(uniqueMap.values()).filter(t => 
      doesTestMatchTodaySubjects(t, currentSchedule.key)
    );

    // Split into unsolved and solved
    const isSolved = (t) => {
      const id = t.id || t._id;
      return solvedSet.has(id) || (Array.isArray(t.attemptedBy) && t.attemptedBy.length > 0);
    };

    const unsolvedTests = candidates.filter(t => !isSolved(t));
    const solvedTests = candidates.filter(t => isSolved(t));

    let selectedTest = null;
    let isReviewingSolved = false;

    if (unsolvedTests.length > 0) {
      // Pick randomly from unsolved tests for today's subjects
      selectedTest = unsolvedTests[Math.floor(Math.random() * unsolvedTests.length)];
    } else if (solvedTests.length > 0) {
      // All done! Pick randomly from solved tests for revision
      selectedTest = solvedTests[Math.floor(Math.random() * solvedTests.length)];
      isReviewingSolved = true;
    }

    // If test is a catalog drill item or needs question generation
    if (selectedTest && (!selectedTest.questions || selectedTest.questions.length === 0)) {
      const origId = selectedTest.id || selectedTest._id;
      const generated = generateDynamicMpscTest({
        subject: selectedTest.subject || 'all',
        questionCount: selectedTest.questionCount || 15,
        markingScheme: selectedTest.markingScheme || 'group_c',
        timeLimit: selectedTest.timeLimit || 15,
        topic: selectedTest.title
      });
      generated.title = selectedTest.title;
      if (origId) {
        generated.id = origId;
        generated._id = origId;
      }
      selectedTest = generated;

      // Save to cache
      try {
        const cachedMocks = JSON.parse(localStorage.getItem('mpsc_cached_mocks') || '[]');
        localStorage.setItem('mpsc_cached_mocks', JSON.stringify([generated, ...cachedMocks]));
      } catch (e) {}
    }

    // Fallback: If no test at all found, dynamically generate for today's group
    if (!selectedTest) {
      const todaySubject = currentSchedule.key === 'A' 
        ? ['भारतीय राज्यव्यवस्था', 'इतिहास', 'चालू घडामोडी', 'बुद्धिमत्ता'][Math.floor(Math.random() * 4)]
        : ['भूगोल', 'सामान्य विज्ञान', 'अर्थव्यवस्था', 'अंकगणित'][Math.floor(Math.random() * 4)];

      selectedTest = generateDynamicMpscTest({
        subject: todaySubject,
        questionCount: 15,
        markingScheme: 'group_c',
        timeLimit: 15,
        topic: `${todaySubject} दैनिक सराव चाचणी`
      });

      try {
        const cachedMocks = JSON.parse(localStorage.getItem('mpsc_cached_mocks') || '[]');
        localStorage.setItem('mpsc_cached_mocks', JSON.stringify([selectedTest, ...cachedMocks]));
      } catch (e) {}
    }

    const testId = selectedTest.id || selectedTest._id;
    const toastMsg = isReviewingSolved 
      ? `🔄 आजचे विषय: ${selectedTest.title || selectedTest.subject} (रिव्हिजन सराव) सुरू होत आहे!`
      : `🎯 आजचे वेळापत्रक: ${selectedTest.title || selectedTest.subject} सराव चाचणी सुरू झाली! 🚀`;

    toast.success(toastMsg, { id: toastId, duration: 4000 });
    navigate(`/test/${testId}`);
  } catch (err) {
    console.error("Launch practice error:", err);
    toast.error('चाचणी सुरू करताना अडचण आली: ' + err.message, { id: toastId });
  }
};

// 2. Launch Today's Mega Test (100 Qs / Daily Challenge)
// One-click instant start of today's Mega Test without manual searching
export const launchTodayMegaTest = async (navigate) => {
  const toastId = toast.loading('आजची दैनिक मेगा टेस्ट शोधत आहे...');
  try {
    const todayIso = new Date().toISOString().split('T')[0];
    const todayMarathiDate = new Date().toLocaleDateString('mr-IN');

    let allMocks = [];
    try {
      const cached = JSON.parse(localStorage.getItem('mpsc_cached_mocks') || '[]');
      if (Array.isArray(cached)) allMocks.push(...cached);
    } catch (e) {}

    if (Array.isArray(MPSC_SEED_MOCKS)) {
      allMocks.push(...MPSC_SEED_MOCKS);
    }

    // Find today's mega test
    let todayMega = allMocks.find(t => {
      const dateMatch = t.formattedDate === todayIso || t.examDate === todayMarathiDate;
      const title = (t.title || '').toLowerCase();
      const topic = (t.topic || '').toLowerCase();
      return dateMatch && (title.includes('mega') || title.includes('दैनिक') || topic.includes('मेगा'));
    });

    // If no test specifically tagged for today, find any full-length / latest mega test
    if (!todayMega) {
      todayMega = allMocks.find(t => {
        const title = (t.title || '').toLowerCase();
        const qCount = t.questions?.length || 0;
        return (title.includes('mega') || title.includes('दैनिक') || title.includes('सर्वसमावेशक') || qCount >= 50);
      });
    }

    // If still not found, generate a fresh 70-100 question Mega Test on the fly!
    if (!todayMega || !todayMega.questions || todayMega.questions.length === 0) {
      todayMega = generateDynamicMpscTest({
        subject: 'all',
        questionCount: 70,
        markingScheme: 'group_c',
        timeLimit: 90,
        topic: 'MPSC सर्वसमावेशक दैनिक मेगा टेस्ट (GS Paper 1)',
        testIndex: 1
      });
      todayMega.title = `🔥 आजची दैनिक मेगा टेस्ट - ${todayMarathiDate}`;

      try {
        const cachedMocks = JSON.parse(localStorage.getItem('mpsc_cached_mocks') || '[]');
        localStorage.setItem('mpsc_cached_mocks', JSON.stringify([todayMega, ...cachedMocks]));
      } catch (e) {}

      // Asynchronously trigger backend generator
      axios.post('https://mpsc-manager.onrender.com/api/custom-tests/mega-generate').catch(() => {});
    }

    const testId = todayMega.id || todayMega._id;
    toast.success(`🔥 आजची दैनिक मेगा टेस्ट सज्ज आहे! सुरू करत आहे... 🚀`, { id: toastId, duration: 4000 });
    navigate(`/test/${testId}`);
  } catch (err) {
    console.error("Launch mega test error:", err);
    toast.error('मेगा टेस्ट सुरू करताना अडचण आली: ' + err.message, { id: toastId });
  }
};
