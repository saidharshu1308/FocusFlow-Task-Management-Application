const express = require('express');
const router = express.Router();
const subtaskController = require('../controllers/subtaskController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.put('/:id', subtaskController.updateSubtask);
router.patch('/:id/complete', subtaskController.completeSubtask);
router.delete('/:id', subtaskController.deleteSubtask);

module.exports = router;