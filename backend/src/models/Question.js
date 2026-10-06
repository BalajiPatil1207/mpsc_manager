class Question {
  constructor(question, options, correctAnswerIndex, explanation, subject, topic, difficulty = 'medium') {
    this.question = question;
    this.options = options;
    this.correctAnswerIndex = correctAnswerIndex;
    this.explanation = explanation;
    this.subject = subject;
    this.topic = topic;
    this.difficulty = difficulty;
  }

  toFirestore() {
    return {
      question: this.question,
      options: this.options,
      correctAnswerIndex: this.correctAnswerIndex,
      explanation: this.explanation,
      subject: this.subject,
      topic: this.topic,
      difficulty: this.difficulty
    };
  }
}

module.exports = Question;
