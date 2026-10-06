class MistakeBookItem {
  constructor(userId, questionId, chosenAnswerIndex, reason = '') {
    this.userId = userId;
    this.questionId = questionId; // Ref to Question
    this.chosenAnswerIndex = chosenAnswerIndex;
    this.reason = reason; // e.g. "Calculation error"
    this.understood = false;
    this.loggedAt = new Date().toISOString();
  }

  toFirestore() {
    return {
      userId: this.userId,
      questionId: this.questionId,
      chosenAnswerIndex: this.chosenAnswerIndex,
      reason: this.reason,
      understood: this.understood,
      loggedAt: this.loggedAt
    };
  }
}

module.exports = MistakeBookItem;
