const express = require('express');
const router = express.Router();
const { getMistakes, resolveMistake } = require('../controllers/mistakeController');

router.get('/user/:userId', getMistakes);
router.patch('/:mistakeId/resolve', resolveMistake);

module.exports = router;
