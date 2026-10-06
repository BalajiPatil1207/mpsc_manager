const express = require('express');
const router = express.Router();
const { getProfiles, getSyllabus } = require('../controllers/examController');

router.get('/profiles', getProfiles);
router.get('/syllabus/:syllabusKey', getSyllabus);

module.exports = router;
