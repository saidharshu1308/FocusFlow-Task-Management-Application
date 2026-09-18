const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.get('/dashboard', analyticsController.getDashboard);
router.get('/streak', analyticsController.getStreak);
router.get('/weekly', analyticsController.getWeekly);
router.get('/categories', analyticsController.getCategories);

// Mood tracking
router.post('/mood', analyticsController.addMood);
router.get('/mood', analyticsController.getMoodHistory);

module.exports = router;