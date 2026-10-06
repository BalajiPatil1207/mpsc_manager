const express = require('express');
const router = express.Router();
const { getDailyTasks, updateTaskStatus, createTask } = require('../controllers/taskController');

router.get('/', getDailyTasks);
router.post('/', createTask);
router.patch('/:taskId/status', updateTaskStatus);

module.exports = router;
