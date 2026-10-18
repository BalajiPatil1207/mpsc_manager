const express = require('express');
const router = express.Router();
const { createTest, getTest, getAllTests, generateMegaTest, submitTest, deleteTest, updateTest, getTestLeaderboard, getGlobalLeaderboard, fixAnswer } = require('../controllers/customTestController');

router.get('/all', getAllTests);
router.get('/global-leaderboard', getGlobalLeaderboard);
router.post('/mega-generate', generateMegaTest);
router.get('/:testId/leaderboard', getTestLeaderboard);
router.post('/:testId/submit', submitTest);
router.patch('/:testId/fix-answer', fixAnswer);
router.delete('/:testId', deleteTest);
router.put('/:testId', updateTest);
router.post('/', createTest);
router.get('/:testId', getTest);

module.exports = router;
