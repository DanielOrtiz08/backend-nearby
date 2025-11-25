const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authMiddleware } = require('../middleware/auth');

// All routes require authentication
router.use(authMiddleware);

// Favorites
router.post('/favorites', userController.addFavorite);
router.delete('/favorites/:property_id', userController.removeFavorite);
router.get('/favorites', userController.getFavorites);

// Messages
router.post('/messages', userController.sendMessage);
router.get('/messages', userController.getMessages);
router.put('/messages/:id/read', userController.markAsRead);

module.exports = router;
