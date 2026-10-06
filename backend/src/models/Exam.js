class Exam {
  constructor(name, syllabusKey, targetDate) {
    this.name = name;
    this.syllabusKey = syllabusKey;
    this.targetDate = targetDate;
    this.createdAt = new Date().toISOString();
  }

  toFirestore() {
    return {
      name: this.name,
      syllabusKey: this.syllabusKey,
      targetDate: this.targetDate,
      createdAt: this.createdAt
    };
  }
}

module.exports = Exam;
