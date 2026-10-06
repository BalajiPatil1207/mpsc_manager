const express = require('express');
const router = express.Router();
const { createTest, getTest, getAllTests, generateMegaTest, submitTest, deleteTest, updateTest } = require('../controllers/customTestController');

router.get('/all', getAllTests);
router.post('/mega-generate', generateMegaTest);
router.post('/:testId/submit', submitTest);
router.delete('/:testId', deleteTest);
router.put('/:testId', updateTest);
router.post('/', createTest);
router.get('/:testId', getTest);

module.exports = router;
