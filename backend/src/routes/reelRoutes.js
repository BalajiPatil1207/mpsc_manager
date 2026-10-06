const express = require('express');
const router = express.Router();
const { createReel, getAllReels, getReel, deleteReel } = require('../controllers/reelController');

router.post('/', createReel);
router.get('/all', getAllReels);
router.get('/:reelId', getReel);
router.delete('/:reelId', deleteReel);

module.exports = router;
