const pool = require('../config/database');

// Add property to favorites
exports.addFavorite = async (req, res) => {
    try {
        const { property_id } = req.body;

        if (!property_id) {
            return res.status(400).json({ error: 'Property ID is required' });
        }

        // Check if property exists
        const propertyCheck = await pool.query(
            'SELECT id FROM properties WHERE id = $1',
            [property_id]
        );

        if (propertyCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Property not found' });
        }

        // Add to favorites (ignore if already exists)
        await pool.query(
            `INSERT INTO favorites (user_id, property_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, property_id) DO NOTHING`,
            [req.user.id, property_id]
        );

        res.status(201).json({ message: 'Property added to favorites' });
    } catch (error) {
        console.error('Add favorite error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Remove property from favorites
exports.removeFavorite = async (req, res) => {
    try {
        const { property_id } = req.params;

        await pool.query(
            'DELETE FROM favorites WHERE user_id = $1 AND property_id = $2',
            [req.user.id, property_id]
        );

        res.json({ message: 'Property removed from favorites' });
    } catch (error) {
        console.error('Remove favorite error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get user's favorite properties
exports.getFavorites = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT p.*, f.created_at as favorited_at, u.full_name as owner_name
       FROM favorites f
       JOIN properties p ON f.property_id = p.id
       JOIN users u ON p.owner_id = u.id
       WHERE f.user_id = $1
       ORDER BY f.created_at DESC`,
            [req.user.id]
        );

        res.json({ favorites: result.rows });
    } catch (error) {
        console.error('Get favorites error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Send message
exports.sendMessage = async (req, res) => {
    try {
        const { receiver_id, property_id, message } = req.body;

        if (!receiver_id || !message) {
            return res.status(400).json({ error: 'Receiver ID and message are required' });
        }

        const result = await pool.query(
            `INSERT INTO messages (sender_id, receiver_id, property_id, message)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
            [req.user.id, receiver_id, property_id, message]
        );

        res.status(201).json({
            message: 'Message sent successfully',
            data: result.rows[0]
        });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get user's messages
exports.getMessages = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT m.*, 
       sender.full_name as sender_name, sender.email as sender_email,
       receiver.full_name as receiver_name, receiver.email as receiver_email,
       p.title as property_title
       FROM messages m
       JOIN users sender ON m.sender_id = sender.id
       JOIN users receiver ON m.receiver_id = receiver.id
       LEFT JOIN properties p ON m.property_id = p.id
       WHERE m.sender_id = $1 OR m.receiver_id = $1
       ORDER BY m.created_at DESC`,
            [req.user.id]
        );

        res.json({ messages: result.rows });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Mark message as read
exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        await pool.query(
            'UPDATE messages SET is_read = true WHERE id = $1 AND receiver_id = $2',
            [id, req.user.id]
        );

        res.json({ message: 'Message marked as read' });
    } catch (error) {
        console.error('Mark as read error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
