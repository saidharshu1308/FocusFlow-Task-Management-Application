const db = require('../config/database');

exports.getAchievements = async (req, res) => {
  try {
    const allPossible = [
      { type: 'First Task', title: 'First Step', description: 'Completed your first task!' },
      { type: '3-Day Streak', title: 'Consistency Starter', description: 'Maintained a 3-day productive streak.' },
      { type: '7-Day Streak', title: 'Unstoppable Force', description: 'Maintained a 7-day productive streak.' },
      { type: 'Focus Master', title: 'Focus Master', description: 'Completed 5 focus sessions.' },
      { type: 'Speed Runner', title: 'Speed Runner', description: 'Completed a task in less than 15 minutes.' },
      { type: 'Century', title: 'Century Club', description: 'Completed 100 tasks!' }
    ];

    const [unlocked] = await db.query('SELECT * FROM achievements WHERE user_id = ?', [req.user.id]);
    const unlockedMap = new Set(unlocked.map(a => a.achievement_type));

    const result = allPossible.map(item => ({
      ...item,
      unlocked: unlockedMap.has(item.type),
      unlocked_at: unlocked.find(a => a.achievement_type === item.type)?.unlocked_at || null
    }));

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};