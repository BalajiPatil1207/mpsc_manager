// Firestore doesn't enforce schema, but this serves as a data model reference
class StudyPlan {
  constructor(userId, examId, syllabusKey, targetDate, dailyStudyHours, totalTopics, status = 'active') {
    this.userId = userId;
    this.examId = examId;
    this.syllabusKey = syllabusKey;
    this.targetDate = targetDate;
    this.dailyStudyHours = dailyStudyHours;
    this.totalTopics = totalTopics;
    this.status = status;
    this.createdAt = new Date().toISOString();
  }

  toFirestore() {
    return {
      userId: this.userId,
      examId: this.examId,
      syllabusKey: this.syllabusKey,
      targetDate: this.targetDate,
      dailyStudyHours: this.dailyStudyHours,
      totalTopics: this.totalTopics,
      status: this.status,
      createdAt: this.createdAt
    };
  }
}

module.exports = StudyPlan;
