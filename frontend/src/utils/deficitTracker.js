// Study Deficit, Backlog & XP Penalty Engine
// Handles: Daily study deficit calculation, XP penalties for missed study days,
// subject-wise backlog tracking, and deficit recovery.

export const TASK_XP_REWARD = 15;
export const DAILY_COMPLETION_BONUS = 50;
export const MISSED_DAY_PENALTY = 50; // XP deducted when zero study done on a day
export const MISSED_TASK_PENALTY = 10; // XP deducted per incomplete task

export const parseDurationMinutes = (durationStr = '') => {
  if (!durationStr) return 30;
  const str = durationStr.toString().toLowerCase();
  if (str.includes('hr')) {
    const val = parseFloat(str.replace('hr', '').trim()) || 1;
    return Math.round(val * 60);
  }
  if (str.includes('min')) {
    return parseInt(str.replace('min', '').trim(), 10) || 30;
  }
  return 30;
};

export const getLogicalDateString = () => {
  const d = new Date();
  d.setHours(d.getHours() - 6); // Shift day boundary to 6:00 AM
  return d.toLocaleDateString('en-GB'); // "DD/MM/YYYY"
};

export const parseDateString = (dateStr) => {
  if (!dateStr) return new Date();
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
  }
  return new Date(dateStr);
};

export const calculateDayGap = (lastDateStr, todayDateStr) => {
  if (!lastDateStr || !todayDateStr || lastDateStr === todayDateStr) return 0;
  try {
    const dLast = parseDateString(lastDateStr);
    const dToday = parseDateString(todayDateStr);
    dLast.setHours(0, 0, 0, 0);
    dToday.setHours(0, 0, 0, 0);
    const diffMs = dToday.getTime() - dLast.getTime();
    const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  } catch (e) {
    console.error("Error calculating day gap:", e);
    return 1;
  }
};

export const getDeficitState = () => {
  let deficitHours = parseFloat(localStorage.getItem('study_deficit_hours')) || 0;
  let totalPenalties = parseFloat(localStorage.getItem('total_xp_penalties')) || 0;
  let penaltyHistory = [];
  let backlogTasks = [];

  try {
    penaltyHistory = JSON.parse(localStorage.getItem('study_penalty_history') || '[]');
  } catch (e) {
    penaltyHistory = [];
  }

  try {
    backlogTasks = JSON.parse(localStorage.getItem('study_backlog_tasks') || '[]');
  } catch (e) {
    backlogTasks = [];
  }

  const xpTotal = parseFloat(localStorage.getItem('xp_total')) || 0;

  return {
    deficitHours: Math.max(0, parseFloat(deficitHours.toFixed(1))),
    totalPenalties: Math.round(totalPenalties),
    penaltyHistory,
    backlogTasks,
    xpTotal
  };
};

// Real-time analysis of today's study progress vs requirements
export const calculateTodayProgress = (dailyTasks = []) => {
  const tasks = Array.isArray(dailyTasks) ? dailyTasks : [];
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed);
  const incompleteTasks = tasks.filter(t => !t.completed);

  let totalMinutes = 0;
  let completedMinutes = 0;

  tasks.forEach(t => {
    const mins = parseDurationMinutes(t.duration);
    totalMinutes += mins;
    if (t.completed) completedMinutes += mins;
  });

  const remainingMinutes = Math.max(0, totalMinutes - completedMinutes);
  const remainingHours = parseFloat((remainingMinutes / 60).toFixed(1));
  const completedHours = parseFloat((completedMinutes / 60).toFixed(1));
  const totalHours = parseFloat((totalMinutes / 60).toFixed(1));

  const percent = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  // Potential penalty if day ends right now with no more study
  let projectedPenalty = 0;
  if (totalTasks > 0) {
    if (completedTasks.length === 0) {
      projectedPenalty = MISSED_DAY_PENALTY;
    } else if (incompleteTasks.length > 0) {
      projectedPenalty = incompleteTasks.length * MISSED_TASK_PENALTY;
    }
  }

  return {
    totalTasks,
    completedCount: completedTasks.length,
    incompleteCount: incompleteTasks.length,
    totalHours,
    completedHours,
    remainingHours,
    percent,
    projectedPenalty,
    isComplete: totalTasks > 0 && incompleteTasks.length === 0
  };
};

// Process Day Rollover & Deduct XP for Missed Study
export const processDayRollover = ({
  savedTasks = [],
  lastDateStr,
  todayDateStr,
  currentIndexes = {},
  getTitleForTask,
  topicsMap = {}
}) => {
  const currentXp = parseFloat(localStorage.getItem('xp_total')) || 0;
  const currentDeficitHours = parseFloat(localStorage.getItem('study_deficit_hours')) || 0;
  const currentTotalPenalties = parseFloat(localStorage.getItem('total_xp_penalties')) || 0;
  let penaltyHistory = [];
  let backlogTasks = [];

  try {
    penaltyHistory = JSON.parse(localStorage.getItem('study_penalty_history') || '[]');
  } catch (e) {
    penaltyHistory = [];
  }

  try {
    backlogTasks = JSON.parse(localStorage.getItem('study_backlog_tasks') || '[]');
  } catch (e) {
    backlogTasks = [];
  }

  const dayGap = calculateDayGap(lastDateStr, todayDateStr);
  const newPenaltyLogs = [];
  let totalXpDeducted = 0;
  let totalMissedHours = 0;
  let newBacklogItems = [];

  const completedTasks = savedTasks.filter(t => t.completed);
  const incompleteTasks = savedTasks.filter(t => !t.completed);

  // 1. Audit the day that just concluded (lastDateStr)
  if (savedTasks.length > 0) {
    if (completedTasks.length === 0) {
      // Zero study day!
      const missedMinutes = savedTasks.reduce((acc, t) => acc + parseDurationMinutes(t.duration), 0);
      const missedHrs = parseFloat((missedMinutes / 60).toFixed(1)) || 6.0;
      totalXpDeducted += MISSED_DAY_PENALTY;
      totalMissedHours += missedHrs;

      savedTasks.forEach(t => {
        newBacklogItems.push({
          id: `backlog_${Date.now()}_${t.id}`,
          originalId: t.id,
          title: t.title,
          duration: t.duration,
          missedDate: lastDateStr,
          subject: t.title.split(' ')[0] || 'General'
        });
      });

      newPenaltyLogs.push({
        id: `pen_${Date.now()}_1`,
        date: lastDateStr,
        type: 'zero_study',
        xpDeducted: MISSED_DAY_PENALTY,
        missedHours: missedHrs,
        missedTasksCount: savedTasks.length,
        reason: 'दिवसभरात अजिबात अभ्यास झाला नाही (Zero Study Day)',
        details: `${savedTasks.length} पैकी ० टास्क्स पूर्ण`
      });
    } else if (incompleteTasks.length > 0) {
      // Partial study day: -10 XP per uncompleted task
      const penalty = incompleteTasks.length * MISSED_TASK_PENALTY;
      const missedMinutes = incompleteTasks.reduce((acc, t) => acc + parseDurationMinutes(t.duration), 0);
      const missedHrs = parseFloat((missedMinutes / 60).toFixed(1));
      totalXpDeducted += penalty;
      totalMissedHours += missedHrs;

      incompleteTasks.forEach(t => {
        newBacklogItems.push({
          id: `backlog_${Date.now()}_${t.id}`,
          originalId: t.id,
          title: t.title,
          duration: t.duration,
          missedDate: lastDateStr,
          subject: t.title.split(' ')[0] || 'General'
        });
      });

      newPenaltyLogs.push({
        id: `pen_${Date.now()}_1`,
        date: lastDateStr,
        type: 'partial_study',
        xpDeducted: penalty,
        missedHours: missedHrs,
        missedTasksCount: incompleteTasks.length,
        reason: `${incompleteTasks.length} टास्क्स अपूर्ण राहिले (Partial Study)`,
        details: `${savedTasks.length} पैकी ${completedTasks.length} पूर्ण, ${incompleteTasks.length} बाकी`
      });
    } else {
      // 100% completed day - No penalty, give bonus +50 XP!
      newPenaltyLogs.push({
        id: `pen_${Date.now()}_bonus`,
        date: lastDateStr,
        type: 'bonus',
        xpDeducted: -DAILY_COMPLETION_BONUS, // negative deduction = bonus!
        missedHours: 0,
        missedTasksCount: 0,
        reason: '🌟 १००% अभ्यास पूर्ण! (+५० XP बोनस मिळाला)',
        details: 'सर्व टास्क्स यशस्वीरीत्या पूर्ण!'
      });
    }
  }

  // 2. Audit any gap days in between (if user didn't open app for 2+ days)
  if (dayGap > 1) {
    const gapDaysCount = dayGap - 1;
    const gapPenalty = gapDaysCount * MISSED_DAY_PENALTY;
    const gapMissedHrs = gapDaysCount * 6.0;

    totalXpDeducted += gapPenalty;
    totalMissedHours += gapMissedHrs;

    newPenaltyLogs.push({
      id: `pen_${Date.now()}_gap`,
      date: `मागील ${gapDaysCount} दिवस गैरहजर`,
      type: 'absent_days',
      xpDeducted: gapPenalty,
      missedHours: gapMissedHrs,
      missedTasksCount: gapDaysCount * 8,
      reason: `मागील ${gapDaysCount} दिवस अभ्यास झाला नाही (Absent Days)`,
      details: `प्रत्येक दिवसासाठी -५० XP व ६ तास तूट`
    });
  }

  // Calculate new XP total (never less than 0)
  let updatedXpTotal = currentXp - totalXpDeducted;
  if (savedTasks.length > 0 && incompleteTasks.length === 0) {
    updatedXpTotal += DAILY_COMPLETION_BONUS;
  }
  updatedXpTotal = Math.max(0, parseFloat(updatedXpTotal.toFixed(2)));

  const updatedDeficitHours = parseFloat((currentDeficitHours + totalMissedHours).toFixed(1));
  const updatedTotalPenalties = currentTotalPenalties + Math.max(0, totalXpDeducted);

  const updatedPenaltyHistory = [...newPenaltyLogs, ...penaltyHistory].slice(0, 50);
  const updatedBacklogTasks = [...newBacklogItems, ...backlogTasks].slice(0, 100);

  // Advance topic indexes for completed tasks
  const newIndexes = { ...currentIndexes };
  const existingQueue = JSON.parse(localStorage.getItem('revision_queue') || '[]');
  const nowTime = new Date().getTime();

  savedTasks.forEach(t => {
    if (t.completed) {
      newIndexes[t.id] = (newIndexes[t.id] || 0) + 1;
      existingQueue.push({
        topicId: t.id,
        title: t.title,
        dueAt: nowTime + (7 * 24 * 60 * 60 * 1000)
      });
    }
  });

  // Generate clean reset tasks for the new day
  const resetTasks = savedTasks.map(t => {
    const nextTitle = getTitleForTask ? getTitleForTask(t.id, newIndexes[t.id] || 0) : t.title;
    return {
      id: t.id,
      title: nextTitle || t.title,
      duration: t.duration,
      completed: false
    };
  });

  return {
    totalXpDeducted,
    totalMissedHours,
    updatedXpTotal,
    updatedDeficitHours,
    updatedTotalPenalties,
    updatedPenaltyHistory,
    updatedBacklogTasks,
    newIndexes,
    resetTasks,
    existingQueue,
    dayGap,
    newPenaltyLogs,
    isBonusEarned: savedTasks.length > 0 && incompleteTasks.length === 0
  };
};

// Recover a backlog item when student studies extra to catch up
export const recoverBacklogItem = (backlogId) => {
  const state = getDeficitState();
  const targetItem = state.backlogTasks.find(b => b.id === backlogId);
  if (!targetItem) return null;

  const itemMins = parseDurationMinutes(targetItem.duration);
  const itemHrs = parseFloat((itemMins / 60).toFixed(1));

  const updatedBacklog = state.backlogTasks.filter(b => b.id !== backlogId);
  const updatedDeficitHours = Math.max(0, parseFloat((state.deficitHours - itemHrs).toFixed(1)));
  const updatedXpTotal = parseFloat((state.xpTotal + TASK_XP_REWARD).toFixed(2));

  const recoveryLog = {
    id: `rec_${Date.now()}`,
    date: getLogicalDateString(),
    type: 'recovered',
    xpDeducted: -TASK_XP_REWARD, // gained back
    missedHours: -itemHrs,
    reason: `🎯 बॅकलॉग भरून काढला: ${targetItem.title} (+१५ XP)`,
    details: `${itemHrs} तास अभ्यास तूट कमी झाली!`
  };

  const updatedHistory = [recoveryLog, ...state.penaltyHistory].slice(0, 50);

  return {
    recoveredItem: targetItem,
    itemHrs,
    xpReward: TASK_XP_REWARD,
    updatedDeficitHours,
    updatedXpTotal,
    updatedBacklog,
    updatedHistory
  };
};
