const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const subtaskController = require('../controllers/subtaskController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

// Focus and Deadline endpoints (MUST be declared before /:id)
router.get('/focus-now', taskController.getFocusNow);
router.get('/deadline-risk', taskController.getDeadlineRisk);

// Task CRUD
router.post('/', taskController.createTask);
router.get('/', taskController.getTasks);
router.get('/:id', taskController.getTaskById);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);
router.patch('/:id/complete', taskController.completeTask);

// Subtask nested endpoints
router.post('/:taskId/subtasks', subtaskController.createSubtask);
router.get('/:taskId/subtasks', subtaskController.getSubtasks);

module.exports = router;