class MockTest {
  constructor(userId, examId, title, totalQuestions, score = 0, accuracy = 0, timeTaken = 0) {
    this.userId = userId;
    this.examId = examId;
    this.title = title; // e.g. MPSC MOCK #08
    this.totalQuestions = totalQuestions;
    this.score = score;
    this.accuracy = accuracy;
    this.timeTaken = timeTaken;
    this.completedAt = new Date().toISOString();
  }

  toFirestore() {
    return {
      userId: this.userId,
      examId: this.examId,
      title: this.title,
      totalQuestions: this.totalQuestions,
      score: this.score,
      accuracy: this.accuracy,
      timeTaken: this.timeTaken,
      completedAt: this.completedAt
    };
  }
}

module.exports = MockTest;
