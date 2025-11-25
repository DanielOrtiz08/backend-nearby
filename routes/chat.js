const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

router.post('/rooms', chatController.getOrCreateRoom);
router.get('/rooms', chatController.getUserRooms);
router.get('/rooms/:room_id/messages', chatController.getRoomMessages);
router.post('/messages', chatController.sendMessage);

module.exports = router;
