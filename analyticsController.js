const db = require('../config/database');
const { calculateStreak } = require('../utils/productivity');

exports.getDashboard = async (req, res) => {
  try {
    const userId = req.user.id;

    const [tasks] = await db.query('SELECT status, due_date FROM tasks WHERE user_id = ?', [userId]);
    const [userRows] = await db.query('SELECT xp, level FROM users WHERE id = ?', [userId]);

    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const pending = total - completed;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = tasks.filter(t => t.status !== 'Completed' && t.due_date && new Date(t.due_date) < today).length;
    const completionPercentage = total > 0 ? Math.round((completed / total) * 100) : 0;

    const [focusRows] = await db.query(
      'SELECT SUM(duration_minutes) as totalMinutes FROM focus_sessions WHERE user_id = ? AND completed_at IS NOT NULL',
      [userId]
    );

    const { currentStreak } = await calculateStreak(userId);

    return res.status(200).json({
      success: true,
      data: {
        totalTasks: total,
        completedTasks: completed,
        pendingTasks: pending,
        overdueTasks: overdue,
        completionPercentage,
        totalFocusTimeMinutes: Number(focusRows[0].totalMinutes) || 0,
        currentStreak,
        xp: userRows[0]?.xp || 0,
        level: userRows[0]?.level || 1
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getStreak = async (req, res) => {
  try {
    const streaks = await calculateStreak(req.user.id);
    return res.status(200).json({ success: true, data: streaks });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getWeekly = async (req, res) => {
  try {
    const userId = req.user.id;
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const weeklyData = days.map(day => ({
      day,
      tasksCompleted: 0,
      focusMinutes: 0
    }));

    const [completedTasks] = await db.query(
      `SELECT DAYOFWEEK(updated_at) as dayIndex, COUNT(*) as count 
       FROM tasks WHERE user_id = ? AND status = 'Completed' AND updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY dayIndex`,
      [userId]
    );

    completedTasks.forEach(row => {
      const idx = row.dayIndex - 1; // MySQL DAYOFWEEK: 1=Sun, 2=Mon...
      weeklyData[idx].tasksCompleted = row.count;
    });

    const [focusSessions] = await db.query(
      `SELECT DAYOFWEEK(completed_at) as dayIndex, SUM(duration_minutes) as minutes 
       FROM focus_sessions WHERE user_id = ? AND completed_at IS NOT NULL AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY dayIndex`,
      [userId]
    );

    focusSessions.forEach(row => {
      const idx = row.dayIndex - 1;
      weeklyData[idx].focusMinutes = Number(row.minutes) || 0;
    });

    return res.status(200).json({ success: true, data: weeklyData });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const [categories] = await db.query(
      `SELECT category, COUNT(*) as count, SUM(estimated_minutes) as estimatedMinutes 
       FROM tasks WHERE user_id = ? GROUP BY category`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.addMood = async (req, res) => {
  try {
    const { mood, date } = req.body;

    if (!mood || !date) {
      return res.status(400).json({ success: false, message: 'Please provide mood and date' });
    }

    await db.query(
      `INSERT INTO mood_entries (user_id, mood, date) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE mood = VALUES(mood)`,
      [req.user.id, mood, date]
    );

    return res.status(201).json({ success: true, message: 'Mood recorded successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMoodHistory = async (req, res) => {
  try {
    const [moods] = await db.query('SELECT * FROM mood_entries WHERE user_id = ? ORDER BY date DESC', [req.user.id]);
    return res.status(200).json({ success: true, data: moods });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};