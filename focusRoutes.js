const express = require('express');
const router = express.Router();
const focusController = require('../controllers/focusController');
const authMiddleware = require('../middleware/authMiddleware');

router.use(authMiddleware);

router.post('/start', focusController.startFocusSession);
router.post('/complete', focusController.completeFocusSession);
router.get('/history', focusController.getFocusHistory);
router.get('/stats', focusController.getFocusStats);

module.exports = router;