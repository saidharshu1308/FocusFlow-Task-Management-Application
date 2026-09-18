const db = require('../config/database');

exports.createSubtask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { title } = req.body;

    if (!title) {
      return res.status(400).json({ success: false, message: 'Subtask title is required' });
    }

    const [tasks] = await db.query('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user.id]);
    if (tasks.length === 0) {
      return res.status(404).json({ success: false, message: 'Parent task not found' });
    }

    const [result] = await db.query(
      'INSERT INTO subtasks (task_id, title) VALUES (?, ?)',
      [taskId, title]
    );

    return res.status(201).json({
      success: true,
      message: 'Subtask created successfully',
      data: { id: result.insertId, task_id: Number(taskId), title, completed: false }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getSubtasks = async (req, res) => {
  try {
    const { taskId } = req.params;

    const [tasks] = await db.query('SELECT id FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user.id]);
    if (tasks.length === 0) {
      return res.status(404).json({ success: false, message: 'Parent task not found' });
    }

    const [subtasks] = await db.query('SELECT * FROM subtasks WHERE task_id = ?', [taskId]);
    return res.status(200).json({ success: true, data: subtasks });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateSubtask = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, completed } = req.body;

    const [subtasks] = await db.query(
      `SELECT s.* FROM subtasks s 
       JOIN tasks t ON s.task_id = t.id 
       WHERE s.id = ? AND t.user_id = ?`,
      [id, req.user.id]
    );

    if (subtasks.length === 0) {
      return res.status(404).json({ success: false, message: 'Subtask not found' });
    }

    await db.query(
      'UPDATE subtasks SET title = ?, completed = ? WHERE id = ?',
      [
        title !== undefined ? title : subtasks[0].title,
        completed !== undefined ? completed : subtasks[0].completed,
        id
      ]
    );

    return res.status(200).json({ success: true, message: 'Subtask updated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.completeSubtask = async (req, res) => {
  try {
    const { id } = req.params;

    const [subtasks] = await db.query(
      `SELECT s.* FROM subtasks s 
       JOIN tasks t ON s.task_id = t.id 
       WHERE s.id = ? AND t.user_id = ?`,
      [id, req.user.id]
    );

    if (subtasks.length === 0) {
      return res.status(404).json({ success: false, message: 'Subtask not found' });
    }

    await db.query('UPDATE subtasks SET completed = TRUE WHERE id = ?', [id]);
    return res.status(200).json({ success: true, message: 'Subtask marked as complete' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteSubtask = async (req, res) => {
  try {
    const { id } = req.params;

    const [subtasks] = await db.query(
      `SELECT s.* FROM subtasks s 
       JOIN tasks t ON s.task_id = t.id 
       WHERE s.id = ? AND t.user_id = ?`,
      [id, req.user.id]
    );

    if (subtasks.length === 0) {
      return res.status(404).json({ success: false, message: 'Subtask not found' });
    }

    await db.query('DELETE FROM subtasks WHERE id = ?', [id]);
    return res.status(200).json({ success: true, message: 'Subtask deleted successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};