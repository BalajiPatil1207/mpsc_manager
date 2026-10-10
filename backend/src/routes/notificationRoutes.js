const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');

router.post('/subscribe', notificationController.subscribe);
router.post('/test', notificationController.testPush);
router.get('/force-reminders', async (req, res) => {
    try {
        await notificationController.checkAndSendReminders();
        res.json({ success: true, message: "Reminders triggered manually" });
    } catch(err) {
        res.status(500).json({ error: err.message });
    }
});
module.exports = router;
