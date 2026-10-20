// High-Yield XP & Subject Mastery Engine for MPSC Aspirants
// Reliably tracks, synchronizes, and normalizes XP across all MPSC Core Subjects

export const CORE_MPSC_SUBJECTS = [
  'भारतीय राज्यव्यवस्था',
  'भूगोल',
  'इतिहास',
  'अर्थव्यवस्था',
  'सामान्य विज्ञान',
  'चालू घडामोडी'
];

/**
 * Normalizes any variation of an MPSC subject name into the 7 official core categories
 */
export const canonicalizeSubject = (rawSubject) => {
  if (!rawSubject || typeof rawSubject !== 'string') return 'भारतीय राज्यव्यवस्था';
  const s = rawSubject.toLowerCase().trim();

  // 1. Polity / Constitution / Panchayat Raj
  if (
    s.includes('राज्यव्यवस्था') || 
    s.includes('polity') || 
    s.includes('संविधान') || 
    s.includes('राज्यघटना') || 
    s.includes('पंचायत') ||
    s.includes('प्रशासन') ||
    s.includes('हक्क') ||
    s.includes('कलम')
  ) {
    return 'भारतीय राज्यव्यवस्था';
  }

  // 2. Geography / Maharashtra Geography
  if (
    s.includes('भूगोल') || 
    s.includes('geography') || 
    s.includes('नद्या') || 
    s.includes('सह्याद्री') || 
    s.includes('हवामान') ||
    s.includes('खनिजे') ||
    s.includes('पर्वत') ||
    s.includes('जिल्हा')
  ) {
    return 'भूगोल';
  }

  // 3. History / Freedom Struggle / Reformers
  if (
    s.includes('इतिहास') || 
    s.includes('history') || 
    s.includes('समाजसुधारक') || 
    s.includes('सुधारक') || 
    s.includes('उठाव') ||
    s.includes('स्वातंत्र्य') ||
    s.includes('शिवाजी') ||
    s.includes('पेशवे') ||
    s.includes('सत्याग्रह')
  ) {
    return 'इतिहास';
  }

  // 4. Economics / RBI / Planning / Budget
  if (
    s.includes('अर्थ') || 
    s.includes('econ') || 
    s.includes('rbi') || 
    s.includes('बजेट') || 
    s.includes('दारिद्र्य') || 
    s.includes('योजना') ||
    s.includes('चलन') ||
    s.includes('कर')
  ) {
    return 'अर्थव्यवस्था';
  }

  // 5. General Science / Physics / Chemistry / Biology
  if (
    s.includes('विज्ञान') || 
    s.includes('science') || 
    s.includes('physics') || 
    s.includes('biology') || 
    s.includes('जीवशास्त्र') ||
    s.includes('भौतिक') ||
    s.includes('रसायन') ||
    s.includes('जीवनसत्त्व') ||
    s.includes('प्राणी') ||
    s.includes('वनस्पती')
  ) {
    return 'सामान्य विज्ञान';
  }

  // 6. Current Affairs / GK
  if (
    s.includes('घडामोडी') || 
    s.includes('current') || 
    s.includes('वार्ता') ||
    s.includes('पुरस्कार')
  ) {
    return 'चालू घडामोडी';
  }

  // 7. CSAT / Math / Reasoning / Grammar
  if (
    s.includes('बुद्धिमत्ता') || 
    s.includes('reasoning') || 
    s.includes('गणित') || 
    s.includes('math') || 
    s.includes('csat') ||
    s.includes('अंकगणित') ||
    s.includes('तर्क')
  ) {
    return 'बुद्धिमत्ता';
  }

  return rawSubject.trim();
};

/**
 * Accurately calculates total earned XP for a subject from:
 * 1. Direct localStorage key (xp_${subject})
 * 2. Aliased keys (xp_महाराष्ट्र भूगोल, etc.)
 * 3. Aggregated historical test completions from mpsc_test_history
 */
export const getSubjectXp = (subject) => {
  const canonical = canonicalizeSubject(subject);
  let totalXp = 0;

  // 1. Scan direct and aliased localStorage keys
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('xp_') && key !== 'xp_total') {
        const rawSub = key.replace('xp_', '');
        if (canonicalizeSubject(rawSub) === canonical) {
          const val = parseFloat(localStorage.getItem(key)) || 0;
          totalXp += val;
        }
      }
    }
  } catch (e) {}

  // 2. If 0, scan past test history and hydrate XP
  if (totalXp === 0) {
    try {
      const hist = JSON.parse(localStorage.getItem('mpsc_test_history') || '[]');
      hist.forEach(h => {
        const histSub = canonicalizeSubject(h.subject || h.title || '');
        if (histSub === canonical && typeof h.score === 'number' && h.score > 0) {
          totalXp += h.score;
        } else if (
          (!h.subject || h.subject.toLowerCase().includes('mega') || h.subject.toLowerCase().includes('general')) &&
          h.correctCount > 0
        ) {
          // Distributed portion for mega tests
          totalXp += Number(((h.correctCount * 2) / CORE_MPSC_SUBJECTS.length).toFixed(1));
        }
      });
      // Save hydrated XP so future reads are instant
      if (totalXp > 0) {
        localStorage.setItem(`xp_${subject}`, totalXp.toFixed(1));
      }
    } catch (e) {}
  }

  return Math.round(totalXp);
};

/**
 * Awards XP on test submission:
 * Automatically breaks down questions by subject, assigns XP, and updates localStorage immediately
 */
export const recordTestXp = ({
  testSubject = '',
  testTitle = '',
  questions = [],
  answers = {},
  netScore = 0,
  marksPerCorrect = 2.0
}) => {
  const subjectGains = {};
  let totalGained = 0;

  // 1. Evaluate per-question subject contributions
  if (Array.isArray(questions) && questions.length > 0) {
    questions.forEach((q, visualIdx) => {
      if (answers[visualIdx] === q.correctOption) {
        const qSub = canonicalizeSubject(q.subject || testSubject);
        const gain = marksPerCorrect || 2.0;
        subjectGains[qSub] = (subjectGains[qSub] || 0) + gain;
        totalGained += gain;
      }
    });
  }

  // 2. If single subject test and no questions breakdown, award net score
  if (totalGained === 0 && netScore > 0) {
    const mainSub = canonicalizeSubject(testSubject || testTitle);
    subjectGains[mainSub] = netScore;
    totalGained = netScore;
  }

  // 3. Immediately & synchronously save to localStorage
  const batchUpdates = {};
  Object.keys(subjectGains).forEach(subKey => {
    const currentXp = parseFloat(localStorage.getItem(`xp_${subKey}`)) || 0;
    const updated = Number((currentXp + subjectGains[subKey]).toFixed(1));
    localStorage.setItem(`xp_${subKey}`, updated.toString());
    batchUpdates[`xp_${subKey}`] = updated;
  });

  // 4. Update xp_total
  const currentTotal = parseFloat(localStorage.getItem('xp_total')) || 0;
  const newTotal = Number((currentTotal + totalGained).toFixed(1));
  localStorage.setItem('xp_total', newTotal.toString());
  batchUpdates['xp_total'] = newTotal;

  // 5. Fire window events for instantaneous 0ms UI reactive update
  try {
    window.dispatchEvent(new Event('mpsc_xp_updated'));
    window.dispatchEvent(new Event('storage'));
  } catch (e) {}

  return { totalGained, subjectGains, batchUpdates };
};
