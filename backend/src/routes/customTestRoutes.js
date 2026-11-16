const express = require('express');
const router = express.Router();
const { createTest, getTest, getAllTests, generateMegaTest, submitTest, deleteTest, updateTest, getTestLeaderboard, getGlobalLeaderboard, fixAnswer, editQuestion } = require('../controllers/customTestController');
const { optionalAuth, verifyAuth } = require('../middlewares/authMiddleware');

router.get('/all', getAllTests);
router.get('/global-leaderboard', getGlobalLeaderboard);
router.post('/mega-generate', generateMegaTest);
router.get('/:testId/leaderboard', getTestLeaderboard);
router.post('/:testId/submit', optionalAuth, submitTest);
router.patch('/:testId/fix-answer', optionalAuth, fixAnswer);
router.patch('/:testId/edit-question', optionalAuth, editQuestion);
router.delete('/:testId', optionalAuth, deleteTest);
router.put('/:testId', optionalAuth, updateTest);
router.post('/', optionalAuth, createTest);
router.get('/:testId', getTest);

module.exports = router;
