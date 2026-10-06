class DailyTask {
  constructor(planId, userId, title, type, estimatedMinutes, startTime = null) {
    this.planId = planId;
    this.userId = userId;
    this.title = title; // e.g. "Maths - Percentage"
    this.type = type; // e.g. "study", "practice", "revision", "mock"
    this.estimatedMinutes = estimatedMinutes;
    this.startTime = startTime; // e.g. "06:00"
    this.status = 'pending'; // pending, in-progress, completed, missed
    this.date = new Date().toISOString().split('T')[0]; 
  }

  toFirestore() {
    return {
      planId: this.planId,
      userId: this.userId,
      title: this.title,
      type: this.type,
      estimatedMinutes: this.estimatedMinutes,
      startTime: this.startTime,
      status: this.status,
      date: this.date
    };
  }
}

module.exports = DailyTask;
