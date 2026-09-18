const db = require('../config/database');
const { awardXP, checkAndUnlockAchievements } = require('../utils/productivity');

exports.startFocusSession = async (req, res) => {
  try {
    const { task_id } = req.body;

    if (task_id) {
      const [tasks] = await db.query('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [task_id, req.user.id]);
      if (tasks.length === 0) {
        return res.status(404).json({ success: false, message: 'Associated task not found' });
      }
    }

    const [result] = await db.query(
      'INSERT INTO focus_sessions (user_id, task_id, duration_minutes) VALUES (?, ?, ?)',
      [req.user.id, task_id || null, 25]
    );

    return res.status(201).json({
      success: true,
      message: 'Focus session started',
      data: { session_id: result.insertId, started_at: new Date() }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.completeFocusSession = async (req, res) => {
  try {
    const { session_id, duration_minutes } = req.body;

    if (!session_id || !duration_minutes) {
      return res.status(400).json({ success: false, message: 'Please provide session_id and duration_minutes' });
    }

    const [sessions] = await db.query(
      'SELECT * FROM focus_sessions WHERE id = ? AND user_id = ?',
      [session_id, req.user.id]
    );

    if (sessions.length === 0) {
      return res.status(404).json({ success: false, message: 'Focus session not found' });
    }

    await db.query(
      'UPDATE focus_sessions SET duration_minutes = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ?',
      [duration_minutes, session_id]
    );

    const xpGained = 15;
    await awardXP(req.user.id, xpGained);
    await checkAndUnlockAchievements(req.user.id);

    return res.status(200).json({
      success: true,
      message: `Focus session completed! (+${xpGained} XP)`,
      data: { session_id, duration_minutes, xpGained }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFocusHistory = async (req, res) => {
  try {
    const [sessions] = await db.query(
      `SELECT f.*, t.title as task_title FROM focus_sessions f
       LEFT JOIN tasks t ON f.task_id = t.id
       WHERE f.user_id = ? ORDER BY f.started_at DESC`,
      [req.user.id]
    );

    return res.status(200).json({ success: true, data: sessions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFocusStats = async (req, res) => {
  try {
    const userId = req.user.id;

    const [totalRows] = await db.query(
      `SELECT SUM(duration_minutes) as totalMinutes, COUNT(*) as totalSessions 
       FROM focus_sessions WHERE user_id = ? AND completed_at IS NOT NULL`,
      [userId]
    );

    const [todayRows] = await db.query(
      `SELECT SUM(duration_minutes) as todayMinutes 
       FROM focus_sessions WHERE user_id = ? AND completed_at IS NOT NULL AND DATE(completed_at) = CURDATE()`,
      [userId]
    );

    const [weeklyRows] = await db.query(
      `SELECT SUM(duration_minutes) as weeklyMinutes 
       FROM focus_sessions WHERE user_id = ? AND completed_at IS NOT NULL AND completed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      data: {
        totalFocusMinutes: Number(totalRows[0].totalMinutes) || 0,
        totalSessions: Number(totalRows[0].totalSessions) || 0,
        todayFocusMinutes: Number(todayRows[0].todayMinutes) || 0,
        weeklyFocusMinutes: Number(weeklyRows[0].weeklyMinutes) || 0
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};