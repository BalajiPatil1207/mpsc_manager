const express = require('express');
const router = express.Router();
const { generatePlan, getPlan } = require('../controllers/planController');

router.post('/generate', generatePlan);
router.get('/user/:userId', getPlan);

module.exports = router;
