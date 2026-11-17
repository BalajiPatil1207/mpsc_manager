class DailyTask {
  constructor(planId, userId, title, type, estimatedMinutes, startTime = null, extra = {}) {
    this.planId = planId;
    this.userId = userId;
    this.title = title; // e.g. "Polity - Fundamental Rights"
    this.type = type; // e.g. "study", "practice", "revision", "mock"
    this.estimatedMinutes = estimatedMinutes;
    this.startTime = startTime; // e.g. "06:00"
    this.status = 'pending'; // pending, in-progress, completed, missed
    this.date = extra.date || new Date().toISOString().split('T')[0];
    this.group = extra.group || 'A'; // 'A' (Mon,Wed,Fri), 'B' (Tue,Thu,Sat), 'C' (Sunday)
    this.subject = extra.subject || 'General';
    this.studyType = extra.studyType || 'संकल्पनात्मक अभ्यास';
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
      date: this.date,
      group: this.group,
      subject: this.subject,
      studyType: this.studyType
    };
  }
}

module.exports = DailyTask;
