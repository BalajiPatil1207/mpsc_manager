class User {
  constructor(name, email, currentExam = null) {
    this.name = name;
    this.email = email;
    this.currentExam = currentExam;
    this.xp = 0;
    this.joinedAt = new Date().toISOString();
  }

  toFirestore() {
    return {
      name: this.name,
      email: this.email,
      currentExam: this.currentExam,
      xp: this.xp,
      joinedAt: this.joinedAt
    };
  }
}

module.exports = User;
