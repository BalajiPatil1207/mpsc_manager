const express = require('express');
const router = express.Router();
const { getUserProfile, syncUserProfile } = require('../controllers/userController');
const { optionalAuth } = require('../middlewares/authMiddleware');

router.get('/:userId', getUserProfile);
router.post('/:userId/sync', optionalAuth, syncUserProfile);
router.put('/:userId', optionalAuth, syncUserProfile);

module.exports = router;
