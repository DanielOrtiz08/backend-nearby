const express = require('express');
const router = express.Router();
const propertyController = require('../controllers/propertyController');
const { authMiddleware, isOwner } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Public routes
router.get('/', propertyController.getProperties);
router.get('/:id', propertyController.getPropertyById);

// Protected routes (owner only)
router.post('/', authMiddleware, isOwner, upload.array('images', 10), propertyController.createProperty);
router.put('/:id', authMiddleware, isOwner, propertyController.updateProperty);
router.delete('/:id', authMiddleware, isOwner, propertyController.deleteProperty);
router.get('/owner/my-properties', authMiddleware, isOwner, propertyController.getOwnerProperties);

module.exports = router;
