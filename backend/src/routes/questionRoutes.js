const express = require('express');
const router = express.Router();
const { getQuestionsForTopic } = require('../controllers/questionController');

router.get('/', getQuestionsForTopic);

module.exports = router;
