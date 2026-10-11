const express = require('express');
const router = express.Router();
const { getCoachAdvice, explainQuestion } = require('../controllers/aiController');

router.post('/coach', getCoachAdvice);
router.post('/explain', explainQuestion);

module.exports = router;
