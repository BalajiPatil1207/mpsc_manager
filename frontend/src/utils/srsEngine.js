// Spaced Repetition System (SRS) Engine for MPSC Aspirants
// Based on Hermann Ebbinghaus's Forgetting Curve: 1 - 3 - 7 - 15 - 30 Days Rule.

export const SRS_INTERVALS_DAYS = [1, 3, 7, 15, 30];

// High-Yield MPSC Seed Cards to immediately empower active recall
const DEFAULT_SRS_CARDS = [
  {
    id: 'srs_seed_pol_1',
    topicId: 'gk_pol',
    subject: 'राज्यशास्त्र',
    title: 'संविधानातील मूलभूत हक्क (कलम १२ ते ३५)',
    question: 'मूलभूत हक्कातील कलम १४, १९, २१ व ३२ मधील तरतुदी आठवून पहा:',
    keyFacts: [
      'कलम १४: कायद्यापुढे समानता व कायद्याचे समान संरक्षण (अमेरिकेकडून प्रेरित)',
      'कलम १९: भाषण, अभिव्यक्ती, सभा, संघटना, संचार, वास्तव्य या ६ स्वातंत्र्यांची हमी',
      'कलम २१: जीवन व वैयक्तिक स्वातंत्र्याचे रक्षण (Right to Life & Personal Liberty)',
      'कलम २१A: ६ ते १४ वयोगटातील मुलांना मोफत व सक्तीचे शिक्षण (८६ वी घटनादुरुस्ती २००२)',
      'कलम ३२: घटनात्मक उपायांचा अधिकार (डॉ. बाबासाहेब आंबेडकर यांनी याला "संविधानाचा आत्मा" म्हटले)'
    ],
    stage: 2,
    lastReviewedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    dueAt: Date.now() - 1000 // Due today!
  },
  {
    id: 'srs_seed_geo_1',
    topicId: 'gk_geo',
    subject: 'महाराष्ट्र भूगोल',
    title: 'महाराष्ट्रातील प्रमुख शिखरे व घाट',
    question: 'महाराष्ट्रातील सर्वोच्च शिखरांचा उतरता क्रम व महत्त्वाचे घाट कोणते?',
    keyFacts: [
      'कळसूबाई (१६४६ मी) - सर्वोच्च शिखर (अहमदनगर - अकोले तालुका)',
      'साल्हेर (१५६७ मी) - नाशिक जिल्हा (दुसरे सर्वोच्च शिखर)',
      'महाबळेश्वर (१४३८ मी) - सातारा जिल्हा',
      'कसारा (थळ) घाट: मुंबई ते नाशिक महामार्ग जोडतो',
      'बोर (खंडाळा) घाट: मुंबई ते पुणे महामार्ग जोडतो',
      'कुंभार्ली घाट: कराड ते चिपळूण मार्ग जोडतो'
    ],
    stage: 1,
    lastReviewedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    dueAt: Date.now() - 2000 // Due today!
  },
  {
    id: 'srs_seed_his_1',
    topicId: 'gk_his',
    subject: 'इतिहास',
    title: 'महाराष्ट्रातील प्रमुख समाजसुधारक व संस्था',
    question: 'महात्मा फुले, शाहू महाराज व डॉ. आंबेडकर यांच्या महत्त्वाच्या संस्था व कार्य आठवा:',
    keyFacts: [
      'महात्मा जोतीराव फुले: सत्यशोधक समाज (२४ सप्टेंबर १८७३, पुणे); भिडे वाड्यात मुलींची पहिली शाळा (१८४८)',
      'राजर्षी छत्रपती शाहू महाराज: कोल्हापुरात ५०% मागासवर्गीयांना आरक्षण जाहीर (२६ जुलै १९०२); प्राथमिक शिक्षण सक्तीचे (१९१७)',
      'डॉ. बाबासाहेब आंबेडकर: बहिष्कृत हितकारिणी सभा (१९२४); महाडचा चवदार तळे सत्याग्रह (२० मार्च १९२७); काळाराम मंदिर सत्याग्रह (१९३०)'
    ],
    stage: 2,
    lastReviewedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    dueAt: Date.now() - 3000 // Due today!
  },
  {
    id: 'srs_seed_eco_1',
    topicId: 'gk_eco',
    subject: 'अर्थव्यवस्था',
    title: 'RBI व चलनविषयक धोरण (Monetary Policy)',
    question: 'RBI ची स्थापना, रेपो रेट व चलनविषयक समिती (MPC) चे स्वरूप काय आहे?',
    keyFacts: [
      'RBI स्थापना: १ एप्रिल १९३५ (हिल्टन यंग कमिशनच्या शिफारशीनुसार); राष्ट्रीयीकरण: १ जानेवारी १९४९',
      'Repo Rate: RBI ज्या दराने व्यापारी बँकांना अल्पमुदतीचे कर्ज देते',
      'Reverse Repo Rate: व्यापारी बँका ज्या दराने RBI कडे अतिरिक्त पैसे ठेवतात',
      'Monetary Policy Committee (MPC): ६ सदस्य (३ RBI चे + ३ केंद्र सरकारचे नियुक्त); अध्यक्ष RBI गव्हर्नर असतात'
    ],
    stage: 1,
    lastReviewedAt: Date.now() - 24 * 60 * 60 * 1000,
    dueAt: Date.now() - 4000 // Due today!
  },
  {
    id: 'srs_seed_sci_1',
    topicId: 'gk_sci',
    subject: 'सामान्य विज्ञान',
    title: 'जीवनसत्त्वे (Vitamins) व मानवी आजार',
    question: 'प्रमुख जीवनसत्त्वांची शास्त्रीय नावे व अभावामुळे होणारे रोग कोणते?',
    keyFacts: [
      'व्हिटॅमिन A (Retinol): अभावामुळे रातांधळेपणा (Night Blindness) व झेरोप्थॅल्मिया',
      'व्हिटॅमिन B1 (Thiamine): अभावामुळे बेरी-बेरी आजार',
      'व्हिटॅमिन C (Ascorbic Acid): अभावामुळे स्कर्व्ही (हिरड्यांमधून रक्त येणे); आवळ्यात सर्वाधिक असते',
      'व्हिटॅमिन D (Calciferol): अभावामुळे लहान मुलांत मुडदूस (Rickets); सूर्यप्रकाशातून त्वचेत तयार होते',
      'व्हिटॅमिन K (Phylloquinone): रक्त गोठण्यासाठी अत्यंत आवश्यक'
    ],
    stage: 3,
    lastReviewedAt: Date.now() - 7 * 24 * 60 * 60 * 1000,
    dueAt: Date.now() - 5000 // Due today!
  }
];

export const getSrsDeck = () => {
  try {
    const saved = localStorage.getItem('mpsc_srs_deck');
    if (saved && saved !== 'undefined' && saved !== 'null') {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error("Error reading SRS deck:", e);
  }

  // Initialize with seed cards
  localStorage.setItem('mpsc_srs_deck', JSON.stringify(DEFAULT_SRS_CARDS));
  return DEFAULT_SRS_CARDS;
};

export const getDueSrsItems = () => {
  const deck = getSrsDeck();
  const now = Date.now();
  return deck.filter(item => (item.dueAt || 0) <= now);
};

export const reviewSrsItem = (cardId, rating) => {
  const deck = getSrsDeck();
  const now = Date.now();
  let xpEarned = 0;
  let nextStage = 1;

  const updatedDeck = deck.map(item => {
    if (item.id === cardId) {
      const currentStage = item.stage || 1;

      if (rating === 'hard') {
        // Forgot or struggled: Reset to Stage 1, repeat tomorrow
        nextStage = 1;
        xpEarned = 5;
      } else if (rating === 'good') {
        // Recalled well: Move to next stage
        nextStage = Math.min(5, currentStage + 1);
        xpEarned = 15;
      } else if (rating === 'easy') {
        // Easy / Mastered: Jump +2 stages
        nextStage = Math.min(5, currentStage + 2);
        xpEarned = 25;
      }

      const daysToAdd = SRS_INTERVALS_DAYS[Math.min(nextStage - 1, SRS_INTERVALS_DAYS.length - 1)];
      const nextDueAt = now + daysToAdd * 24 * 60 * 60 * 1000;

      return {
        ...item,
        stage: nextStage,
        lastReviewedAt: now,
        dueAt: nextDueAt,
        reviewCount: (item.reviewCount || 0) + 1
      };
    }
    return item;
  });

  // Save deck to localStorage & DB
  localStorage.setItem('mpsc_srs_deck', JSON.stringify(updatedDeck));

  // Add XP
  const oldXp = parseFloat(localStorage.getItem('xp_total')) || 0;
  const newXp = (oldXp + xpEarned).toFixed(2);
  localStorage.setItem('xp_total', newXp);

  import('./dbStore').then(({ saveMultipleToDB }) => {
    saveMultipleToDB({
      mpsc_srs_deck: updatedDeck,
      xp_total: newXp
    });
  });

  return {
    updatedDeck,
    xpEarned,
    nextStage,
    dueItemsCount: updatedDeck.filter(i => (i.dueAt || 0) <= now).length
  };
};

// Register a newly completed daily task into the Spaced Repetition deck
export const addTopicToSrs = ({ topicId, title, subject = 'General', keyFacts = [] }) => {
  const deck = getSrsDeck();
  const now = Date.now();

  const existingIdx = deck.findIndex(i => i.topicId === topicId || i.title === title);
  if (existingIdx !== -1) {
    // Topic already in deck, advance its schedule
    deck[existingIdx].dueAt = now + 1 * 24 * 60 * 60 * 1000; // review in 1 day
    localStorage.setItem('mpsc_srs_deck', JSON.stringify(deck));
    return deck[existingIdx];
  }

  const newCard = {
    id: `srs_${Date.now()}_${topicId || Math.random().toString(36).substring(7)}`,
    topicId: topicId || 'custom',
    subject,
    title,
    question: `${title} या घटकातील महत्त्वाचे मुद्दे व परीक्षाभिमुख तथ्ये आठवून पहा:`,
    keyFacts: keyFacts.length > 0 ? keyFacts : [
      `${title} मधील मूलभूत संकल्पना व व्याख्या`,
      'परीक्षेच्या दृष्टीने संभाव्य विचारले जाणारे प्रश्न व आकडेवारी',
      'चालू घडामोडी किंवा इतर विषयांशी असलेला परस्परसंबंध'
    ],
    stage: 1,
    lastReviewedAt: now,
    dueAt: now + 1 * 24 * 60 * 60 * 1000, // Due in 1 day
    reviewCount: 0
  };

  const updatedDeck = [newCard, ...deck];
  localStorage.setItem('mpsc_srs_deck', JSON.stringify(updatedDeck));

  import('./dbStore').then(({ saveToDB }) => {
    saveToDB('mpsc_srs_deck', updatedDeck);
  });

  return newCard;
};

// Get Retention Health and Stage Stats
export const getSrsStats = () => {
  const deck = getSrsDeck();
  const now = Date.now();
  const dueItems = deck.filter(i => (i.dueAt || 0) <= now);
  const masteredItems = deck.filter(i => i.stage >= 5);

  const stageCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  deck.forEach(i => {
    const st = i.stage || 1;
    stageCounts[st] = (stageCounts[st] || 0) + 1;
  });

  // Retention index: weighted average of stages (Mastery = 100%)
  let totalScore = 0;
  deck.forEach(i => {
    totalScore += (i.stage || 1) * 20; // Stage 1 = 20%, Stage 5 = 100%
  });
  const retentionIndex = deck.length > 0 ? Math.round(totalScore / deck.length) : 0;

  return {
    totalTopics: deck.length,
    dueCount: dueItems.length,
    masteredCount: masteredItems.length,
    retentionIndex,
    stageCounts
  };
};
