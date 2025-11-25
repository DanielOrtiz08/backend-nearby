const express = require('express');
const router = express.Router();
const reviewController = require('../controllers/reviewController');
const { authMiddleware } = require('../middleware/auth');

// Public routes
router.get('/property/:property_id', reviewController.getPropertyReviews);

// Protected routes
router.post('/', authMiddleware, reviewController.createReview);
router.get('/my-reviews', authMiddleware, reviewController.getUserReviews);
router.delete('/:id', authMiddleware, reviewController.deleteReview);

module.exports = router;
