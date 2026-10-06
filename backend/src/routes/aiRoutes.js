const express = require('express');
const router = express.Router();
const { getCoachAdvice } = require('../controllers/aiController');

router.post('/coach', getCoachAdvice);

module.exports = router;
