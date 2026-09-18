const db = require('../config/database');

const awardXP = async (userId, amount) => {
  const [users] = await db.query('SELECT xp, level FROM users WHERE id = ?', [userId]);
  if (!users.length) return;

  const currentXp = users[0].xp + amount;
  const newLevel = Math.floor(currentXp / 100) + 1;

  await db.query('UPDATE users SET xp = ?, level = ? WHERE id = ?', [currentXp, newLevel, userId]);
};

const calculateStreak = async (userId) => {
  const [activityRows] = await db.query(`
    SELECT DISTINCT activity_date FROM (
      SELECT DATE(updated_at) as activity_date FROM tasks WHERE user_id = ? AND status = 'Completed'
      UNION
      SELECT DATE(completed_at) as activity_date FROM focus_sessions WHERE user_id = ? AND completed_at IS NOT NULL
    ) AS combined_activities
    ORDER BY activity_date DESC
  `, [userId, userId]);

  if (!activityRows.length) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const dates = activityRows.map(r => new Date(r.activity_date));
  let currentStreak = 0;
  let longestStreak = 0;
  let tempStreak = 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Check if active today or yesterday
  const lastActive = new Date(dates[0]);
  lastActive.setHours(0, 0, 0, 0);

  if (lastActive.getTime() === today.getTime() || lastActive.getTime() === yesterday.getTime()) {
    let checkDate = new Date(lastActive);
    for (let i = 0; i < dates.length; i++) {
      const d = new Date(dates[i]);
      d.setHours(0, 0, 0, 0);

      if (d.getTime() === checkDate.getTime()) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Calculate longest streak
  for (let i = 0; i < dates.length; i++) {
    tempStreak = 1;
    let curr = new Date(dates[i]);
    curr.setHours(0, 0, 0, 0);

    for (let j = i + 1; j < dates.length; j++) {
      let prev = new Date(dates[j]);
      prev.setHours(0, 0, 0, 0);

      let expected = new Date(curr);
      expected.setDate(expected.getDate() - 1);

      if (prev.getTime() === expected.getTime()) {
        tempStreak++;
        curr = prev;
      } else {
        break;
      }
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
  }

  return { currentStreak, longestStreak };
};

const checkAndUnlockAchievements = async (userId) => {
  const [completedTasks] = await db.query(
    'SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND status = "Completed"', 
    [userId]
  );
  const [sessions] = await db.query(
    'SELECT COUNT(*) as count FROM focus_sessions WHERE user_id = ? AND completed_at IS NOT NULL', 
    [userId]
  );
  const { currentStreak } = await calculateStreak(userId);

  const taskCount = completedTasks[0].count;
  const sessionCount = sessions[0].count;

  const achievementsToUnlock = [];

  if (taskCount >= 1) {
    achievementsToUnlock.push({
      type: 'First Task',
      title: 'First Step',
      description: 'Completed your first task!'
    });
  }
  if (currentStreak >= 3) {
    achievementsToUnlock.push({
      type: '3-Day Streak',
      title: 'Consistency Starter',
      description: 'Maintained a 3-day productive streak.'
    });
  }
  if (currentStreak >= 7) {
    achievementsToUnlock.push({
      type: '7-Day Streak',
      title: 'Unstoppable Force',
      description: 'Maintained a 7-day productive streak.'
    });
  }
  if (sessionCount >= 5) {
    achievementsToUnlock.push({
      type: 'Focus Master',
      title: 'Focus Master',
      description: 'Completed 5 focus sessions.'
    });
  }
  if (taskCount >= 100) {
    achievementsToUnlock.push({
      type: 'Century',
      title: 'Century Club',
      description: 'Completed 100 tasks!'
    });
  }

  for (const item of achievementsToUnlock) {
    await db.query(
      `INSERT IGNORE INTO achievements (user_id, achievement_type, title, description) 
       VALUES (?, ?, ?, ?)`,
      [userId, item.type, item.title, item.description]
    );
  }
};

module.exports = { awardXP, calculateStreak, checkAndUnlockAchievements };