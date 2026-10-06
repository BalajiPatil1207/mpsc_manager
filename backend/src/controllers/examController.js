const syllabusData = require('../helpers/syllabusHelper');

exports.getProfiles = (req, res) => {
  res.json({ success: true, data: syllabusData.exam_profiles });
};

exports.getSyllabus = (req, res) => {
  const { syllabusKey } = req.params;
  const syllabus = syllabusData.syllabus[syllabusKey];
  if (!syllabus) {
    return res.status(404).json({ success: false, error: 'Syllabus not found' });
  }
  res.json({ success: true, data: syllabus });
};
