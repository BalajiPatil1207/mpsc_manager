import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FiTrendingUp, 
  FiPieChart, 
  FiTrendingDown, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiClock, 
  FiRotateCcw, 
  FiAward, 
  FiTarget, 
  FiBarChart2, 
  FiCheck, 
  FiX, 
  FiPlayCircle,
  FiZap,
  FiBookOpen,
  FiCompass,
  FiArrowRight,
  FiActivity
} from 'react-icons/fi';
import { getDeficitState } from '../utils/deficitTracker';
import { getSrsStats } from '../utils/srsEngine';

const Analytics = () => {
  const navigate = useNavigate();
  const [showAllTests, setShowAllTests] = useState(false);
  const [showAllPenalties, setShowAllPenalties] = useState(false);
  const [showAllWeakTopics, setShowAllWeakTopics] = useState(false);

  const [metrics, setMetrics] = useState({
    prepScore: 0,
    syllabusCovered: 0,
    revisionHealth: 0,
    strong: [],
    weak: [],
    testHistory: [],
    totalTestsTaken: 0,
    avgAccuracy: 0,
    totalGrossScore: 0,
    totalPenaltyDeductions: 0,
    totalCorrect: 0,
    totalWrong: 0,
    totalUnattempted: 0,
    subjectStats: [],
    trendTests: [],
    trendStatus: 'STABLE',
    trendDelta: 0,
    avgSecondsPerQ: 48,
    speedStatus: 'OPTIMAL',
    weakTopicHeatmap: [],
    aiInsights: []
  });

  useEffect(() => {
    const daily = JSON.parse(localStorage.getItem('user_daily_tasks') || '[]');
    const pyqs = JSON.parse(localStorage.getItem('practice_pyqs') || '[]');
    const weeklyCompleted = parseInt(localStorage.getItem('weekly_completed')) || 0;
    const testHistory = JSON.parse(localStorage.getItem('mpsc_test_history') || '[]');
    const storedTestsTaken = parseInt(localStorage.getItem('tests_taken')) || 0;
    const storedAccuracy = parseFloat(localStorage.getItem('practice_accuracy')) || 0;
    const cachedMistakes = JSON.parse(localStorage.getItem('mpsc_cached_mistakes') || '[]');
    
    const totalDailyCompleted = daily.filter(t => t.completed).length;
    const currentWeekly = weeklyCompleted + totalDailyCompleted;
    
    // 1. Aggregate metrics from test history
    let totalGrossScore = 0;
    let totalPenaltyDeductions = 0;
    let totalCorrect = 0;
    let totalWrong = 0;
    let totalUnattempted = 0;
    let totalAccuracySum = 0;
    let totalTimeSpent = 0;
    let totalTimedQuestions = 0;

    testHistory.forEach(t => {
      totalGrossScore += (t.grossScore || 0);
      totalPenaltyDeductions += (t.penaltyScore || 0);
      totalCorrect += (t.correctCount || 0);
      totalWrong += (t.wrongCount || 0);
      totalUnattempted += (t.unattemptedCount || 0);
      totalAccuracySum += (t.accuracy || 0);

      const qCount = (t.correctCount || 0) + (t.wrongCount || 0) + (t.unattemptedCount || 0);
      if (t.timeSpentSeconds && t.timeSpentSeconds > 0) {
        totalTimeSpent += t.timeSpentSeconds;
        totalTimedQuestions += Math.max(1, qCount);
      } else if (t.avgSecondsPerQ && t.avgSecondsPerQ > 0) {
        totalTimeSpent += (t.avgSecondsPerQ * Math.max(1, qCount));
        totalTimedQuestions += Math.max(1, qCount);
      }
    });

    const totalTestsTaken = Math.max(testHistory.length, storedTestsTaken);
    const calculatedAvgAccuracy = testHistory.length > 0 
      ? Math.round(totalAccuracySum / testHistory.length) 
      : (storedAccuracy || 0);

    // Speed calculation
    const calculatedAvgSecPerQ = totalTimedQuestions > 0 
      ? Math.round(totalTimeSpent / totalTimedQuestions)
      : (testHistory.length > 0 && testHistory[0].avgSecondsPerQ ? testHistory[0].avgSecondsPerQ : 48);

    let speedStatus = 'OPTIMAL';
    if (calculatedAvgSecPerQ < 32) speedStatus = 'RUSHED';
    else if (calculatedAvgSecPerQ > 65) speedStatus = 'SLOW';

    // 2. Dynamic Spaced Repetition (SRS) Engine metrics
    const srs = getSrsStats();
    const revision = srs.retentionIndex; 
    
    // 3. Subject XP from localStorage
    const subjectXP = {};
    for (let i = 0; i < localStorage.length; i++) {
       const key = localStorage.key(i);
       if (key && key.startsWith('xp_') && key !== 'xp_total') {
          const sub = key.replace('xp_', '');
          subjectXP[sub] = parseFloat(localStorage.getItem(key)) || 0;
       }
    }

    // 4. Subject-wise Accuracy Matrix (Core 7 MPSC Subjects)
    const normalizeSubjectKey = (rawSub) => {
      if (!rawSub) return 'इतर';
      const s = rawSub.toLowerCase();
      if (s.includes('राज्य') || s.includes('polity') || s.includes('संविधान') || s.includes('राज्यव्यवस्था')) return 'भारतीय राज्यव्यवस्था';
      if (s.includes('भूगोल') || s.includes('geography') || s.includes('पर्यावरण') || s.includes('environment')) return 'भूगोल व पर्यावरण';
      if (s.includes('इतिहास') || s.includes('history') || s.includes('समाजसुधारक')) return 'इतिहास';
      if (s.includes('अर्थ') || s.includes('economics') || s.includes('economy')) return 'भारतीय अर्थव्यवस्था';
      if (s.includes('विज्ञान') || s.includes('science') || s.includes('भौतिक') || s.includes('रसायन') || s.includes('जीवशास्त्र')) return 'सामान्य विज्ञान';
      if (s.includes('गणित') || s.includes('बुद्धिमत्ता') || s.includes('math') || s.includes('reasoning') || s.includes('csat')) return 'अंकगणित व बुद्धिमत्ता';
      if (s.includes('चालू') || s.includes('current') || s.includes('घडामोडी')) return 'चालू घडामोडी';
      return 'इतर';
    };

    const subjectStatsMap = {
      'भारतीय राज्यव्यवस्था': { title: 'भारतीय राज्यव्यवस्था', en: 'Polity & Constitution', tests: 0, correct: 0, wrong: 0, unattempted: 0, xp: subjectXP['भारतीय राज्यव्यवस्था'] || subjectXP['Polity'] || 0, icon: '🏛️' },
      'भूगोल व पर्यावरण': { title: 'भूगोल व पर्यावरण', en: 'Geography & Environment', tests: 0, correct: 0, wrong: 0, unattempted: 0, xp: subjectXP['भूगोल'] || subjectXP['Geography'] || 0, icon: '🌍' },
      'इतिहास': { title: 'इतिहास व समाजसुधारक', en: 'History & Social Reformers', tests: 0, correct: 0, wrong: 0, unattempted: 0, xp: subjectXP['इतिहास'] || subjectXP['History'] || 0, icon: '📜' },
      'भारतीय अर्थव्यवस्था': { title: 'भारतीय अर्थव्यवस्था', en: 'Economy & Planning', tests: 0, correct: 0, wrong: 0, unattempted: 0, xp: subjectXP['अर्थव्यवस्था'] || subjectXP['Economics'] || 0, icon: '📈' },
      'सामान्य विज्ञान': { title: 'सामान्य विज्ञान व तंत्रज्ञान', en: 'General Science & Tech', tests: 0, correct: 0, wrong: 0, unattempted: 0, xp: subjectXP['सामान्य विज्ञान'] || subjectXP['Science'] || 0, icon: '🔬' },
      'अंकगणित व बुद्धिमत्ता': { title: 'अंकगणित व बुद्धिमत्ता', en: 'CSAT: Quant & Reasoning', tests: 0, correct: 0, wrong: 0, unattempted: 0, xp: subjectXP['गणित'] || subjectXP['बुद्धिमत्ता'] || subjectXP['CSAT'] || 0, icon: '🔢' },
      'चालू घडामोडी': { title: 'चालू घडामोडी', en: 'Current Affairs & Events', tests: 0, correct: 0, wrong: 0, unattempted: 0, xp: subjectXP['चालू घडामोडी'] || subjectXP['Current Affairs'] || 0, icon: '⚡' },
    };

    testHistory.forEach(t => {
      const normKey = normalizeSubjectKey(t.subject || t.title);
      if (subjectStatsMap[normKey]) {
        subjectStatsMap[normKey].tests += 1;
        subjectStatsMap[normKey].correct += (t.correctCount || 0);
        subjectStatsMap[normKey].wrong += (t.wrongCount || 0);
        subjectStatsMap[normKey].unattempted += (t.unattemptedCount || 0);
      }
    });

    const subjectStats = Object.values(subjectStatsMap).map(sub => {
      const totalAttempted = sub.correct + sub.wrong;
      const accuracy = totalAttempted > 0 
        ? Math.round((sub.correct / totalAttempted) * 100) 
        : (sub.xp > 150 ? 68 : sub.xp > 50 ? 55 : 0);
      
      let mastery = 'NEEDS_WORK';
      if (accuracy >= 68 || sub.xp >= 300) mastery = 'STRONG';
      else if (accuracy >= 45 || sub.xp >= 100) mastery = 'MODERATE';

      return {
        ...sub,
        totalAttempted,
        accuracy,
        mastery
      };
    });

    // 5. Test-to-Test Accuracy Trend (Chronological, last 8 tests)
    const trendTests = [...testHistory]
      .reverse()
      .slice(-8)
      .map((t, idx) => ({
        index: idx + 1,
        title: t.title || `Test #${idx + 1}`,
        date: t.date || '',
        accuracy: Math.round(t.accuracy || 0),
        score: t.score !== undefined ? t.score : 0,
        maxScore: t.maxScore || 100,
        avgSecondsPerQ: t.avgSecondsPerQ || 0
      }));

    let trendStatus = 'STABLE';
    let trendDelta = 0;
    if (trendTests.length >= 2) {
      const firstAcc = trendTests[0].accuracy;
      const lastAcc = trendTests[trendTests.length - 1].accuracy;
      trendDelta = lastAcc - firstAcc;
      if (trendDelta >= 5) trendStatus = 'IMPROVING';
      else if (trendDelta <= -5) trendStatus = 'DECLINING';
      else trendStatus = 'STABLE';
    }

    // 6. Weak Topic Heatmap from Mistakes Book
    const topicErrorCounts = {};
    cachedMistakes.forEach(m => {
      (m.questions || []).forEach(q => {
        const topicName = (q.topic || q.subject || m.subject || 'सामान्य अध्ययन').trim();
        if (!topicErrorCounts[topicName]) {
          topicErrorCounts[topicName] = {
            topic: topicName,
            count: 0,
            subject: m.subject || q.subject || 'General Studies'
          };
        }
        topicErrorCounts[topicName].count += 1;
      });
    });

    const weakTopicHeatmap = Object.values(topicErrorCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(t => {
        let severity = 'MODERATE';
        if (t.count >= 4) severity = 'CRITICAL';
        else if (t.count >= 2) severity = 'HIGH';
        return { ...t, severity };
      });

    // 7. Dynamic AI Coach Insights
    const aiInsights = [];
    if (totalPenaltyDeductions > 5) {
      aiInsights.push({
        type: 'danger',
        icon: '⚠️',
        title: 'निगेटिव्ह मार्किंगमुळे गुण गळती',
        text: `तुमचे एकूण -${totalPenaltyDeductions.toFixed(2)} गुण चुकीच्या उत्तरांमुळे कापले गेले आहेत. खात्री नसलेल्या प्रश्नांमध्ये ५०:५० एलिमिनेशन पद्धत वापरा.`
      });
    }

    if (calculatedAvgSecPerQ > 65) {
      aiInsights.push({
        type: 'warning',
        icon: '⏱️',
        title: 'प्रश्न सोडवण्याचा वेग कमी आहे',
        text: `तुम्हाला एका प्रश्नाला सरासरी ${calculatedAvgSecPerQ} सेकंद लागत आहेत. संयुक्त पूर्व परीक्षेसाठी (१०० प्रश्न / ६० मिनिटे) सरासरी ३६ सेकंदांचा वेग आवश्यक आहे.`
      });
    } else if (calculatedAvgSecPerQ < 32 && calculatedAvgAccuracy < 65) {
      aiInsights.push({
        type: 'warning',
        icon: '⚡',
        title: 'अतिघाईमुळे सिली मिस्टेक्सचा धोका',
        text: `तुमचा वेग खूप जास्त (${calculatedAvgSecPerQ}s/Q) आहे, पण अचूकता ${calculatedAvgAccuracy}% आहे. प्रश्न आणि पर्याय नीट वाचून मगच उत्तर नोंदवा.`
      });
    }

    if (weakTopicHeatmap.length > 0) {
      aiInsights.push({
        type: 'info',
        icon: '🎯',
        title: `सर्वाधिक चुका होणारा घटक: ${weakTopicHeatmap[0].topic}`,
        text: `या घटकामध्ये ${weakTopicHeatmap[0].count} प्रश्न चुकले आहेत. Mistake Book मधून त्वरित या घटकाची रिव्हिजन पूर्ण करा.`
      });
    }

    if (trendStatus === 'IMPROVING') {
      aiInsights.push({
        type: 'success',
        icon: '📈',
        title: 'अचूकतेमध्ये उत्कृष्ट सुधारणा!',
        text: `मागील चाचण्यांच्या तुलनेत तुमची अचूकता +${trendDelta}% ने वाढली आहे. ही सातत्यपूर्ण गती कायम ठेवा!`
      });
    }

    // Strong / Weak Topics based on XP
    const sortedSubjects = Object.entries(subjectXP).sort((a,b) => b[1] - a[1]);
    const strongTopics = sortedSubjects.length > 0 ? sortedSubjects.slice(0, 3).map(s => `${s[0]} (${Math.floor(s[1])} XP)`) : [];
    
    const allKnownSubs = ['भारतीय राज्यव्यवस्था', 'भूगोल', 'इतिहास', 'अर्थव्यवस्था', 'सामान्य विज्ञान', 'गणित', 'बुद्धिमत्ता', 'चालू घडामोडी'];
    const weakTopics = [];
    if (sortedSubjects.length > 3) {
      weakTopics.push(...sortedSubjects.slice(-3).map(s => `${s[0]} (${Math.floor(s[1])} XP)`));
    }
    allKnownSubs.forEach(sub => {
       if (weakTopics.length < 3 && !subjectXP[sub]) {
          weakTopics.push(`${sub} (सराव आवश्यक)`);
       }
    });

    // Preparation Momentum
    const testScoreWeight = Math.min(35, totalTestsTaken * 7);
    const xpTotal = parseFloat(localStorage.getItem('xp_total')) || 0;
    const xpWeight = Math.min(25, Math.round(xpTotal / 12));
    const taskWeight = Math.min(40, Math.round((currentWeekly / 25) * 40));
    const basePrep = testScoreWeight + xpWeight + taskWeight;
    const prep = Math.min(100, Math.max(basePrep, totalTestsTaken > 0 ? 25 : 10));

    // Syllabus Covered
    const pyqCount = pyqs.filter(p => p.completed).length;
    const subjectsWithXP = Object.keys(subjectXP).filter(k => subjectXP[k] > 0).length;
    const syllabus = Math.min(100, Math.round((subjectsWithXP / 8) * 45 + (totalTestsTaken * 5) + (pyqCount * 3) + (prep * 0.15)));
    
    const deficit = getDeficitState();
    const backlogBySubject = {};
    (deficit.backlogTasks || []).forEach(b => {
      const sub = b.subject || 'General';
      backlogBySubject[sub] = (backlogBySubject[sub] || 0) + 1;
    });

    setMetrics({
      prepScore: prep,
      syllabusCovered: syllabus,
      revisionHealth: revision,
      srsStats: srs,
      strong: strongTopics.length > 0 ? strongTopics : ['अजून पुरेसा डेटा उपलब्ध नाही'],
      weak: weakTopics,
      deficitHours: deficit.deficitHours,
      totalPenalties: deficit.totalPenalties,
      backlogCount: deficit.backlogTasks.length,
      backlogBySubject,
      penaltyHistory: deficit.penaltyHistory.slice(0, 5),
      disciplineScore: Math.max(0, Math.round(100 - (deficit.deficitHours * 4))),
      testHistory,
      totalTestsTaken,
      avgAccuracy: calculatedAvgAccuracy,
      totalGrossScore,
      totalPenaltyDeductions,
      totalCorrect,
      totalWrong,
      totalUnattempted,
      subjectStats,
      trendTests,
      trendStatus,
      trendDelta,
      avgSecondsPerQ: calculatedAvgSecPerQ,
      speedStatus,
      weakTopicHeatmap,
      aiInsights
    });
  }, []);

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '50px' }}>
      {/* 🚀 Header & Action CTAs */}
      <div className="flex-row justify-between align-center" style={{ flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 className="heading-gradient" style={{ fontSize: '2.4rem', margin: 0 }}>Analytics Dashboard</h1>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
            विषयनिहाय अचूकता, प्रश्न सोडवण्याचा वेग, निगेटिव्ह मार्किंग ऑडिट आणि प्रगतीचा आलेख
          </p>
        </div>
        <div className="flex-row gap-2" style={{ flexWrap: 'wrap' }}>
          <button 
            onClick={() => navigate('/mistakes')} 
            className="btn"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', background: 'var(--glass-bg)', border: '1px solid var(--border-color)' }}
          >
            <FiBookOpen color="var(--danger)" />
            <span>मिस्टेक बुक (चुका सराव)</span>
          </button>
          <button 
            onClick={() => navigate('/mock')} 
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
          >
            <FiTarget />
            <span>नवीन चाचणी सोडवा</span>
          </button>
        </div>
      </div>

      {/* ⚡ Key Quick Vital Stats (4 Top Cards) */}
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
        <div className="glass-card" style={{ padding: '16px', borderTop: '3px solid var(--accent-primary)' }}>
          <div className="flex-row justify-between align-center">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>सोडवलेल्या चाचण्या</span>
            <FiTarget color="var(--accent-primary)" size={18} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 2px 0' }}>
            {metrics.totalTestsTaken}
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            मॉक टेस्ट्स व PYQ सेशन्स
          </span>
        </div>

        <div className="glass-card" style={{ padding: '16px', borderTop: `3px solid ${metrics.avgAccuracy >= 65 ? 'var(--success)' : metrics.avgAccuracy >= 50 ? 'var(--warning)' : 'var(--danger)'}` }}>
          <div className="flex-row justify-between align-center">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>सरासरी अचूकता (Accuracy)</span>
            <FiActivity color={metrics.avgAccuracy >= 65 ? 'var(--success)' : 'var(--warning)'} size={18} />
          </div>
          <div style={{ 
            fontSize: '1.85rem', 
            fontWeight: 800, 
            color: metrics.avgAccuracy >= 65 ? 'var(--success)' : metrics.avgAccuracy >= 50 ? 'var(--warning)' : 'var(--danger)', 
            margin: '6px 0 2px 0' 
          }}>
            {metrics.avgAccuracy}%
          </div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
            {metrics.avgAccuracy >= 70 ? '🎯 उत्कृष्ट स्ट्राइक रेट' : metrics.avgAccuracy >= 50 ? '⚖️ मध्यम पातळी' : '⚠️ लक्ष देणे आवश्यक'}
          </span>
        </div>

        <div className="glass-card" style={{ padding: '16px', borderTop: '3px solid #3b82f6' }}>
          <div className="flex-row justify-between align-center">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>प्रश्ननिहाय सरासरी वेग</span>
            <FiClock color="#3b82f6" size={18} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '6px 0 2px 0' }}>
            {metrics.avgSecondsPerQ} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>sec/Q</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: metrics.speedStatus === 'OPTIMAL' ? 'var(--success)' : metrics.speedStatus === 'RUSHED' ? 'var(--warning)' : 'var(--danger)', fontWeight: 600 }}>
            {metrics.speedStatus === 'OPTIMAL' ? '✅ योग्य व संतुलित वेग' : metrics.speedStatus === 'RUSHED' ? '⚡ अतिघाई (सिली मिस्टेक्स)' : '⏱️ संथ (वेळ वाढवा)'}
          </span>
        </div>

        <div className="glass-card" style={{ padding: '16px', borderTop: `3px solid ${(metrics.deficitHours || 0) > 0 ? 'var(--danger)' : 'var(--success)'}` }}>
          <div className="flex-row justify-between align-center">
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>अभ्यास तूट (Study Deficit)</span>
            <FiTrendingDown color={(metrics.deficitHours || 0) > 0 ? 'var(--danger)' : 'var(--success)'} size={18} />
          </div>
          <div style={{ fontSize: '1.85rem', fontWeight: 800, color: (metrics.deficitHours || 0) > 0 ? 'var(--danger)' : 'var(--success)', margin: '6px 0 2px 0' }}>
            {metrics.deficitHours || 0} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>तास</span>
          </div>
          <span style={{ fontSize: '0.75rem', color: (metrics.deficitHours || 0) > 0 ? 'var(--danger)' : 'var(--success)', fontWeight: 600 }}>
            {(metrics.deficitHours || 0) > 0 ? '⚠️ बॅकलॉग बाकी आहे' : '🟢 वेळेवर (शून्य तूट)'}
          </span>
        </div>
      </div>

      {/* 🧠 AI Coach Strategic Insights */}
      {metrics.aiInsights && metrics.aiInsights.length > 0 && (
        <div className="glass-panel" style={{ padding: '20px 24px', borderLeft: '4px solid #8b5cf6', background: 'rgba(139, 92, 246, 0.04)' }}>
          <div className="flex-row align-center gap-2 mb-3" style={{ marginBottom: '14px' }}>
            <span style={{ fontSize: '1.3rem' }}>💡</span>
            <h3 style={{ fontSize: '1.1rem', margin: 0, color: 'var(--text-primary)' }}>
              MPSC AI Coach: रणनीतिक सुधारणा सल्लागार (Performance Insights)
            </h3>
          </div>
          <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {metrics.aiInsights.map((insight, idx) => (
              <div 
                key={idx} 
                style={{ 
                  padding: '12px 16px', 
                  borderRadius: '10px', 
                  background: 'var(--glass-bg)', 
                  border: `1px solid ${insight.type === 'danger' ? 'rgba(239,68,68,0.3)' : insight.type === 'warning' ? 'rgba(245,158,11,0.3)' : insight.type === 'success' ? 'rgba(34,197,94,0.3)' : 'rgba(59,130,246,0.3)'}`
                }}
              >
                <div className="flex-row align-center gap-2 mb-1" style={{ marginBottom: '6px' }}>
                  <span>{insight.icon}</span>
                  <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>{insight.title}</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  {insight.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 📊 1. विषयनिहाय अचूकता व प्रावीण्य विश्लेषण (Subject-Wise Accuracy Matrix) */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div className="flex-row justify-between align-center mb-4" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiBarChart2 color="var(--accent-primary)" />
              विषयनिहाय अचूकता व प्रावीण्य विश्लेषण (Subject-Wise Accuracy & Mastery)
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              MPSC च्या प्रमुख ७ विषयांमध्ये तुमचे अचूकता प्रमाण (Accuracy %), XP आणि प्रावीण्य पातळी
            </span>
          </div>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            लक्ष्य: प्रत्येक विषयात ६५%+ अचूकता
          </span>
        </div>

        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {metrics.subjectStats.map((sub, idx) => (
            <div 
              key={idx} 
              className="glass-card" 
              style={{ 
                padding: '16px', 
                display: 'flex', 
                flexDirection: 'column', 
                justifyContent: 'space-between',
                borderLeft: `4px solid ${sub.mastery === 'STRONG' ? 'var(--success)' : sub.mastery === 'MODERATE' ? 'var(--warning)' : 'var(--danger)'}`
              }}
            >
              <div>
                <div className="flex-row justify-between align-center mb-2" style={{ marginBottom: '8px' }}>
                  <div className="flex-row align-center gap-2">
                    <span style={{ fontSize: '1.25rem' }}>{sub.icon}</span>
                    <div>
                      <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)', display: 'block' }}>{sub.title}</strong>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{sub.en}</span>
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontWeight: 700,
                    background: sub.mastery === 'STRONG' ? 'rgba(34,197,94,0.15)' : sub.mastery === 'MODERATE' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                    color: sub.mastery === 'STRONG' ? 'var(--success)' : sub.mastery === 'MODERATE' ? 'var(--warning)' : 'var(--danger)'
                  }}>
                    {sub.mastery === 'STRONG' ? 'प्रबळ 🌟' : sub.mastery === 'MODERATE' ? 'मध्यम ⚖️' : 'सुधारणा हवी 🎯'}
                  </span>
                </div>

                <div className="flex-row justify-between align-center mb-2" style={{ marginBottom: '6px' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>अचूकता (Accuracy)</span>
                  <span style={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 800, 
                    color: sub.accuracy >= 65 ? 'var(--success)' : sub.accuracy >= 45 ? 'var(--warning)' : 'var(--danger)' 
                  }}>
                    {sub.accuracy}%
                  </span>
                </div>

                <div className="progress-container" style={{ height: '8px', marginBottom: '12px' }}>
                  <div 
                    className="progress-bar" 
                    style={{ 
                      width: `${Math.max(5, sub.accuracy)}%`, 
                      background: sub.accuracy >= 65 ? 'var(--success)' : sub.accuracy >= 45 ? 'var(--warning)' : 'var(--danger)' 
                    }} 
                  />
                </div>
              </div>

              <div className="flex-row justify-between align-center" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                <span>सोडवलेल्या चाचण्या: <strong style={{ color: 'var(--text-primary)' }}>{sub.tests}</strong></span>
                <span>कमवलेले: <strong style={{ color: 'var(--accent-primary)' }}>{Math.floor(sub.xp)} XP</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 📈 2. चाचणीनिहाय अचूकता प्रगती आलेख (Test-to-Test Accuracy Trend Chart) */}
      <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid #3b82f6' }}>
        <div className="flex-row justify-between align-center mb-4" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiTrendingUp color="#3b82f6" />
              चाचणीनिहाय अचूकता प्रगती आलेख (Test-to-Test Accuracy Trend)
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              मागील सलग चाचण्यांमधील अचूकता बदल आणि ५०% कटऑफ बेंचमार्क तुलना
            </span>
          </div>

          <div className="flex-row align-center gap-2">
            <span style={{
              padding: '6px 14px',
              borderRadius: '20px',
              fontWeight: 700,
              fontSize: '0.82rem',
              background: metrics.trendStatus === 'IMPROVING' ? 'rgba(34,197,94,0.15)' : metrics.trendStatus === 'DECLINING' ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)',
              color: metrics.trendStatus === 'IMPROVING' ? 'var(--success)' : metrics.trendStatus === 'DECLINING' ? 'var(--danger)' : '#60a5fa',
              border: '1px solid currentColor'
            }}>
              {metrics.trendStatus === 'IMPROVING' ? `प्रगतीपथावर 📈 (+${metrics.trendDelta}%)` : metrics.trendStatus === 'DECLINING' ? `उतार 📉 (${metrics.trendDelta}%)` : 'स्थिर कल 📊'}
            </span>
          </div>
        </div>

        {metrics.trendTests && metrics.trendTests.length > 0 ? (
          <div>
            {/* Visual Bar / Line Graph Representation */}
            <div style={{ 
              background: 'rgba(255, 255, 255, 0.02)', 
              borderRadius: '12px', 
              padding: '24px 16px 16px 16px', 
              border: '1px solid var(--border-color)',
              marginBottom: '16px'
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around', height: '170px', gap: '8px', position: 'relative' }}>
                {/* 50% Cutoff Reference Line */}
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: 0,
                  right: 0,
                  height: '1px',
                  borderTop: '1px dashed rgba(245, 158, 11, 0.5)',
                  zIndex: 1
                }}>
                  <span style={{ position: 'absolute', right: 4, top: -14, fontSize: '0.68rem', color: 'var(--warning)', fontWeight: 600 }}>
                    ५०% कटऑफ बेंचमार्क
                  </span>
                </div>

                {metrics.trendTests.map((t, idx) => {
                  const barHeight = Math.max(12, Math.min(100, t.accuracy));
                  const isPass = t.accuracy >= 50;
                  return (
                    <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end', zIndex: 2 }}>
                      <span style={{ 
                        fontSize: '0.72rem', 
                        fontWeight: 700, 
                        color: t.accuracy >= 65 ? 'var(--success)' : t.accuracy >= 50 ? 'var(--warning)' : 'var(--danger)',
                        marginBottom: '4px' 
                      }}>
                        {t.accuracy}%
                      </span>
                      <div 
                        style={{ 
                          width: '100%', 
                          maxWidth: '44px',
                          height: `${barHeight}%`, 
                          borderRadius: '6px 6px 0 0',
                          background: t.accuracy >= 65 ? 'linear-gradient(180deg, #22c55e 0%, rgba(34,197,94,0.3) 100%)' : t.accuracy >= 50 ? 'linear-gradient(180deg, #f59e0b 0%, rgba(245,158,11,0.3) 100%)' : 'linear-gradient(180deg, #ef4444 0%, rgba(239,68,68,0.3) 100%)',
                          transition: 'height 0.4s ease'
                        }} 
                        title={`${t.title} (${t.date}): ${t.accuracy}% गुण: ${t.score}/${t.maxScore}`}
                      />
                      <span style={{ 
                        fontSize: '0.68rem', 
                        color: 'var(--text-muted)', 
                        marginTop: '6px', 
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        maxWidth: '56px',
                        textAlign: 'center'
                      }}>
                        T#{idx + 1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>
              💡 नियमित सरावामुळे प्रत्येक चाचणीत अचूकता किमान ५५-६५% च्या वर ठेवणे हे पूर्व परीक्षा उत्तीर्ण होण्यासाठी निर्णायक ठरते.
            </p>
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
            अजून पुरेसा चाचणी इतिहास उपलब्ध नाही. पहिली मॉक टेस्ट सोडवा!
          </div>
        )}
      </div>

      {/* ⏱️ 3. प्रश्ननिहाय वेळ व वेग विश्लेषण (Speed & Time-Per-Question Audit) */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div className="flex-row justify-between align-center mb-4" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiClock color="var(--accent-primary)" />
              प्रश्ननिहाय वेळ व वेग विश्लेषण (Time-Per-Question Speed Audit)
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              MPSC च्या परीक्षा स्वरूपानुसार वेळेचे व्यवस्थापन आणि प्रति प्रश्न लागणारा सरासरी वेळ
            </span>
          </div>
        </div>

        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Candidate Speed Card */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
              ⚡ तुमचा वास्तविक वेग (Your Actual Pace)
            </h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '8px' }}>
              <span style={{ fontSize: '2.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                {metrics.avgSecondsPerQ}
              </span>
              <span style={{ fontSize: '1.1rem', color: 'var(--text-muted)' }}>सेकंद / प्रश्न</span>
            </div>

            <div style={{ 
              padding: '8px 12px', 
              borderRadius: '8px', 
              background: metrics.speedStatus === 'OPTIMAL' ? 'rgba(34,197,94,0.1)' : 'rgba(245,158,11,0.1)',
              color: metrics.speedStatus === 'OPTIMAL' ? 'var(--success)' : 'var(--warning)',
              fontSize: '0.85rem',
              fontWeight: 700,
              marginBottom: '16px'
            }}>
              {metrics.speedStatus === 'OPTIMAL' ? '🎯 आदर्श आणि संतुलित वेग' : metrics.speedStatus === 'RUSHED' ? '⚡ अतिघाई (सिली मिस्टेक्सचा धोका)' : '⏱️ संथ वेग (वेळ वाढवण्याची गरज)'}
            </div>

            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              १०० प्रश्नांच्या संपूर्ण पेपरमध्ये तुम्हाला अंदाजे <strong style={{ color: 'var(--text-primary)' }}>{Math.round((metrics.avgSecondsPerQ * 100) / 60)} मिनिटे</strong> लागतील.
            </p>
          </div>

          {/* MPSC Official Benchmarks Comparison */}
          <div className="glass-card" style={{ padding: '20px' }}>
            <h3 style={{ fontSize: '1rem', margin: '0 0 16px 0', color: 'var(--text-primary)' }}>
              🎯 MPSC अधिकृत परीक्षा निकष (Exam Benchmarks)
            </h3>

            <div className="flex-col gap-3">
              <div>
                <div className="flex-row justify-between mb-1" style={{ fontSize: '0.82rem' }}>
                  <span>संयुक्त गट 'ब' व 'क' (१०० प्रश्न / ६० मिनिटे)</span>
                  <strong style={{ color: '#3b82f6' }}>३६ सेकंद / प्रश्न</strong>
                </div>
                <div className="progress-container" style={{ height: '8px' }}>
                  <div className="progress-bar" style={{ width: '36%', background: '#3b82f6' }} />
                </div>
              </div>

              <div>
                <div className="flex-row justify-between mb-1" style={{ fontSize: '0.82rem' }}>
                  <span>राज्यसेवा GS-1 (१०० प्रश्न / १२० मिनिटे)</span>
                  <strong style={{ color: 'var(--success)' }}>७२ सेकंद / प्रश्न</strong>
                </div>
                <div className="progress-container" style={{ height: '8px' }}>
                  <div className="progress-bar" style={{ width: '72%', background: 'var(--success)' }} />
                </div>
              </div>

              <div>
                <div className="flex-row justify-between mb-1" style={{ fontSize: '0.82rem' }}>
                  <span>CSAT बुद्धिमत्ता व गणित (८० प्रश्न / १२० मिनिटे)</span>
                  <strong style={{ color: 'var(--warning)' }}>९० सेकंद / प्रश्न</strong>
                </div>
                <div className="progress-container" style={{ height: '8px' }}>
                  <div className="progress-bar" style={{ width: '90%', background: 'var(--warning)' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 🔥 4. कमकुवत घटक व निगेटिव्ह गुणांचे हॉटस्पॉट्स (Weak Topic Heatmap) */}
      <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--danger)' }}>
        <div className="flex-row justify-between align-center mb-4" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiAlertTriangle color="var(--danger)" />
              कमकुवत घटक व निगेटिव्ह गुणांचे हॉटस्पॉट्स (Weak Topic Heatmap)
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Mistake Book मधील वारंवार चुकणारे प्रश्न आणि सर्वाधिक गुण कापले जाणारे उपघटक
            </span>
          </div>

          <button 
            onClick={() => navigate('/mistakes')} 
            className="btn btn-primary"
            style={{ fontSize: '0.85rem', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <span>मिस्टेक बुक रिव्हिजन</span>
            <FiArrowRight />
          </button>
        </div>

        {metrics.weakTopicHeatmap && metrics.weakTopicHeatmap.length > 0 ? (
          <div>
            <div 
              className="dashboard-grid" 
              style={{ 
                gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', 
                gap: '14px',
                maxHeight: showAllWeakTopics ? '360px' : 'none',
                overflowY: showAllWeakTopics ? 'auto' : 'visible',
                paddingRight: showAllWeakTopics ? '4px' : '0'
              }}
            >
              {(showAllWeakTopics ? metrics.weakTopicHeatmap : metrics.weakTopicHeatmap.slice(0, 4)).map((t, idx) => (
                <div 
                  key={idx} 
                  className="glass-card" 
                  style={{ 
                    padding: '16px', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    background: t.severity === 'CRITICAL' ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.04)',
                    border: `1px solid ${t.severity === 'CRITICAL' ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.2)'}`
                  }}
                >
                  <div>
                    <span style={{ 
                      fontSize: '0.68rem', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      background: t.severity === 'CRITICAL' ? 'rgba(239,68,68,0.2)' : 'rgba(245,158,11,0.2)',
                      color: t.severity === 'CRITICAL' ? 'var(--danger)' : 'var(--warning)',
                      fontWeight: 700,
                      display: 'inline-block',
                      marginBottom: '6px'
                    }}>
                      {t.severity === 'CRITICAL' ? '🔴 तातडीचे लक्ष' : '🟠 सराव हवा'}
                    </span>
                    <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)', display: 'block' }}>
                      {t.topic}
                    </strong>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {t.subject}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--danger)' }}>
                      {t.count}
                    </div>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>चुकलेले प्रश्न</span>
                  </div>
                </div>
              ))}
            </div>

            {metrics.weakTopicHeatmap.length > 4 && (
              <button 
                onClick={() => setShowAllWeakTopics(prev => !prev)}
                className="btn"
                style={{
                  width: '100%',
                  marginTop: '12px',
                  padding: '8px',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                {showAllWeakTopics ? 'कमी घटक दाखवा 🔼' : `सर्व ${metrics.weakTopicHeatmap.length} कमकुवत घटक पहा (स्क्रोल करा) 🔽`}
              </button>
            )}
          </div>
        ) : (
          <div style={{ 
            textAlign: 'center', 
            padding: '24px', 
            background: 'rgba(34, 197, 94, 0.05)', 
            borderRadius: '12px',
            border: '1px solid rgba(34, 197, 94, 0.2)'
          }}>
            <span style={{ fontSize: '1.8rem', display: 'block', marginBottom: '6px' }}>🎉</span>
            <strong style={{ color: 'var(--success)', display: 'block', marginBottom: '4px' }}>सध्या एकही कमकुवत हॉटस्पॉट नोंदवलेला नाही!</strong>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              तुम्ही टेस्ट सोडवल्यावर चुकलेले प्रश्न येथे आपोआप वर्गीकृत केले जातील.
            </span>
          </div>
        )}
      </div>

      {/* Overall Performance */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '24px' }}>🎯 Overall Performance (अभ्यास प्रगती)</h2>
        <div className="flex-col gap-6">
          <div>
            <div className="flex-row justify-between mb-2" style={{ marginBottom: '8px' }}>
              <span>Preparation Momentum (तयारीचा वेग)</span>
              <span style={{ fontWeight: 600 }}>{metrics.prepScore}%</span>
            </div>
            <div className="progress-container" style={{ height: '12px' }}>
              <div className="progress-bar" style={{ width: `${metrics.prepScore}%` }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex-row justify-between mb-2" style={{ marginBottom: '8px' }}>
              <span>Syllabus Covered (पूर्ण अभ्यासक्रम)</span>
              <span style={{ fontWeight: 600 }}>{metrics.syllabusCovered}%</span>
            </div>
            <div className="progress-container" style={{ height: '12px' }}>
              <div className="progress-bar" style={{ width: `${metrics.syllabusCovered}%`, background: 'var(--info)' }}></div>
            </div>
          </div>
          
          <div>
            <div className="flex-row justify-between mb-2" style={{ marginBottom: '8px' }}>
              <span>Revision Health (पुनरावलोकन क्षमता)</span>
              <span style={{ fontWeight: 600 }}>{metrics.revisionHealth}%</span>
            </div>
            <div className="progress-container" style={{ height: '12px' }}>
              <div className="progress-bar" style={{ width: `${metrics.revisionHealth}%`, background: 'var(--warning)' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 MPSC चाचणी व सराव विश्लेषण (MPSC Mock Test & PYQ Performance Audit) */}
      <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--accent-primary)' }}>
        <div className="flex-row justify-between align-center" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiTarget color="var(--accent-primary)" />
              MPSC सराव चाचणी व अचूकता विश्लेषण (Mock Test & PYQ Audit)
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              तुम्ही सोडवलेल्या सर्व मॉक टेस्ट्स, PYQs, गुण आणि नकारात्मक वजावटीचे अधिकृत विश्लेषण
            </span>
          </div>
          <span style={{
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'var(--accent-glow)',
            color: 'var(--accent-primary)',
            fontWeight: 700,
            fontSize: '0.85rem',
            border: '1px solid var(--accent-primary)'
          }}>
            {metrics.totalTestsTaken > 0 ? `${metrics.totalTestsTaken} चाचण्या पूर्ण` : 'पहिली चाचणी बाकी'}
          </span>
        </div>

        {/* 4 Performance Metric Cards */}
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>एकूण सोडवलेल्या चाचण्या</span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--text-primary)', margin: '4px 0' }}>
              {metrics.totalTestsTaken}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              मॉक टेस्ट्स व PYQ सराव
            </span>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>सरासरी अचूकता (Accuracy)</span>
            <div style={{ 
              fontSize: '1.85rem', 
              fontWeight: 800, 
              color: metrics.avgAccuracy >= 70 ? 'var(--success)' : metrics.avgAccuracy >= 50 ? 'var(--warning)' : 'var(--danger)', 
              margin: '4px 0' 
            }}>
              {metrics.avgAccuracy}%
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {metrics.avgAccuracy >= 70 ? 'उत्कृष्ट स्ट्राइक रेट 🎯' : metrics.avgAccuracy >= 50 ? 'मध्यम पातळी' : 'सुधारणेची गरज'}
            </span>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>बरोबर उत्तरांचे गुण (Gross)</span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--success)', margin: '4px 0' }}>
              +{metrics.totalGrossScore.toFixed(1)}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              एकूण अचूक उत्तरांचे गुण
            </span>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center', borderTop: '3px solid var(--danger)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>नकारात्मक गुण वजावट</span>
            <div style={{ fontSize: '1.85rem', fontWeight: 800, color: 'var(--danger)', margin: '4px 0' }}>
              -{metrics.totalPenaltyDeductions.toFixed(2)}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600 }}>
              -0.66 / -0.25 मुळे कापलेले गुण
            </span>
          </div>
        </div>

        {/* Negative Marking Impact Bar */}
        {(metrics.totalCorrect > 0 || metrics.totalWrong > 0) && (
          <div style={{ 
            padding: '16px 20px', 
            background: 'rgba(239, 68, 68, 0.05)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            borderRadius: '14px', 
            marginBottom: '24px' 
          }}>
            <div className="flex-row justify-between align-center" style={{ marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                ⚖️ MPSC निगेटिव्ह मार्किंग प्रभाव (Answer Accuracy Ratio)
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                अचूक: {metrics.totalCorrect} | चुकीचे: {metrics.totalWrong} | न सोडवलेले: {metrics.totalUnattempted}
              </span>
            </div>
            <div style={{ display: 'flex', height: '10px', borderRadius: '5px', overflow: 'hidden', background: 'rgba(255,255,255,0.08)', marginBottom: '8px' }}>
              <div style={{ 
                width: `${(metrics.totalCorrect / Math.max(1, metrics.totalCorrect + metrics.totalWrong + metrics.totalUnattempted)) * 100}%`, 
                background: 'var(--success)' 
              }} title={`बरोबर: ${metrics.totalCorrect}`} />
              <div style={{ 
                width: `${(metrics.totalWrong / Math.max(1, metrics.totalCorrect + metrics.totalWrong + metrics.totalUnattempted)) * 100}%`, 
                background: 'var(--danger)' 
              }} title={`चुकीचे: ${metrics.totalWrong}`} />
              <div style={{ 
                width: `${(metrics.totalUnattempted / Math.max(1, metrics.totalCorrect + metrics.totalWrong + metrics.totalUnattempted)) * 100}%`, 
                background: 'rgba(255,255,255,0.2)' 
              }} title={`न सोडवलेले: ${metrics.totalUnattempted}`} />
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              💡 <strong style={{ color: 'var(--text-primary)' }}>MPSC परीक्षेचा नियम:</strong> राज्यसेवेत प्रत्येक चुकीच्या उत्तराला -०.६६ आणि संयुक्त गट ब व क मध्ये -०.२५ वजा होतात. खात्री नसलेले प्रश्न सोडवणे टाळल्यास तुमचा कटऑफ रँक वाढेल!
            </p>
          </div>
        )}

        {/* Recent Test Attempts List */}
        <div>
          <div className="flex-row justify-between align-center" style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '1.05rem', margin: 0, color: 'var(--text-primary)' }}>
              📋 मागील चाचण्यांची कामगिरी (Recent Test Results)
            </h3>
            <button 
              onClick={() => navigate('/practice')} 
              className="btn" 
              style={{ fontSize: '0.8rem', padding: '4px 12px', background: 'var(--glass-bg)', color: 'var(--accent-primary)', border: '1px solid var(--border-color)' }}
            >
              सराव दालन →
            </button>
          </div>

          {metrics.testHistory && metrics.testHistory.length > 0 ? (
            <div>
              <div 
                className="flex-col gap-3"
                style={{
                  maxHeight: showAllTests ? '400px' : 'none',
                  overflowY: showAllTests ? 'auto' : 'visible',
                  paddingRight: showAllTests ? '6px' : '0'
                }}
              >
                {(showAllTests ? metrics.testHistory : metrics.testHistory.slice(0, 4)).map((t, idx) => (
                  <div 
                    key={idx} 
                    className="glass-card" 
                    style={{ 
                      padding: '14px 18px', 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center', 
                      flexWrap: 'wrap', 
                      gap: '12px',
                      borderLeft: `4px solid ${t.accuracy >= 65 ? 'var(--success)' : t.accuracy >= 45 ? 'var(--warning)' : 'var(--danger)'}`
                    }}
                  >
                    <div className="flex-col gap-1" style={{ flex: '1 1 200px' }}>
                      <div className="flex-row align-center gap-2">
                        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {t.title || 'MPSC Test'}
                        </span>
                        <span style={{ 
                          fontSize: '0.7rem', 
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          background: t.markingScheme === 'group_c' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: t.markingScheme === 'group_c' ? '#60a5fa' : '#f59e0b',
                          fontWeight: 700
                        }}>
                          {t.markingScheme === 'group_c' ? 'गट क +1/-0.25' : 'राज्यसेवा +2/-0.66'}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {t.subject || 'सामान्य अध्ययन'} • {t.date}
                      </span>
                    </div>

                    <div className="flex-row align-center gap-4" style={{ flexWrap: 'wrap' }}>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>मिळालेले गुण</span>
                        <strong style={{ fontSize: '1.15rem', color: t.score > 0 ? 'var(--success)' : 'var(--text-primary)' }}>
                          {t.score !== undefined ? t.score : 0} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/ {t.maxScore || 0}</span>
                        </strong>
                      </div>

                      <div style={{ 
                        padding: '6px 12px', 
                        borderRadius: '8px', 
                        background: t.accuracy >= 65 ? 'rgba(34, 197, 94, 0.15)' : t.accuracy >= 45 ? 'rgba(245, 158, 11, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                        color: t.accuracy >= 65 ? 'var(--success)' : t.accuracy >= 45 ? 'var(--warning)' : 'var(--danger)',
                        fontWeight: 800,
                        fontSize: '0.9rem',
                        textAlign: 'center'
                      }}>
                        {t.accuracy || 0}%
                        <span style={{ display: 'block', fontSize: '0.65rem', fontWeight: 600 }}>अचूकता</span>
                      </div>

                      <button 
                        onClick={() => navigate(t.testId ? `/test/${t.testId}` : '/mock')} 
                        className="btn" 
                        style={{ 
                          padding: '6px 12px', 
                          fontSize: '0.75rem', 
                          background: 'var(--glass-bg)', 
                          color: 'var(--text-primary)', 
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px'
                        }}
                      >
                        पुन्हा सोडवा
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {metrics.testHistory.length > 4 && (
                <button 
                  onClick={() => setShowAllTests(prev => !prev)}
                  className="btn"
                  style={{
                    width: '100%',
                    marginTop: '12px',
                    padding: '8px 14px',
                    background: 'var(--glass-bg)',
                    border: '1px solid var(--border-color)',
                    fontSize: '0.82rem',
                    color: 'var(--text-secondary)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                >
                  {showAllTests ? 'कमी चाचण्या दाखवा 🔼' : `सर्व ${metrics.testHistory.length} चाचण्या पहा (स्क्रोल करा) 🔽`}
                </button>
              )}
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '30px 20px', 
              background: 'rgba(255, 255, 255, 0.02)', 
              borderRadius: '12px',
              border: '1px dashed var(--border-color)'
            }}>
              <span style={{ fontSize: '2.2rem', display: 'block', marginBottom: '8px' }}>📝</span>
              <h4 style={{ margin: '0 0 4px 0', color: 'var(--text-primary)', fontSize: '1.05rem' }}>अजून कोणतीही टेस्ट सोडवलेली नाही</h4>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                मॉक टेस्ट किंवा आजचा Assigned PYQ संच सोडवा, तुमचे अचूकता विश्लेषण येथे आपोआप दिसेल!
              </p>
              <div className="flex-row gap-3 justify-center">
                <button onClick={() => navigate('/practice')} className="btn btn-primary" style={{ fontSize: '0.85rem', padding: '8px 16px' }}>
                  🔥 आजचे PYQs सोडवा
                </button>
                <button onClick={() => navigate('/mock')} className="btn" style={{ fontSize: '0.85rem', padding: '8px 16px', background: 'var(--glass-bg)' }}>
                  🎯 मॉक टेस्ट्स पहा
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Study Deficit & XP Penalty Report - "माझा अभ्यास किती कमी पडत आहे?" */}
      <div className="glass-panel" style={{ padding: '24px', borderLeft: (metrics.deficitHours || 0) > 0 ? '4px solid var(--danger)' : '4px solid var(--success)' }}>
        <div className="flex-row justify-between align-center" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiTrendingDown color={(metrics.deficitHours || 0) > 0 ? 'var(--danger)' : 'var(--success)'} />
              अभ्यास तूट व XP पेनल्टी विश्लेषण (Study Deficit Audit)
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              ज्या दिवशी अभ्यास झाला नाही त्या दिवसांचे कापलेले गुण आणि राहिलेला बॅकलॉग
            </span>
          </div>
          <span style={{
            padding: '6px 14px',
            borderRadius: '20px',
            background: (metrics.deficitHours || 0) > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
            color: (metrics.deficitHours || 0) > 0 ? 'var(--danger)' : 'var(--success)',
            fontWeight: 700,
            fontSize: '0.85rem'
          }}>
            {(metrics.deficitHours || 0) > 0 ? `⚠️ ${metrics.deficitHours} तास तूट` : '🟢 शून्य तूट (वेळेवर)'}
          </span>
        </div>

        {/* 4 Deficit Metric Cards */}
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>एकूण अभ्यास तूट</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: (metrics.deficitHours || 0) > 0 ? 'var(--danger)' : 'var(--success)', margin: '4px 0' }}>
              {metrics.deficitHours || 0} <span style={{ fontSize: '1rem' }}>तास</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              {(metrics.deficitHours || 0) > 0 ? 'नियोजनापेक्षा मागे पडलेला वेळ' : 'पूर्ण वेळ अभ्यास'}
            </span>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>दंडामुळे वजा झालेले XP</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--danger)', margin: '4px 0' }}>
              -{metrics.totalPenalties || 0} <span style={{ fontSize: '1rem' }}>XP</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              अभ्यास न झालेल्या दिवसांची पेनल्टी
            </span>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>शिल्लक बॅकलॉग टास्क्स</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--warning)', margin: '4px 0' }}>
              {metrics.backlogCount || 0} <span style={{ fontSize: '1rem' }}>विषय</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              भरून काढायचे राहिलेले टास्क्स
            </span>
          </div>

          <div className="glass-card" style={{ padding: '16px', textAlign: 'center' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>अभ्यास सातत्य स्कोअर</span>
            <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--info)', margin: '4px 0' }}>
              {metrics.disciplineScore || 100}%
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Discipline & Consistency
            </span>
          </div>
        </div>

        {/* Subject-wise Deficit Breakdown */}
        {metrics.backlogBySubject && Object.keys(metrics.backlogBySubject).length > 0 && (
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '12px', color: 'var(--warning)' }}>
              📚 कोणत्या विषयाचा अभ्यास किती कमी पडत आहे?
            </h3>
            <div 
              className="flex-row gap-3" 
              style={{ 
                flexWrap: 'wrap',
                maxHeight: '120px',
                overflowY: 'auto',
                paddingRight: '4px'
              }}
            >
              {Object.entries(metrics.backlogBySubject).map(([sub, count]) => (
                <div key={sub} style={{ padding: '8px 14px', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '10px', fontSize: '0.85rem' }}>
                  <strong style={{ color: 'var(--text-primary)' }}>{sub}: </strong>
                  <span style={{ color: 'var(--warning)', fontWeight: 700 }}>{count} टास्क्स मागे</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Penalty Logs */}
        {metrics.penaltyHistory && metrics.penaltyHistory.length > 0 && (
          <div>
            <div className="flex-row justify-between align-center mb-2" style={{ marginBottom: '10px' }}>
              <h3 style={{ fontSize: '1rem', margin: 0 }}>
                📅 मागील पेनल्टी नोंदी (Recent Deductions)
              </h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                एकूण: {metrics.penaltyHistory.length} नोंदी
              </span>
            </div>

            <div 
              className="flex-col gap-2"
              style={{
                maxHeight: showAllPenalties ? '260px' : 'none',
                overflowY: showAllPenalties ? 'auto' : 'visible',
                paddingRight: showAllPenalties ? '6px' : '0'
              }}
            >
              {(showAllPenalties ? metrics.penaltyHistory : metrics.penaltyHistory.slice(0, 4)).map((p, idx) => (
                <div key={idx} style={{ padding: '10px 14px', background: 'var(--glass-bg)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                    <strong>{p.date}</strong> — {p.reason}
                  </span>
                  <span style={{ fontWeight: 700, color: p.xpDeducted > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {p.xpDeducted > 0 ? `-${p.xpDeducted}` : `+${Math.abs(p.xpDeducted)}`} XP
                  </span>
                </div>
              ))}
            </div>

            {metrics.penaltyHistory.length > 4 && (
              <button 
                onClick={() => setShowAllPenalties(prev => !prev)}
                className="btn"
                style={{
                  width: '100%',
                  marginTop: '10px',
                  padding: '7px 12px',
                  background: 'var(--glass-bg)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                  borderRadius: '8px',
                  cursor: 'pointer'
                }}
              >
                {showAllPenalties ? 'कमी पेनल्टी नोंदी दाखवा 🔼' : `सर्व ${metrics.penaltyHistory.length} पेनल्टी नोंदी पहा (स्क्रोल करा) 🔽`}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Spaced Repetition (SRS) Retention Engine Report */}
      <div className="glass-panel" style={{ padding: '24px', borderLeft: '4px solid var(--accent-primary)' }}>
        <div className="flex-row justify-between align-center" style={{ marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FiRotateCcw color="var(--accent-primary)" />
              स्मरण व रिव्हिजन चक्र (Spaced Repetition Retention Engine)
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Hermann Ebbinghaus [1, 3, 7, 15, 30 दिवस] नियमानुसार स्मरण क्षमता व प्रभुत्व पातळी
            </span>
          </div>
          <span style={{
            padding: '6px 14px',
            borderRadius: '20px',
            background: 'var(--accent-glow)',
            color: 'var(--accent-primary)',
            fontWeight: 700,
            fontSize: '0.85rem',
            border: '1px solid var(--accent-primary)'
          }}>
            Retention Index: {metrics.revisionHealth || 0}%
          </span>
        </div>

        {/* Stage Distribution Cards */}
        <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          {[
            { stage: 1, title: 'Stage 1 (Day 1)', count: metrics.srsStats?.stageCounts?.[1] || 0, color: '#ef4444', desc: 'प्राथमिक स्मरण' },
            { stage: 2, title: 'Stage 2 (Day 3)', count: metrics.srsStats?.stageCounts?.[2] || 0, color: '#f59e0b', desc: 'दृढीकरण' },
            { stage: 3, title: 'Stage 3 (Day 7)', count: metrics.srsStats?.stageCounts?.[3] || 0, color: '#3b82f6', desc: 'मध्यम मुदत' },
            { stage: 4, title: 'Stage 4 (Day 15)', count: metrics.srsStats?.stageCounts?.[4] || 0, color: '#8b5cf6', desc: 'दीर्घ स्मरण' },
            { stage: 5, title: 'Stage 5 (Mastered)', count: metrics.srsStats?.stageCounts?.[5] || 0, color: '#22c55e', desc: 'तोंडपाठ' },
          ].map(s => (
            <div key={s.stage} className="glass-card" style={{ padding: '14px', textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>{s.title}</span>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, margin: '4px 0' }}>
                {s.count}
              </div>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>{s.desc}</span>
            </div>
          ))}
        </div>

        <div style={{ padding: '14px 18px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            डेकमध्ये एकूण: <strong>{metrics.srsStats?.totalTopics || 0} विषय</strong> | आज रिव्हिजन बाकी: <strong style={{ color: 'var(--warning)' }}>{metrics.srsStats?.dueCount || 0} घटक</strong> | पूर्ण तोंडपाठ: <strong style={{ color: 'var(--success)' }}>{metrics.srsStats?.masteredCount || 0} घटक</strong>
          </span>
        </div>
      </div>

      {/* Priority & Strong Topics */}
      <div className="dashboard-grid">
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '16px', color: 'var(--danger)' }}>🔴 Priority Areas (Weak Topics)</h3>
          <div className="flex-col gap-3">
             {metrics.weak.map((topic, i) => (
                <div key={i} style={{ padding: '12px 16px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--danger)' }}>
                   {topic}
                </div>
             ))}
          </div>
        </div>
        
        <div className="glass-panel" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '16px', color: 'var(--success)' }}>🟢 Strong Topics (प्रभुत्व असलेले विषय)</h3>
          <div className="flex-col gap-3">
             {metrics.strong.map((topic, i) => (
                <div key={i} style={{ padding: '12px 16px', background: 'rgba(34, 197, 94, 0.05)', borderRadius: '8px', borderLeft: '3px solid var(--success)' }}>
                   {topic}
                </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;