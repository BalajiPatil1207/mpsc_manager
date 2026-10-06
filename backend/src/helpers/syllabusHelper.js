const fs = require('fs');
const path = require('path');

const syllabusData = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../../mahaprep_ai_master_syllabus.json'), 'utf8')
);

module.exports = syllabusData;
