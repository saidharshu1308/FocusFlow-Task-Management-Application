const db = require('../config/database');
const { calculateFocusScore } = require('../utils/focusScore');
const { awardXP, checkAndUnlockAchievements } = require('../utils/productivity');

exports.createTask = async (req, res) => {
  try {
    const { title, description, category, priority, status, due_date, estimated_minutes, energy_level } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Task title is required' });
    }

    const [result] = await db.query(
      `INSERT INTO tasks (user_id, title, description, category, priority, status, due_date, estimated_minutes, energy_level)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        title,
        description || '',
        category || 'Personal',
        priority || 'Medium',
        status || 'Todo',
        due_date || null,
        estimated_minutes || 30,
        energy_level || 'Medium'
      ]
    );

    const [newTask] = await db.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);

    return res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: newTask[0]
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTasks = async (req, res) => {
  try {
    const { category, priority, status, search } = req.query;
    let query = 'SELECT * FROM tasks WHERE user_id = ?';
    const queryParams = [req.user.id];

    if (category) {
      query += ' AND category = ?';
      queryParams.push(category);
    }
    if (priority) {
      query += ' AND priority = ?';
      queryParams.push(priority);
    }
    if (status) {
      query += ' AND status = ?';
      queryParams.push(status);
    }
    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      queryParams.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const [tasks] = await db.query(query, queryParams);
    return res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getTaskById = async (req, res) => {
  try {
    const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.user.id
    ]);

    if (tasks.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const [subtasks] = await db.query('SELECT * FROM subtasks WHERE task_id = ?', [req.params.id]);

    return res.status(200).json({
      success: true,
      data: { ...tasks[0], subtasks }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { title, description, category, priority, status, due_date, estimated_minutes, energy_level } = req.body;

    const [existing] = await db.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.user.id
    ]);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await db.query(
      `UPDATE tasks SET title = ?, description = ?, category = ?, priority = ?, status = ?, due_date = ?, estimated_minutes = ?, energy_level = ?
       WHERE id = ? AND user_id = ?`,
      [
        title || existing[0].title,
        description !== undefined ? description : existing[0].description,
        category || existing[0].category,
        priority || existing[0].priority,
        status || existing[0].status,
        due_date || existing[0].due_date,
        estimated_minutes || existing[0].estimated_minutes,
        energy_level || existing[0].energy_level,
        req.params.id,
        req.user.id
      ]
    );

    const [updated] = await db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    return res.status(200).json({ success: true, message: 'Task updated successfully', data: updated[0] });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteTask = async (req, res) => {
  try {
    const [existing] = await db.query('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.user.id
    ]);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    await db.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    return res.status(200).json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.completeTask = async (req, res) => {
  try {
    const [existing] = await db.query('SELECT * FROM tasks WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.user.id
    ]);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const task = existing[0];
    if (task.status === 'Completed') {
      return res.status(400).json({ success: false, message: 'Task is already completed' });
    }

    await db.query('UPDATE tasks SET status = "Completed" WHERE id = ?', [req.params.id]);

    let xpGained = 10;
    if (task.priority === 'High') xpGained += 20;

    if (task.due_date) {
      const today = new Date();
      const dueDate = new Date(task.due_date);
      if (today <= dueDate) xpGained += 10;
    }

    await awardXP(req.user.id, xpGained);
    await checkAndUnlockAchievements(req.user.id);

    return res.status(200).json({
      success: true,
      message: `Task marked as completed! (+${xpGained} XP)`,
      data: { taskId: task.id, status: 'Completed', xpGained }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getFocusNow = async (req, res) => {
  try {
    const [tasks] = await db.query(
      'SELECT * FROM tasks WHERE user_id = ? AND status != "Completed"',
      [req.user.id]
    );

    if (tasks.length === 0) {
      return res.status(200).json({ success: true, message: 'No pending tasks found', data: null });
    }

    let topTask = null;
    let highestScore = -1;

    tasks.forEach(task => {
      const score = calculateFocusScore(task);
      if (score > highestScore) {
        highestScore = score;
        topTask = task;
      }
    });

    let reason = 'Balanced priority and schedule';
    if (topTask.priority === 'High') reason = 'High priority task requiring immediate action';
    if (topTask.due_date && new Date(topTask.due_date) <= new Date()) reason = 'Task is near or past its due date';

    return res.status(200).json({
      success: true,
      data: {
        task: topTask,
        focusScore: highestScore,
        reason
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getDeadlineRisk = async (req, res) => {
  try {
    const [tasks] = await db.query(
      'SELECT * FROM tasks WHERE user_id = ? AND status != "Completed"',
      [req.user.id]
    );

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const categorized = tasks.map(task => {
      let riskLevel = 'On Track';

      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        dueDate.setHours(0, 0, 0, 0);

        const diffDays = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
          riskLevel = 'Overdue';
        } else if (diffDays === 0 || (diffDays <= 1 && task.priority === 'High')) {
          riskLevel = 'At Risk';
        } else if (diffDays <= 3) {
          riskLevel = 'Approaching';
        }
      }

      return { ...task, riskLevel };
    });

    return res.status(200).json({ success: true, data: categorized });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};