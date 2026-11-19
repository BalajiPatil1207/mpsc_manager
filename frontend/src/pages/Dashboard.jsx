import React, { useState, useEffect, useRef } from 'react';
import { FiClock, FiCheckCircle, FiPlay, FiAlertTriangle, FiBell, FiMoon, FiSun, FiCheck, FiRotateCcw, FiDownload, FiPlus, FiTrendingDown, FiShield, FiAward } from 'react-icons/fi';
import { requestNotificationPermission, sendPushNotification } from '../utils/notify';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import ConfirmModal from '../components/ConfirmModal';
import StudyDeficitModal from '../components/StudyDeficitModal';
import FocusTimerModal from '../components/FocusTimerModal';
import NewsTicker from '../components/NewsTicker';
// Spaced Repetition (SRS) Flashcard Active Recall Modal
import SrsReviewModal from '../components/SrsReviewModal';
import ScheduleTimetableModal from '../components/ScheduleTimetableModal';
import { 
  getDeficitState, 
  processDayRollover, 
  calculateTodayProgress, 
  getLogicalDateString, 
  TASK_XP_REWARD, 
  DAILY_COMPLETION_BONUS,
  checkDeficitResetEligibility,
  recordDeficitReset,
  SCHEDULE_GROUPS,
  getScheduleForDate
} from '../utils/deficitTracker';
import { getDueSrsItems, addTopicToSrs, getSrsStats } from '../utils/srsEngine';
import { playSound } from '../utils/sound';

const AnimatedNumber = ({ value }) => {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const end = parseFloat(value) || 0;
    if (end === 0) {
      setDisplay(0);
      return;
    }
    const step = end / 60; 
    let current = 0;
    const timer = setInterval(() => {
      current += step;
      if (current >= end) {
        setDisplay(end);
        clearInterval(timer);
      } else {
        setDisplay(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display}</>;
};

const topicsMap = {
  gk_pol: ["संविधान सभा व पार्श्वभूमी", "प्रस्ताविका व नागरिकत्व", "मूलभूत हक्क (भाग ३)", "मार्गदर्शक तत्त्वे व कर्तव्ये", "राष्ट्रपती व राज्यपाल", "संसद व विधीमंडळ", "सर्वोच्च व उच्च न्यायालय"],
  gk_his: ["१८५७ चा उठाव व पार्श्वभूमी", "महाराष्ट्रातील समाजसुधारक", "राष्ट्रीय चळवळ (मवाळ व जहाल)", "गांधी युग व जनआंदोलने", "संयुक्त महाराष्ट्र चळवळ", "स्वातंत्र्योत्तर महाराष्ट्र"],
  gk_ca:  ["महाराष्ट्र शासकीय योजना व पुरस्कार", "राष्ट्रीय व आंतरराष्ट्रीय महत्त्वाच्या घडामोडी", "आर्थिक घडामोडी व निर्देशांक", "पर्यावरण व विज्ञान तंत्रज्ञान", "क्रीडा व व्यक्तीविशेष"],
  csat_maths_reasoning: ["संख्यामाला व अक्षरमाला (Series)", "कोडिंग-डिकोडिंग व नातेसंबंध", "बैठक व्यवस्था व दिशा ज्ञान", "शेकडेवारी व नफा-तोटा", "सरासरी व गुणोत्तर-प्रमाण", "काळ, काम व वेग", "वेन आकृत्या व घड्याळ/कॅलेंडर"],
  gk_geo: ["महाराष्ट्राची प्राकृतिक रचना व घाट", "महाराष्ट्राची नदीप्रणाली (गोदावरी, भीमा, कृष्णा)", "हवामान, पर्जन्य व मान्सून", "मृदा व वने (जंगले)", "खनिज संपत्ती व ऊर्जा साधने", "लोकसंख्या भूगोल व पर्यावरण"],
  gk_sci: ["प्राणी व वनस्पतींचे वर्गीकरण", "मानवी आरोग्य व रोगशास्त्र", "पचन, श्वसन व रक्ताभिसरण संस्था", "प्रकाश व ध्वनी (Light & Sound)", "विद्युतधारा व चुंबकत्व", "अणूची रचना व रासायनिक अभिक्रिया"],
  gk_eco: ["राष्ट्रीय उत्पन्न (GDP, GNP)", "रिझर्व्ह बँक (RBI) व बँकिंग", "दारिद्र्य व बेरोजगारी मापन", "सार्वजनिक वित्त (कर रचना व बजेट)", "परकीय व्यापार व BOP", "शाश्वत विकास व शासकीय आर्थिक योजना"],
  srs_weekly_review: ["आठवड्यातील सर्व कठीण संकल्पना रिव्हिजन", "Spaced Repetition Flashcards रिव्ह्यू", "शॉर्ट नोट्स व हायलाइट्स रिव्हिजन"],
  sunday_mega_mock: ["MPSC राज्यसेवा / संयुक्त पूर्व सर्वसमावेशक मॉक टेस्ट", "नेगेटिव्ह मार्किंग मॅनेजमेंट (+१ / -०.२५)", "वेळेचे अचूक नियोजन (Time per Question)"],
  mistake_book_audit: ["आजच्या टेस्टमध्ये चुकलेल्या प्रश्नांची कारणे", "Mistake Book मधील वीव्हड प्रश्न पुन्हा सोडवणे", "वारंवार चुकणारे टॉपिक्स हायलाइट करणे"],
  backlog_recovery: ["मागील ७ दिवसांतील अपूर्ण राहिलेले टास्क्स क्लिअर करणे", "अभ्यास तूट (Deficit Hours) शून्य करणे", "पुढील आठवड्यासाठी १००% सज्ज होणे"],
  // Backward compatibility
  reasoning: ["Number Series", "Alphabet Series", "Coding-Decoding", "Analogy", "Blood Relations", "Direction Test"],
  maths: ["Number System", "BODMAS & Fractions", "LCM & HCF", "Percentage", "Profit & Loss", "Simple Interest"]
};

const getTopicIndexes = () => {
  try {
    return JSON.parse(localStorage.getItem('task_indexes') || '{}');
  } catch(e) {
    return {};
  }
};

const getTopicForTask = (taskId, indexOverride) => {
  const arr = topicsMap[taskId];
  if (!arr) return "";
  const indexes = getTopicIndexes();
  const idx = indexOverride !== undefined ? indexOverride : (indexes[taskId] || 0);
  return arr[idx % arr.length];
};

const getTitleForTask = (taskId, indexOverride) => {
  const indexes = getTopicIndexes();
  const idx = indexOverride !== undefined ? indexOverride : (indexes[taskId] || 0);
  const titles = {
    'gk_pol': '🏛️ भारतीय राज्यव्यवस्था (Polity)',
    'gk_his': '📜 इतिहास (History)',
    'gk_ca': '📰 चालू घडामोडी (Current Affairs)',
    'csat_maths_reasoning': `📐 अंकगणित व बुद्धिमत्ता (CSAT Daily Set ${idx + 1})`,
    'gk_geo': '🌍 भूगोल व पर्यावरण (Geography)',
    'gk_sci': '🔬 सामान्य विज्ञान (General Science)',
    'gk_eco': '💰 भारतीय अर्थव्यवस्था (Economics)',
    'srs_weekly_review': '⚡ संपूर्ण आठवड्याची रिव्हिजन (SRS Flashcards)',
    'sunday_mega_mock': '📋 १ फुल मॉक टेस्ट (100 Qs / 100 Marks)',
    'mistake_book_audit': '📖 मिस्टेक बुक ॲनालिसिस व त्रुटी सुधारणा',
    'backlog_recovery': '🎯 आठवड्याचा बॅकलॉग भरून काढणे',
    'reasoning': `🧠 Reasoning Practice (Set ${idx + 1})`,
    'maths': '📐 Maths Practice'
  };
  return titles[taskId];
};

const getInitialTasksForToday = () => {
  const activeSched = getScheduleForDate(getLogicalDateString());
  return activeSched.tasks.map(t => ({
    ...t,
    title: getTitleForTask(t.id) || t.title,
    completed: false
  }));
};

const getScheduleSubjectsPills = (groupKey) => {
  if (groupKey === 'A') {
    return [
      { name: '🏛️ राज्यव्यवस्था', isCsat: false },
      { name: '📜 इतिहास', isCsat: false },
      { name: '📰 चालू घडामोडी', isCsat: false },
      { name: '📐 CSAT रोज', isCsat: true }
    ];
  } else if (groupKey === 'B') {
    return [
      { name: '🌍 भूगोल', isCsat: false },
      { name: '🔬 सामान्य विज्ञान', isCsat: false },
      { name: '💰 अर्थव्यवस्था', isCsat: false },
      { name: '📐 CSAT रोज', isCsat: true }
    ];
  } else {
    return [
      { name: '⚡ SRS रिव्हिजन', isCsat: false },
      { name: '📋 फुल मॉक टेस्ट', isCsat: false },
      { name: '📖 मिस्टेक बुक', isCsat: false },
      { name: '🎯 बॅकलॉग भरून काढणे', isCsat: true }
    ];
  }
};

const Dashboard = ({ user, deferredPrompt, setDeferredPrompt }) => {
  const navigate = useNavigate();
  const [activeGroupKey, setActiveGroupKey] = useState(() => getScheduleForDate(getLogicalDateString()).key);
  const [dailyTasks, setDailyTasks] = useState(() => {
    try {
      const logicalToday = getLogicalDateString();
      const currentSchedule = getScheduleForDate(logicalToday);
      const savedDate = localStorage.getItem('last_task_date');
      const savedGroup = localStorage.getItem('user_daily_tasks_group');
      const saved = localStorage.getItem('user_daily_tasks');

      if (saved && saved !== 'undefined' && saved !== 'null') {
        let parsed = JSON.parse(saved);
        // Detect legacy tasks: if parsed has > 4 tasks OR contains old IDs (e.g. reasoning, maths, or mixed Group A + B)
        const isLegacyOldFormat = Array.isArray(parsed) && (
          parsed.length > 4 ||
          parsed.some(t => t.id === 'reasoning' || t.id === 'maths') ||
          (parsed.some(t => t.id === 'gk_pol') && parsed.some(t => t.id === 'gk_geo'))
        );

        if (!isLegacyOldFormat && Array.isArray(parsed) && parsed.length > 0 && savedDate === logicalToday && savedGroup === currentSchedule.key) {
          return parsed.sort((a, b) => {
            if (a.completed === b.completed) return 0;
            return a.completed ? 1 : -1;
          });
        }
      }
    } catch(e) { }

    // Automatic migration to timetable: load exactly 4 tasks for today's active group
    const freshTasks = getInitialTasksForToday();
    try {
      const logicalToday = getLogicalDateString();
      const currentSchedule = getScheduleForDate(logicalToday);
      localStorage.setItem('user_daily_tasks', JSON.stringify(freshTasks));
      localStorage.setItem('last_task_date', logicalToday);
      localStorage.setItem('user_daily_tasks_group', currentSchedule.key);
      import('../utils/dbStore').then(({ saveToDB }) => saveToDB('user_daily_tasks', freshTasks));
    } catch(e) {}
    return freshTasks;
  });
  const [deficitState, setDeficitState] = useState(() => getDeficitState());
  const [isDeficitModalOpen, setIsDeficitModalOpen] = useState(false);
  const [isFocusModalOpen, setIsFocusModalOpen] = useState(false);
  const [isSrsModalOpen, setIsSrsModalOpen] = useState(false);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [activeFocusTask, setActiveFocusTask] = useState(null);

  const handleStartFocus = (taskItem) => {
    setActiveFocusTask(taskItem || dailyTasks.find(t => !t.completed) || dailyTasks[0]);
    setIsFocusModalOpen(true);
  };

  const [showAllTasks, setShowAllTasks] = useState(true);
  const [isEditingTasks, setIsEditingTasks] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState(null);
  const [showResetDeficitConfirm, setShowResetDeficitConfirm] = useState(false);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDuration, setNewTaskDuration] = useState('30 min');

  const handleRequestResetDeficit = () => {
    const eligibility = checkDeficitResetEligibility();
    if (!eligibility.allowed) {
      toast.error(
        `⚠️ मर्यादा: अभ्यास तूट महिन्यातून (३० दिवसांत) फक्त एकदाच रीसेट करता येते. पुढील रीसेट ${eligibility.daysRemaining} दिवसांनंतर उपलब्ध होईल.`,
        { duration: 5000, icon: '⏳' }
      );
      return;
    }
    setShowResetDeficitConfirm(true);
  };

  const resetStudyDeficit = () => {
    const nextState = { ...deficitState, deficitHours: 0, backlogTasks: [] };
    localStorage.setItem('study_deficit_hours', '0');
    localStorage.setItem('study_backlog_tasks', '[]');
    recordDeficitReset();
    setDeficitState(nextState);
    import('../utils/dbStore').then(({ saveMultipleToDB }) => saveMultipleToDB({
      study_deficit_hours: 0,
      study_backlog_tasks: [],
      study_last_deficit_reset_time: Date.now()
    }));
    setShowResetDeficitConfirm(false);
    playSound.playSuccess();
    toast.success('✨ अभ्यास तूट यशस्वीरीत्या रीसेट केली! नव्याने आणि उत्साहाने अभ्यास सुरू करा 🚀');
  };
  const currentReasoningSet = parseInt(localStorage.getItem('reasoningSetNumber')) || 1;
  const dragItem = useRef(null);
  const dragOverItem = useRef(null);

  const handleSort = () => {
    let _tasks = [...dailyTasks];
    const draggedItemContent = _tasks.splice(dragItem.current, 1)[0];
    _tasks.splice(dragOverItem.current, 0, draggedItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    setDailyTasks(_tasks);
    import('../utils/dbStore').then(({ saveToDB }) => saveToDB('user_daily_tasks', _tasks));
  };

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        if (setDeferredPrompt) setDeferredPrompt(null);
      });
    } else {
      toast("To install, tap 'Share' or 'Menu' then 'Add to Home Screen' in your browser! 📱", {
         icon: '📲',
         style: { borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }
      });
    }
  };

  const handleApplyGroup = (groupKey) => {
    const targetGroup = SCHEDULE_GROUPS[groupKey];
    if (!targetGroup) return;
    const newTasks = targetGroup.tasks.map(t => ({
      ...t,
      title: getTitleForTask(t.id) || t.title,
      completed: false
    }));
    setDailyTasks(newTasks);
    setActiveGroupKey(groupKey);
    localStorage.setItem('user_daily_tasks', JSON.stringify(newTasks));
    localStorage.setItem('user_daily_tasks_group', groupKey);
    import('../utils/dbStore').then(({ saveToDB }) => saveToDB('user_daily_tasks', newTasks));
    toast.success(`${targetGroup.name} चे टास्क्स सक्रिय केले! (${newTasks.length} टास्क्स) 🚀`);
    setIsScheduleModalOpen(false);
  };
  const [showTaskVideo, setShowTaskVideo] = useState(false);

  const toggleTask = (taskId, isUndo = false) => {
    let updated = dailyTasks.map(t => {
      if (t.id === taskId) {
        return { ...t, completed: !isUndo };
      }
      return t;
    });

    // Auto sort: Uncompleted -> Completed
    updated = updated.sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });

    setDailyTasks(updated);

    // XP calculation
    const targetTask = dailyTasks.find(t => t.id === taskId);
    const subKey = targetTask?.id?.startsWith('gk_') ? targetTask.id.replace('gk_', '') : (targetTask?.id || 'General');
    const oldXpTotal = parseFloat(localStorage.getItem('xp_total')) || 0;
    const oldSubXp = parseFloat(localStorage.getItem(`xp_${subKey}`)) || 0;

    let newXpTotal = oldXpTotal;
    let newSubXp = oldSubXp;

    if (!isUndo) {
      newXpTotal += TASK_XP_REWARD;
      newSubXp += TASK_XP_REWARD;
      playSound.playSuccess();
      toast.success(`🎉 टाॅपिक पूर्ण! +${TASK_XP_REWARD} XP मिळाले!`);

      // Automatically queue completed topic into Spaced Repetition (SRS)
      try {
        const topicName = getTopicForTask(taskId) || targetTask?.title;
        const subjectName = targetTask?.title?.includes('Polity') ? 'राज्यशास्त्र'
          : targetTask?.title?.includes('Geography') ? 'महाराष्ट्र भूगोल'
          : targetTask?.title?.includes('History') ? 'इतिहास'
          : targetTask?.title?.includes('Economics') ? 'अर्थव्यवस्था'
          : targetTask?.title?.includes('Science') ? 'सामान्य विज्ञान'
          : targetTask?.title?.includes('Reasoning') ? 'Reasoning'
          : targetTask?.title?.includes('Maths') ? 'Maths'
          : 'General';

        addTopicToSrs({
          topicId: taskId,
          title: topicName || targetTask?.title,
          subject: subjectName
        });
        setDueRevisionCount(getDueSrsItems().length);
      } catch (err) {
        console.error("Error scheduling SRS card:", err);
      }

      // 100% Completion Celebration!
      if (updated.length > 0 && updated.every(t => t.completed)) {
        newXpTotal += DAILY_COMPLETION_BONUS;
        toast.success(`👑 १००% टास्क्स पूर्ण! +${DAILY_COMPLETION_BONUS} XP दैनंदिन बोनस मिळाला! 🚀`, { duration: 5000 });
        setShowTaskVideo(true);
      }
    } else {
      newXpTotal = Math.max(0, newXpTotal - TASK_XP_REWARD);
      newSubXp = Math.max(0, newSubXp - TASK_XP_REWARD);
      toast('टास्क पूर्ववत केला (-15 XP)', { icon: '↩️' });
    }

    const batchUpdates = {
      user_daily_tasks: updated,
      xp_total: newXpTotal.toFixed(2),
      [`xp_${subKey}`]: newSubXp.toFixed(2)
    };

    import('../utils/dbStore').then(({ saveMultipleToDB }) => saveMultipleToDB(batchUpdates));

    setDeficitState(prev => ({
      ...prev,
      xpTotal: newXpTotal
    }));
  };

  const handleDeleteTask = (taskId) => {
    setTaskToDelete(taskId);
  };

  const confirmDeleteTask = () => {
    if (!taskToDelete) return;
    const updated = dailyTasks.filter(t => t.id !== taskToDelete);
    setDailyTasks(updated);
    import('../utils/dbStore').then(({ saveToDB }) => saveToDB('user_daily_tasks', updated));
    toast.success('Task removed from list!', { style: { borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }});
    setTaskToDelete(null);
  };

  const handleAddTask = () => {
    if (!newTaskTitle.trim()) return toast.error("Please enter a task title!");
    const newTask = {
      id: `custom_${Date.now()}`,
      title: newTaskTitle,
      duration: newTaskDuration,
      completed: false
    };
    let updated = [...dailyTasks, newTask];
    updated = updated.sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });
    setDailyTasks(updated);
    import('../utils/dbStore').then(({ saveToDB }) => saveToDB('user_daily_tasks', updated));
    toast.success('Custom task added!');
    setIsAddingTask(false);
    setNewTaskTitle('');
    setNewTaskDuration('30 min');
  };

  const advanceToNextDay = async (isManualSimulation = false) => {
    let savedTasks = [];
    try {
       savedTasks = JSON.parse(localStorage.getItem('user_daily_tasks') || '[]');
    } catch(e) {}
    
    // If empty or corrupted, fallback to initial tasks!
    if (!Array.isArray(savedTasks) || savedTasks.length === 0) {
       savedTasks = getInitialTasksForToday();
    }
    const oldIndexes = getTopicIndexes();
    const lastDate = localStorage.getItem('last_task_date') || getLogicalDateString();
    const logicalToday = getLogicalDateString();

    const rolloverResult = processDayRollover({
      savedTasks,
      lastDateStr: lastDate,
      todayDateStr: logicalToday,
      currentIndexes: oldIndexes,
      getTitleForTask,
      topicsMap
    });

    // Add completed tasks to weekly tally
    const completedCount = savedTasks.filter(t => t.completed).length;
    let pastWeekly = parseInt(localStorage.getItem('weekly_completed')) || 0;
    if (new Date().getDay() === 1) pastWeekly = 0; // Reset on Monday
    pastWeekly += completedCount;

    const now = new Date();
    const nowTimeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase();

    // Persist all rollover and deficit updates to DB
    const dbUpdates = {
      weekly_completed: pastWeekly,
      revision_queue: rolloverResult.existingQueue,
      task_indexes: rolloverResult.newIndexes,
      user_daily_tasks: rolloverResult.resetTasks,
      last_task_date: logicalToday,
      last_task_time: nowTimeStr,
      xp_total: rolloverResult.updatedXpTotal,
      study_deficit_hours: rolloverResult.updatedDeficitHours,
      total_xp_penalties: rolloverResult.updatedTotalPenalties,
      study_penalty_history: rolloverResult.updatedPenaltyHistory,
      study_backlog_tasks: rolloverResult.updatedBacklogTasks
    };

    import('../utils/dbStore').then(({ saveMultipleToDB }) => saveMultipleToDB(dbUpdates));

    setDailyTasks(rolloverResult.resetTasks);
    const nextGroup = getScheduleForDate(logicalToday);
    setActiveGroupKey(nextGroup.key);
    localStorage.setItem('user_daily_tasks_group', nextGroup.key);
    setDeficitState({
      deficitHours: rolloverResult.updatedDeficitHours,
      totalPenalties: rolloverResult.updatedTotalPenalties,
      penaltyHistory: rolloverResult.updatedPenaltyHistory,
      backlogTasks: rolloverResult.updatedBacklogTasks,
      xpTotal: rolloverResult.updatedXpTotal
    });

    if (rolloverResult.totalXpDeducted > 0) {
      playSound.playPenalty();
      toast((t) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <strong style={{ color: 'var(--danger)', fontSize: '1rem' }}>
            ⚠️ काल अभ्यास न झाल्यामुळे -{rolloverResult.totalXpDeducted} XP वजा झाले!
          </strong>
          <span style={{ fontSize: '0.85rem' }}>
            तुमचा अभ्यास {rolloverResult.totalMissedHours} तास मागे पडला आहे (एकूण तूट: {rolloverResult.updatedDeficitHours} तास).
          </span>
        </div>
      ), { 
        duration: 7000, 
        icon: '📉',
        style: { borderRadius: '16px', background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid rgba(239, 68, 68, 0.4)' }
      });
    } else if (rolloverResult.isBonusEarned) {
      playSound.playXpGain();
      toast.success("🌟 १००% अभ्यास पूर्ण केल्यामुळे +५० XP बोनस मिळाला! दिवस संपला 🚀", { duration: 6000 });
    } else {
      toast.success("पुढील दिवसाचे टास्क्स तयार आहेत! 🚀");
    }
    
    // Generate daily 6 AM Mega Test automatically (Max once a day per user)
    const megaDate = localStorage.getItem('last_mega_test_date');
    if (megaDate !== logicalToday) {
      try {
        await axios.post('https://mpsc-manager.onrender.com/api/custom-tests/mega-generate');
        localStorage.setItem('last_mega_test_date', logicalToday);
      } catch(err) {
        console.error("Mega Test error:", err);
      }
    }
  };

  useEffect(() => {
    const now = new Date();
    const logicalToday = getLogicalDateString();
    const currentSchedule = getScheduleForDate(logicalToday);
    const lastDate = localStorage.getItem('last_task_date');
    const savedGroup = localStorage.getItem('user_daily_tasks_group');

    // Auto-migrate if current tasks list is old legacy format (>4 tasks or old IDs)
    let currentSaved = [];
    try {
      currentSaved = JSON.parse(localStorage.getItem('user_daily_tasks') || '[]');
    } catch(e) {}

    const isOldLegacy = Array.isArray(currentSaved) && (
      currentSaved.length > 4 ||
      currentSaved.some(t => t.id === 'reasoning' || t.id === 'maths') ||
      (currentSaved.some(t => t.id === 'gk_pol') && currentSaved.some(t => t.id === 'gk_geo'))
    );

    if (isOldLegacy || savedGroup !== currentSchedule.key) {
      const freshTasks = getInitialTasksForToday();
      setDailyTasks(freshTasks);
      setActiveGroupKey(currentSchedule.key);
      localStorage.setItem('user_daily_tasks', JSON.stringify(freshTasks));
      localStorage.setItem('user_daily_tasks_group', currentSchedule.key);
      localStorage.setItem('last_task_date', logicalToday);
      import('../utils/dbStore').then(({ saveToDB }) => saveToDB('user_daily_tasks', freshTasks));
    } else if (lastDate !== logicalToday && lastDate) {
      advanceToNextDay();
    } else if (!lastDate) {
      localStorage.setItem('last_task_date', logicalToday);
      localStorage.setItem('user_daily_tasks_group', currentSchedule.key);
      localStorage.setItem('last_task_time', now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase());
    }
    
    requestNotificationPermission();

    const interval = setInterval(() => {
      const now = new Date();
      const currentHours = now.getHours().toString().padStart(2, '0');
      const currentMinutes = now.getMinutes().toString().padStart(2, '0');
      const currentTimeString = `${currentHours}:${currentMinutes}`;
      
      // Auto rollover to next timetable group across 6:00 AM even if tab stays open!
      const currentLogicalDate = getLogicalDateString();
      const savedDate = localStorage.getItem('last_task_date');
      if (savedDate && savedDate !== currentLogicalDate) {
        advanceToNextDay();
      }

      // Mock daily task check
      if (currentTimeString === "19:00") {
        sendPushNotification("Task Alert 🚨", "It's time for Current Affairs!");
      }
      if (currentTimeString === "10:00") {
        sendPushNotification("Study Time 📖", "History - Modern India session begins!");
      }
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  const handleNotificationClick = () => {
    toast("You're all caught up! No active alerts.", {
      icon: '🔔',
      style: { borderRadius: '12px', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }
    });
  };

  const completedTasks = dailyTasks.filter(t => t.completed);
  const todayProgress = calculateTodayProgress(dailyTasks);
  
  let completedMinutes = 0;
  completedTasks.forEach(t => {
    if (t.duration.includes('hr')) {
      completedMinutes += parseInt(t.duration) * 60;
    } else if (t.duration.includes('min')) {
      completedMinutes += parseInt(t.duration);
    }
  });

  const displayHours = Math.floor(completedMinutes / 60);
  const displayMins = completedMinutes % 60;
  
  const progressPercent = dailyTasks.length > 0 ? Math.round((completedTasks.length / dailyTasks.length) * 100) : 0;
  
  const pastWeeklyTasks = parseInt(localStorage.getItem('weekly_completed')) || 0;
  const currentWeeklyTotal = pastWeeklyTasks + completedTasks.length;
  const weeklySyllabusPercent = Math.min(100, Math.round((currentWeeklyTotal / 28) * 100)); // 4 tasks * 7 days = 28 (3+3 Alternate Schedule)

  const [dueRevisionCount, setDueRevisionCount] = useState(() => getDueSrsItems().length);

  useEffect(() => {
    setDueRevisionCount(getDueSrsItems().length);
  }, [dailyTasks]);

  const practiceAccuracy = parseFloat(localStorage.getItem('practice_accuracy')) || (currentWeeklyTotal > 0 ? 85 : 0);

  const calculateDaysLeft = () => {
    const target = new Date('2027-04-04T00:00:00');
    const diff = target - new Date();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="flex-col gap-6" style={{ paddingBottom: '40px', animation: 'fadeIn 0.6s ease-out' }}>
      
      {showTaskVideo && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 99999, background: '#000' }}>
           <video 
             src="/video/task-complete.mp4" 
             autoPlay 
             playsInline
             onEnded={() => setShowTaskVideo(false)} 
             style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
           />
           <button onClick={() => setShowTaskVideo(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255, 255, 255, 0.15)', backdropFilter: 'blur(10px)', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', padding: '8px 16px', borderRadius: '20px', cursor: 'pointer', zIndex: 100000, fontSize: '0.875rem' }}>Skip</button>
        </div>
      )}

      {/* Exclusive Scrolling News Ticker for balu@gmail.com */}
      <NewsTicker user={user} />

      {/* Header Section */}
      <div className="dashboard-header flex-row justify-between" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
        <div className="flex-col gap-2">
          <div className="flex-row align-center justify-between" style={{ width: '100%' }}>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 700, fontSize: '0.875rem', letterSpacing: '2px' }}>
              MPSC 2027 • DYNAMIC PREP
            </span>
            <button onClick={handleInstallClick} className="btn mobile-only-btn" style={{ background: 'var(--accent-glow)', border: '1px solid var(--accent-primary)', borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} title="Install App">
              <FiDownload size={16} color="var(--accent-primary)" />
            </button>
          </div>
          <div className="flex-row gap-2 align-center">
            <h1 className="heading-gradient dashboard-hero-title" style={{ margin: 0 }}>
              Good Morning, <span style={{ color: 'var(--accent-primary)', WebkitTextFillColor: 'var(--accent-primary)', textShadow: '0 0 20px var(--accent-glow)' }}>{user?.displayName ? user.displayName.split(' ')[0] : 'Student'}</span>
            </h1>
            <span style={{ fontSize: '2rem' }}>👋</span>
          </div>
          <p style={{ color: 'var(--text-secondary)' }}>Welcome to your personalized Study OS</p>
        </div>
        
        <div className="dashboard-header-actions stat-cards-carousel">
          {/* Days Left Card */}
          <div className="glass-card flex-col justify-center align-center" style={{ padding: '16px', animation: 'slideUp 0.8s ease-out', flex: 1, minWidth: '130px', gap: '8px', textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.25rem', margin: '0 auto' }}>⏳</div>
            <div className="flex-col" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--danger)' }}><AnimatedNumber value={calculateDaysLeft()} /> <span style={{fontSize:'1rem'}}>Days</span></span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>MPSC 2027</span>
            </div>
          </div>
          
          {/* Study Deficit & Backlog Status Header Card */}
          <div 
            onClick={() => setIsDeficitModalOpen(true)}
            className="glass-card flex-col justify-center align-center" 
            style={{ 
              padding: '16px', 
              animation: 'slideUp 0.85s ease-out', 
              flex: 1, 
              minWidth: '130px', 
              gap: '8px', 
              textAlign: 'center',
              cursor: 'pointer',
              border: deficitState.deficitHours > 0 ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(34, 197, 94, 0.3)'
            }}
            title="अभ्यास तूट व बॅकलॉग पाहण्यासाठी क्लिक करा"
          >
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: deficitState.deficitHours > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)', 
              color: deficitState.deficitHours > 0 ? 'var(--danger)' : 'var(--success)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '1.25rem', 
              margin: '0 auto' 
            }}>
              {deficitState.deficitHours > 0 ? '⚠️' : '🎯'}
            </div>
            <div className="flex-col" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: deficitState.deficitHours > 0 ? 'var(--danger)' : 'var(--success)' }}>
                {deficitState.deficitHours > 0 ? `-${deficitState.deficitHours}h` : '0h'}
              </span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                {deficitState.deficitHours > 0 ? 'अभ्यास तूट' : 'वेळेवर'}
              </span>
            </div>
          </div>

          {/* Deep Focus Timer Launcher Card */}
          <div 
            onClick={() => handleStartFocus(dailyTasks.find(t => !t.completed) || dailyTasks[0])}
            className="glass-card flex-col justify-center align-center" 
            style={{ 
              padding: '16px', 
              animation: 'slideUp 0.88s ease-out', 
              flex: 1, 
              minWidth: '130px', 
              gap: '8px', 
              textAlign: 'center',
              cursor: 'pointer',
              border: '1px solid rgba(249, 115, 22, 0.35)',
              background: 'linear-gradient(135deg, rgba(249, 115, 22, 0.08) 0%, transparent 100%)'
            }}
            title="लाईव्ह पोमोडोरो व डीप वर्क सुरू करा"
          >
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: 'var(--accent-glow)', 
              color: 'var(--accent-primary)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              fontSize: '1.25rem', 
              margin: '0 auto' 
            }}>
              ⏱️
            </div>
            <div className="flex-col" style={{ alignItems: 'center' }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--accent-primary)' }}>
                Focus
              </span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                लाईव्ह टाईमर
              </span>
            </div>
          </div>

          {/* Total XP Card */}
          <div className="glass-card flex-col justify-center align-center" style={{ padding: '16px', animation: 'slideUp 0.9s ease-out', flex: 1, minWidth: '130px', gap: '8px', textAlign: 'center' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', border: '4px solid var(--accent-primary)', borderLeftColor: 'rgba(255,255,255,0.1)', transform: 'rotate(45deg)', margin: '0 auto' }}></div>
            <div className="flex-col" style={{ alignItems: 'center', marginTop: '4px' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-secondary)' }}><AnimatedNumber value={parseFloat(localStorage.getItem('xp_total')) || 0} /></span>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total XP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Study Deficit & Backlog Banner */}
      <div 
        className="glass-card deficit-banner-card" 
        style={{ 
          padding: '20px 24px', 
          background: deficitState.deficitHours > 0 
            ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(245, 158, 11, 0.05) 100%)' 
            : 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(59, 130, 246, 0.05) 100%)',
          border: deficitState.deficitHours > 0 ? '1px solid rgba(239, 68, 68, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
          borderRadius: '20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '16px',
          flexWrap: 'wrap'
        }}
      >
        <div className="flex-row gap-4 align-center deficit-banner-content" style={{ flex: 1, minWidth: '280px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '14px',
            background: deficitState.deficitHours > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            color: deficitState.deficitHours > 0 ? 'var(--danger)' : 'var(--success)',
            flexShrink: 0
          }}>
            {deficitState.deficitHours > 0 ? <FiAlertTriangle /> : <FiShield />}
          </div>
          <div className="flex-col gap-1">
            <div className="flex-row gap-2 align-center" style={{ flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {deficitState.deficitHours > 0 ? '⚠️ अभ्यास तूट व बॅकलॉग ट्रॅकर' : '🎯 अभ्यास नियोजनानुसार सुरू आहे'}
              </span>
              <span style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px',
                background: deficitState.deficitHours > 0 ? 'rgba(239, 68, 68, 0.2)' : 'rgba(34, 197, 94, 0.2)',
                color: deficitState.deficitHours > 0 ? 'var(--danger)' : 'var(--success)'
              }}>
                {deficitState.deficitHours > 0 ? `${deficitState.deficitHours} तास मागे` : '० तास तूट'}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {deficitState.deficitHours > 0 ? (
                <>
                  मागील अभ्यास न झाल्यामुळे <strong style={{ color: 'var(--danger)' }}>-{deficitState.totalPenalties} XP</strong> कापले आहेत. बॅकलॉगमध्ये <strong>{deficitState.backlogTasks.length} टास्क्स</strong> शिल्लक आहेत.
                </>
              ) : (
                <>अभिनंदन! कोणताही बॅकलॉग शिल्लक नाही. आजचे सर्व टास्क्स पूर्ण करा आणि <strong>+५० XP दैनंदिन बोनस</strong> मिळवा!</>
              )}
            </p>
          </div>
        </div>

        <div className="flex-row gap-2 align-center deficit-banner-actions">
          <button 
            onClick={() => setIsDeficitModalOpen(true)}
            className="btn deficit-action-btn"
            style={{ 
              background: deficitState.deficitHours > 0 ? 'var(--danger)' : 'var(--accent-primary)', 
              color: '#fff', 
              border: 'none',
              padding: '10px 18px',
              fontSize: '0.875rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            {deficitState.deficitHours > 0 ? 'तूट विश्लेषण व बॅकलॉग भरून काढा ➔' : 'तूट विश्लेषण पहा ➔'}
          </button>
          {deficitState.deficitHours > 0 && (
            <button
              onClick={handleRequestResetDeficit}
              className="btn deficit-action-btn"
              style={{ 
                background: 'rgba(239, 68, 68, 0.12)', 
                color: 'var(--danger)', 
                border: '1px solid rgba(239, 68, 68, 0.35)', 
                padding: '10px 16px', 
                fontSize: '0.875rem', 
                fontWeight: 700, 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                borderRadius: '12px',
                cursor: 'pointer'
              }}
              title="अभ्यासाचा ताण न घेता नवीन सुरुवात करण्यासाठी तूट Reset करा"
            >
              <FiRotateCcw /> तूट Reset करा (Fresh Start)
            </button>
          )}
        </div>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards">
        <div className="glass-card stat-card">
          <span className="stat-label">Tasks</span>
          <span className="stat-value"><AnimatedNumber value={dailyTasks.length} /></span>
          <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Total assigned today</span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Completed</span>
          <span className="stat-value"><AnimatedNumber value={dailyTasks.filter(t=>t.completed).length} /></span>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${dailyTasks.length > 0 ? (dailyTasks.filter(t=>t.completed).length / dailyTasks.length)*100 : 0}%` }}></div>
          </div>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Study Time</span>
          <span className="stat-value"><AnimatedNumber value={displayHours} />h <AnimatedNumber value={displayMins} />m</span>
          <span style={{ fontSize: '0.875rem', color: 'var(--success)' }}>Active Learning</span>
        </div>
        <div className="glass-card stat-card" onClick={() => setIsDeficitModalOpen(true)} style={{ cursor: 'pointer' }}>
          <span className="stat-label">Study Deficit (तूट)</span>
          <span className="stat-value" style={{ color: deficitState.deficitHours > 0 ? 'var(--danger)' : 'var(--success)' }}>
            {deficitState.deficitHours > 0 ? `-${deficitState.deficitHours}h` : '0h'}
          </span>
          <span style={{ fontSize: '0.875rem', color: deficitState.deficitHours > 0 ? 'var(--danger)' : 'var(--text-secondary)' }}>
            {deficitState.deficitHours > 0 ? `${deficitState.backlogTasks.length} टास्क्स मागे` : 'वेळेवर सुरू आहे'}
          </span>
        </div>
        <div className="glass-card stat-card">
          <span className="stat-label">Syllabus</span>
          <span className="stat-value"><AnimatedNumber value={progressPercent} />%</span>
          <div className="progress-container">
            <div className="progress-bar" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        {/* Left Column */}
        <div className="flex-col gap-6">
          
          {/* Today's Tasks */}
          <div className="glass-panel dashboard-panel">
            <div className="flex-row justify-between" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
              <div className="flex-col gap-1">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h2 style={{ fontSize: '1.25rem', margin: 0 }}>📋 Today's Tasks</h2>
                  <span className="tasks-swipe-hint">👈 स्वाईप करा 👉</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  new tasks fetched: {localStorage.getItem('last_task_date') || new Date().toLocaleDateString('en-GB')} at {localStorage.getItem('last_task_time') || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }).toLowerCase()}
                </span>
              </div>
              <div className="flex-row gap-2">
                <button onClick={() => setIsEditingTasks(!isEditingTasks)} className="btn" style={{ padding: '8px', background: isEditingTasks ? 'var(--warning)' : 'rgba(255,255,255,0.05)', color: isEditingTasks ? '#000' : 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }} title={isEditingTasks ? "Done Editing" : "Edit Tasks"}>
                  {isEditingTasks ? <FiCheck size={16} /> : <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"></path><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path></svg>}
                </button>
                {isEditingTasks && (
                  <button 
                    onClick={() => advanceToNextDay(true)} 
                    className="btn" 
                    style={{ padding: '6px 12px', background: 'rgba(239, 68, 68, 0.15)', color: 'var(--danger)', border: '1px dashed var(--danger)', outline: 'none', fontSize: '0.75rem', fontWeight: 600 }}
                    title="अभ्यास न झाल्याची XP पेनल्टी व तूट तपासा"
                  >
                    🧪 चाचणी: दिवस संपवा व पेनल्टी तपासा
                  </button>
                )}
                {!isEditingTasks && <button onClick={() => advanceToNextDay(false)} className="btn" style={{ padding: '6px 12px', background: 'var(--accent-glow)', color: 'var(--accent-primary)', border: '1px solid var(--accent-glow)', outline: 'none', fontSize: '0.75rem' }}>Wrap Up Day 🚀</button>}
                <button onClick={() => setShowAllTasks(!showAllTasks)} className="btn" style={{ padding: '6px 12px', background: 'rgba(255,255,255,0.05)', color: 'var(--text-primary)', border: '1px solid var(--border-color)', outline: 'none' }}>{showAllTasks ? 'View Less' : 'View All'}</button>
              </div>
            </div>
            
            {/* MPSC 3+3 Alternate Day Schedule Banner & Switcher */}
            <div className={`mpsc-schedule-banner group-${activeGroupKey.toLowerCase()}`}>
              <div className="schedule-banner-top">
                <div className="schedule-banner-left">
                  <div className={`schedule-group-badge badge-${activeGroupKey.toLowerCase()}`}>
                    {activeGroupKey === 'A' ? 'A' : activeGroupKey === 'B' ? 'B' : 'C'}
                  </div>
                  <div className="schedule-banner-titles">
                    <div className="schedule-group-name">
                      {SCHEDULE_GROUPS[activeGroupKey]?.name}
                    </div>
                    <div className="schedule-group-days">
                      • {SCHEDULE_GROUPS[activeGroupKey]?.daysLabel}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="schedule-view-btn"
                  title="संपूर्ण आठवड्याचे ३+३ वेळापत्रक पहा"
                >
                  📅 <span>वेळापत्रक</span>
                </button>
              </div>

              {/* Subject pills */}
              <div className="schedule-subjects-strip">
                {getScheduleSubjectsPills(activeGroupKey).map((sub, i) => (
                  <span key={i} className={`schedule-subject-pill ${sub.isCsat ? 'csat' : ''}`}>
                    {sub.name}
                  </span>
                ))}
              </div>

              {/* Segmented Switcher Tabs */}
              <div className="schedule-tabs-row">
                <button 
                  onClick={() => handleApplyGroup('A')}
                  className={`schedule-tab-item ${activeGroupKey === 'A' ? 'active-a' : ''}`}
                  title="सोम, बुध, शुक्र: राज्यव्यवस्था, इतिहास, चालू घडामोडी + CSAT"
                >
                  गट 'अ'
                </button>
                <button 
                  onClick={() => handleApplyGroup('B')}
                  className={`schedule-tab-item ${activeGroupKey === 'B' ? 'active-b' : ''}`}
                  title="मंगळ, गुरु, शनि: भूगोल, विज्ञान, अर्थव्यवस्था + CSAT"
                >
                  गट 'ब'
                </button>
                <button 
                  onClick={() => handleApplyGroup('C')}
                  className={`schedule-tab-item ${activeGroupKey === 'C' ? 'active-c' : ''}`}
                  title="रविवार: उजळणी, मॉक टेस्ट, मिस्टेक बुक"
                >
                  रविवार
                </button>
              </div>
            </div>

            <div className="tasks-cards-carousel">
              {(showAllTasks ? dailyTasks : dailyTasks.slice(0, 4)).map((task, idx) => (
                <div 
                  key={task.id} 
                  className={`task-card-pro ${task.completed ? 'completed' : ''}`}
                  draggable={isEditingTasks}
                  onDragStart={(e) => { if(isEditingTasks) dragItem.current = idx; }}
                  onDragEnter={(e) => { if(isEditingTasks) dragOverItem.current = idx; }}
                  onDragEnd={isEditingTasks ? handleSort : undefined}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <div className="task-card-main-content">
                    <div className="task-card-header">
                      <div className="task-card-title-group">
                        {isEditingTasks ? (
                          <div style={{ cursor: 'grab', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
                          </div>
                        ) : (
                          <span className="task-status-icon">
                            {task.completed ? <FiCheckCircle size={22} color="var(--success)" /> : <FiClock size={22} color="var(--accent-primary)" />}
                          </span>
                        )}
                        <h4 className="task-card-title">
                          {task.title.replace(' (GKGS)', '')}
                        </h4>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span className="task-duration-badge">
                          🕒 {task.duration}
                        </span>
                        {isEditingTasks && (
                          <button onClick={() => handleDeleteTask(task.id)} style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', outline: 'none', padding: '2px', display: 'flex', alignItems: 'center' }} title="Remove Task">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Topic and Study Type details */}
                    {(getTopicForTask(task.id) || task.studyType) && (
                      <div className="task-card-meta">
                        {getTopicForTask(task.id) && (
                          <span className="task-topic-chip">
                            🎯 <strong>विषय:</strong> {getTopicForTask(task.id)}
                          </span>
                        )}
                        {task.studyType && (
                          <span className="task-study-type-chip">
                            📝 {task.studyType}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Bar */}
                  {!isEditingTasks && (
                    <div className="task-card-actions">
                      {task.completed ? (
                        <button onClick={() => toggleTask(task.id, true)} className="task-undo-btn">
                          <FiRotateCcw size={15} /> <span>पुन्हा सुरू करा (Undo)</span>
                        </button>
                      ) : (
                        <>
                          <button 
                            onClick={() => handleStartFocus(task)} 
                            className="task-focus-btn" 
                            title="या विषयासाठी डीप वर्क फोकस सुरू करा"
                          >
                            <FiPlay size={13} /> <span>Focus Timer</span>
                          </button>
                          <button 
                            onClick={() => toggleTask(task.id, false)} 
                            className="task-complete-btn" 
                            title="टास्क पूर्ण मार्क करा"
                          >
                            <FiCheck size={16} /> <span>पूर्ण झाले (Done)</span>
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {isEditingTasks && (
                <div style={{ marginTop: '8px', padding: '16px', background: 'rgba(255,255,255,0.02)', border: '1px dashed var(--accent-secondary)', borderRadius: '12px' }}>
                  {isAddingTask ? (
                    <div className="flex-col gap-2">
                       <input type="text" placeholder="Custom Study Task Title" className="glass-card" value={newTaskTitle} onChange={e => setNewTaskTitle(e.target.value)} style={{ padding: '12px', width: '100%', outline: 'none', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)' }} />
                       <div className="flex-row gap-2">
                         <select className="glass-card" value={newTaskDuration} onChange={e => setNewTaskDuration(e.target.value)} style={{ padding: '12px', outline: 'none', color: 'var(--text-primary)', background: 'rgba(0,0,0,0.2)' }}>
                           <option value="15 min">15 min</option>
                           <option value="30 min">30 min</option>
                           <option value="45 min">45 min</option>
                           <option value="1 hr">1 hr</option>
                           <option value="2 hr">2 hr</option>
                         </select>
                         <button onClick={handleAddTask} className="btn btn-primary" style={{ flex: 1, background: 'var(--accent-secondary)' }}>Add</button>
                         <button onClick={() => setIsAddingTask(false)} className="btn" style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>Cancel</button>
                       </div>
                    </div>
                  ) : (
                    <button onClick={() => setIsAddingTask(true)} className="btn" style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--accent-secondary)', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
                       <FiPlus size={20} /> Add Custom Task
                    </button>
                  )}
                </div>
              )}
              {dailyTasks.length === 0 && !isEditingTasks && (
                <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                   No tasks assigned! Turn on Edit mode to add some.
                </div>
              )}
            </div>
          </div>

          {/* Analytics Shortcut */}
          <div className="glass-panel" style={{ padding: '24px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'var(--info)', opacity: '0.05', zIndex: 0 }}></div>
            <div className="flex-row justify-between" style={{ alignItems: 'center', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: '16px' }}>
              <div className="flex-col gap-2">
                <h2 style={{ fontSize: '1.25rem' }}>📊 Performance Analytics</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Track your strengths & weak subjects</p>
              </div>
              <button className="btn btn-primary" style={{ background: 'var(--info)', borderColor: 'var(--info)' }} onClick={() => navigate('/analytics')}>View Report</button>
            </div>
          </div>
          
        </div>

        {/* Right Column */}
        <div className="flex-col gap-6">
          
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '1.125rem' }}>Action Items</h3>
            
            <div 
              className="glass-card p-4" 
              onClick={() => setIsSrsModalOpen(true)} 
              title="Spaced Repetition Active Recall रिव्हिजन सुरू करा" 
              style={{ padding: '16px', borderLeft: dueRevisionCount > 0 ? '4px solid var(--warning)' : '4px solid var(--success)', cursor: 'pointer', transition: 'all 0.3s' }}
            >
              <div className="flex-row justify-between">
                <div className="flex-col gap-1">
                  <span style={{ fontWeight: 600 }}>🔄 Spaced Revision Due</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    {dueRevisionCount > 0 ? `${dueRevisionCount} Topics Ebbinghaus नियमानुसार बाकी` : 'सर्व रिव्हिजन पूर्ण आहेत!'}
                  </span>
                </div>
                <span style={{ background: dueRevisionCount > 0 ? 'rgba(245, 158, 11, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: dueRevisionCount > 0 ? 'var(--warning)' : 'var(--success)', padding: '4px 12px', borderRadius: '8px', fontWeight: 'bold' }}>
                  {dueRevisionCount > 0 ? `${dueRevisionCount} Due` : '✓ 100%'}
                </span>
              </div>
            </div>

            <div className="glass-card p-4" onClick={() => navigate('/mistakes')} style={{ padding: '16px', borderLeft: '4px solid var(--danger)', cursor: 'pointer', transition: 'all 0.3s' }}>
              <div className="flex-row justify-between">
                <div className="flex-col gap-1">
                  <span style={{ fontWeight: 600 }}>❌ Mistakes to Review</span>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>From recent mocks</span>
                </div>
                <span style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', padding: '4px 12px', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.875rem', display: 'flex', alignItems: 'center' }}>Go ➔</span>
              </div>
            </div>
          </div>

          <div className="glass-panel" style={{ padding: '24px' }}>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '16px' }}>Weekly Progress</h3>
            <div className="flex-col gap-4">
              <div>
                <div className="flex-row justify-between" style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Syllabus Coverage</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{weeklySyllabusPercent}%</span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${weeklySyllabusPercent}%`, background: 'var(--info)' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex-row justify-between" style={{ marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Practice Accuracy</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{practiceAccuracy > 0 ? `${practiceAccuracy.toFixed(1)}%` : '0%'}</span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: practiceAccuracy > 0 ? `${practiceAccuracy}%` : '0%', background: 'var(--success)' }}></div>
                </div>
              </div>
            </div>
          </div>
          
        </div>
      </div>
      
      <ConfirmModal 
        isOpen={!!taskToDelete}
        title="Delete Task?"
        message="Are you sure you want to remove this task from your daily study goals?"
        confirmText="Remove"
        isDanger={true}
        onConfirm={confirmDeleteTask}
        onCancel={() => setTaskToDelete(null)}
      />

      <ConfirmModal
        isOpen={showResetDeficitConfirm}
        title="अभ्यास तूट (Study Loss Time) Reset करायची?"
        message="जास्त अभ्यास तूट साठल्यामुळे मानसिक ताण येऊ नये म्हणून तूट शून्य (0h) केली जाईल आणि backlog साफ होईल. तुम्ही नव्याने, ताज्या उत्साहाने अभ्यास सुरू करू शकता!"
        confirmText="होय, Reset करा"
        cancelText="रद्द करा"
        isDanger={true}
        onConfirm={resetStudyDeficit}
        onCancel={() => setShowResetDeficitConfirm(false)}
      />

      <StudyDeficitModal 
        isOpen={isDeficitModalOpen}
        onClose={() => setIsDeficitModalOpen(false)}
        deficitState={deficitState}
        onStateUpdate={setDeficitState}
        todayProgress={todayProgress}
        onResetDeficit={() => {
          setIsDeficitModalOpen(false);
          handleRequestResetDeficit();
        }}
      />

      <FocusTimerModal 
        isOpen={isFocusModalOpen}
        onClose={() => setIsFocusModalOpen(false)}
        task={activeFocusTask}
        dailyTasks={dailyTasks}
        onSelectTask={(selected) => setActiveFocusTask(selected)}
        onCompleteTask={(taskId) => {
          toggleTask(taskId, false);
          setIsFocusModalOpen(false);
        }}
      />

      <SrsReviewModal 
        isOpen={isSrsModalOpen}
        onClose={() => {
          setIsSrsModalOpen(false);
          setDueRevisionCount(getDueSrsItems().length);
        }}
        onXpChange={(xpEarned) => {
          const currentXp = parseFloat(localStorage.getItem('xp_total')) || 0;
          setDeficitState(prev => ({ ...prev, xpTotal: currentXp }));
        }}
      />

      <ScheduleTimetableModal 
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        activeGroupKey={activeGroupKey}
        onApplyGroup={handleApplyGroup}
      />
    </div>
  );
};

export default Dashboard;
