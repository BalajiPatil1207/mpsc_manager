const express = require('express');
const router = express.Router();
const { submitMockTest, getMockResults } = require('../controllers/mockTestController');

router.post('/', submitMockTest);
router.get('/user/:userId', getMockResults);

module.exports = router;
