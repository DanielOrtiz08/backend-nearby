const pool = require('../config/database');

// Create or update review
exports.createReview = async (req, res) => {
    try {
        const { property_id, rating, comment } = req.body;
        const user_id = req.user.id;

        // Validate rating
        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ error: 'Rating must be between 1 and 5' });
        }

        // Check if property exists
        const propertyCheck = await pool.query(
            'SELECT id FROM properties WHERE id = $1',
            [property_id]
        );

        if (propertyCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Property not found' });
        }

        // Insert or update review
        const result = await pool.query(
            `INSERT INTO reviews (property_id, user_id, rating, comment)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (property_id, user_id) 
       DO UPDATE SET rating = $3, comment = $4, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
            [property_id, user_id, rating, comment]
        );

        res.status(201).json({
            message: 'Review submitted successfully',
            review: result.rows[0]
        });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get reviews for a property
exports.getPropertyReviews = async (req, res) => {
    try {
        const { property_id } = req.params;

        const result = await pool.query(
            `SELECT r.*, u.full_name as user_name
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.property_id = $1
       ORDER BY r.created_at DESC`,
            [property_id]
        );

        // Calculate average rating
        const avgResult = await pool.query(
            `SELECT AVG(rating)::numeric(10,1) as avg_rating, COUNT(*) as total_reviews
       FROM reviews
       WHERE property_id = $1`,
            [property_id]
        );

        res.json({
            reviews: result.rows,
            average_rating: parseFloat(avgResult.rows[0].avg_rating) || 0,
            total_reviews: parseInt(avgResult.rows[0].total_reviews)
        });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get user's reviews
exports.getUserReviews = async (req, res) => {
    try {
        const user_id = req.user.id;

        const result = await pool.query(
            `SELECT r.*, p.title as property_title, p.images as property_images
       FROM reviews r
       JOIN properties p ON r.property_id = p.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
            [user_id]
        );

        res.json({ reviews: result.rows });
    } catch (error) {
        console.error('Get user reviews error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Delete review
exports.deleteReview = async (req, res) => {
    try {
        const { id } = req.params;
        const user_id = req.user.id;

        // Verify ownership
        const result = await pool.query(
            'DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, user_id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Review not found or access denied' });
        }

        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
