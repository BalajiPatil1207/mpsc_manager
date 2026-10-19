// MPSC 2027 Micro-Syllabus Progress Tracker & Mastery Engine
import masterSyllabus from '../data/masterSyllabus.json';

const STORAGE_KEY = 'mpsc_micro_syllabus_progress';

// Helper to generate consistent, deterministic subtopic key
export const getSubtopicKey = (subject, topicName, subtopicName) => {
  return `${subject}__${topicName}__${subtopicName}`.replace(/\s+/g, '_');
};

export const getMicroSyllabusData = (examKey = 'MPSC_RAJYASEVA') => {
  const syllabusObj = masterSyllabus.syllabus || {};
  return syllabusObj[examKey] || syllabusObj['MPSC_RAJYASEVA'] || [];
};

export const getMicroSyllabusProgress = () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved !== 'undefined' && saved !== 'null') {
      const parsed = JSON.parse(saved);
      return {
        studied: parsed.studied || {},
        revised: parsed.revised || {}
      };
    }
  } catch (e) {
    console.error("Error reading micro-syllabus progress:", e);
  }
  return { studied: {}, revised: {} };
};

export const saveMicroSyllabusProgress = (progress) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    import('./dbStore').then(({ saveToDB }) => {
      saveToDB(STORAGE_KEY, progress);
    });
  } catch (e) {
    console.error("Error saving micro-syllabus progress:", e);
  }
};

export const toggleSubtopicStatus = (key, type = 'studied') => {
  const progress = getMicroSyllabusProgress();
  const currentVal = Boolean(progress[type]?.[key]);
  const newVal = !currentVal;

  if (newVal) {
    progress[type][key] = {
      timestamp: Date.now(),
      completed: true
    };
  } else {
    delete progress[type][key];
  }

  saveMicroSyllabusProgress(progress);

  // XP Reward
  let xpEarned = 0;
  if (newVal) {
    xpEarned = type === 'studied' ? 10 : 15;
    const oldXp = parseFloat(localStorage.getItem('xp_total')) || 0;
    const newXp = (oldXp + xpEarned).toFixed(2);
    localStorage.setItem('xp_total', newXp);

    import('./dbStore').then(({ saveToDB }) => {
      saveToDB('xp_total', newXp);
    });
  }

  return {
    progress,
    newVal,
    xpEarned
  };
};

export const getMicroSyllabusStats = (examKey = 'MPSC_RAJYASEVA') => {
  const syllabus = getMicroSyllabusData(examKey);
  const progress = getMicroSyllabusProgress();

  let totalSubtopics = 0;
  let studiedCount = 0;
  let revisedCount = 0;

  const subjectStats = {};

  syllabus.forEach(subItem => {
    const subName = subItem.subject;
    let subTotal = 0;
    let subStudied = 0;
    let subRevised = 0;

    (subItem.topics || []).forEach(topItem => {
      (topItem.subtopics || []).forEach(subtopicName => {
        const key = getSubtopicKey(subName, topItem.name, subtopicName);
        totalSubtopics++;
        subTotal++;

        if (progress.studied[key]) {
          studiedCount++;
          subStudied++;
        }
        if (progress.revised[key]) {
          revisedCount++;
          subRevised++;
        }
      });
    });

    const percent = subTotal > 0 ? Math.round((subStudied / subTotal) * 100) : 0;
    subjectStats[subName] = {
      total: subTotal,
      studied: subStudied,
      revised: subRevised,
      percent,
      priority: subItem.priority || 'medium'
    };
  });

  const overallPercent = totalSubtopics > 0 ? Math.round((studiedCount / totalSubtopics) * 100) : 0;
  const revisionPercent = totalSubtopics > 0 ? Math.round((revisedCount / totalSubtopics) * 100) : 0;

  return {
    totalSubtopics,
    studiedCount,
    revisedCount,
    overallPercent,
    revisionPercent,
    subjectStats
  };
};
