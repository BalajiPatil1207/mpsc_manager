import test from 'node:test';
import assert from 'node:assert/strict';

// Mock localStorage for Node test environment
const mockStorage = {};
global.localStorage = {
  getItem: (key) => (key in mockStorage ? mockStorage[key] : null),
  setItem: (key, val) => { mockStorage[key] = String(val); },
  removeItem: (key) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach(k => delete mockStorage[k]); },
  key: (i) => Object.keys(mockStorage)[i] || null,
  get length() { return Object.keys(mockStorage).length; }
};

import { 
  parseDurationMinutes, 
  calculateDayGap, 
  calculateTodayProgress,
  checkDeficitResetEligibility,
  recordDeficitReset
} from '../utils/deficitTracker.js';

import { 
  calculateNextSm2Interval, 
  getStageFromInterval,
  getCardIntervalPreviews
} from '../utils/srsEngine.js';

// ==========================================
// 1. Deficit Tracker Unit Tests
// ==========================================

test('parseDurationMinutes correctly parses hours and minutes', () => {
  assert.equal(parseDurationMinutes('1 hr'), 60);
  assert.equal(parseDurationMinutes('2.5 hr'), 150);
  assert.equal(parseDurationMinutes('45 min'), 45);
  assert.equal(parseDurationMinutes(''), 30);
});

test('calculateDayGap computes correct day difference between dates', () => {
  assert.equal(calculateDayGap('10/05/2026', '10/05/2026'), 0);
  assert.equal(calculateDayGap('10/05/2026', '11/05/2026'), 1);
  assert.equal(calculateDayGap('10/05/2026', '15/05/2026'), 5);
});

test('calculateTodayProgress correctly analyzes task completion', () => {
  const sampleTasks = [
    { id: 't1', title: 'राज्यघटना कलम १४', duration: '1 hr', completed: true },
    { id: 't2', title: 'महाराष्ट्र भूगोल घाट', duration: '30 min', completed: false },
    { id: 't3', title: 'चालू घडामोडी', duration: '30 min', completed: true },
  ];

  const progress = calculateTodayProgress(sampleTasks);
  assert.equal(progress.totalTasks, 3);
  assert.equal(progress.completedCount, 2);
  assert.equal(progress.incompleteCount, 1);
  assert.equal(progress.completedHours, 1.5);
  assert.equal(progress.remainingHours, 0.5);
  assert.equal(progress.percent, 67);
  assert.equal(progress.isComplete, false);
});

test('checkDeficitResetEligibility enforces 30-day anti-abuse cooldown', () => {
  localStorage.clear();

  // Test 1: Brand new user with no previous reset -> Allowed
  const initCheck = checkDeficitResetEligibility();
  assert.equal(initCheck.allowed, true);
  assert.equal(initCheck.daysRemaining, 0);

  // Test 2: User resets deficit today -> Cooldown triggered
  recordDeficitReset();
  const immediateCheck = checkDeficitResetEligibility();
  assert.equal(immediateCheck.allowed, false);
  assert.equal(immediateCheck.daysRemaining, 30);

  // Test 3: 10 days elapsed -> Still blocked (20 days remaining)
  const tenDaysAgo = Date.now() - 10 * 24 * 60 * 60 * 1000;
  localStorage.setItem('study_last_deficit_reset_time', tenDaysAgo.toString());
  const tenDaysCheck = checkDeficitResetEligibility();
  assert.equal(tenDaysCheck.allowed, false);
  assert.equal(tenDaysCheck.daysRemaining, 20);

  // Test 4: 31 days elapsed -> Allowed again
  const thirtyOneDaysAgo = Date.now() - 31 * 24 * 60 * 60 * 1000;
  localStorage.setItem('study_last_deficit_reset_time', thirtyOneDaysAgo.toString());
  const eligibleCheck = checkDeficitResetEligibility();
  assert.equal(eligibleCheck.allowed, true);
  assert.equal(eligibleCheck.daysRemaining, 0);
});

// ==========================================
// 2. SM-2 Spaced Repetition Engine Unit Tests
// ==========================================

test('calculateNextSm2Interval: "hard" rating resets repetitions and interval to 1', () => {
  const card = { repetitions: 3, interval: 15, easeFactor: 2.5 };
  const result = calculateNextSm2Interval(card, 'hard');

  assert.equal(result.nextRepetitions, 0);
  assert.equal(result.nextInterval, 1);
  assert.equal(result.nextEf, 2.3); // EF decreased by 0.2
  assert.equal(result.nextStage, 1);
});

test('calculateNextSm2Interval: "good" progression scales smoothly', () => {
  // First review: interval 1
  const card1 = { repetitions: 0, interval: 1, easeFactor: 2.5 };
  const r1 = calculateNextSm2Interval(card1, 'good');
  assert.equal(r1.nextRepetitions, 1);
  assert.equal(r1.nextInterval, 1);

  // Second review: interval 3
  const card2 = { repetitions: 1, interval: 1, easeFactor: 2.5 };
  const r2 = calculateNextSm2Interval(card2, 'good');
  assert.equal(r2.nextRepetitions, 2);
  assert.equal(r2.nextInterval, 3);

  // Third review: interval = 3 * 2.5 = 8 (Stage 4)
  const card3 = { repetitions: 2, interval: 3, easeFactor: 2.5 };
  const r3 = calculateNextSm2Interval(card3, 'good');
  assert.equal(r3.nextRepetitions, 3);
  assert.equal(r3.nextInterval, 8);
  assert.equal(r3.nextStage, 4);
});

test('calculateNextSm2Interval: "easy" accelerates intervals with boost', () => {
  const card = { repetitions: 2, interval: 6, easeFactor: 2.5 };
  const result = calculateNextSm2Interval(card, 'easy');

  assert.equal(result.nextRepetitions, 3);
  // Interval scaled by 2.5 * 1.3: 6 * 3.25 = 20
  assert.ok(result.nextInterval >= 19);
  assert.equal(result.nextEf, 2.65); // EF increased
  assert.ok(result.nextStage >= 4);
});

test('getStageFromInterval correctly maps interval days to 1-5 stages', () => {
  assert.equal(getStageFromInterval(1), 1);
  assert.equal(getStageFromInterval(3), 2);
  assert.equal(getStageFromInterval(7), 3);
  assert.equal(getStageFromInterval(14), 4);
  assert.equal(getStageFromInterval(30), 5);
});

test('getCardIntervalPreviews returns preview for all 3 buttons', () => {
  const card = { repetitions: 1, interval: 1, easeFactor: 2.5 };
  const previews = getCardIntervalPreviews(card);

  assert.equal(previews.hard, 1);
  assert.equal(previews.good, 3);
  assert.equal(previews.easy, 6);
});
