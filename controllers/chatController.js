const pool = require('../config/database');

// Create or get chat room
exports.getOrCreateRoom = async (req, res) => {
    try {
        const { property_id } = req.body;
        const student_id = req.user.id;

        // Get property owner
        const propertyResult = await pool.query(
            'SELECT owner_id FROM properties WHERE id = $1',
            [property_id]
        );

        if (propertyResult.rows.length === 0) {
            return res.status(404).json({ error: 'Property not found' });
        }

        const owner_id = propertyResult.rows[0].owner_id;

        // Check if room exists
        let room = await pool.query(
            `SELECT * FROM chat_rooms 
       WHERE property_id = $1 AND student_id = $2 AND owner_id = $3`,
            [property_id, student_id, owner_id]
        );

        if (room.rows.length === 0) {
            // Create new room
            room = await pool.query(
                `INSERT INTO chat_rooms (property_id, student_id, owner_id)
         VALUES ($1, $2, $3)
         RETURNING *`,
                [property_id, student_id, owner_id]
            );
        }

        res.json({ room: room.rows[0] });
    } catch (error) {
        console.error('Get/Create room error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get user's chat rooms
exports.getUserRooms = async (req, res) => {
    try {
        const userId = req.user.id;
        const userType = req.user.user_type;

        let query;
        if (userType === 'student') {
            query = `
        SELECT cr.*, 
               p.title as property_title, 
               p.images as property_images,
               u.full_name as owner_name,
               u.email as owner_email
        FROM chat_rooms cr
        JOIN properties p ON cr.property_id = p.id
        JOIN users u ON cr.owner_id = u.id
        WHERE cr.student_id = $1
        ORDER BY cr.last_message_at DESC NULLS LAST, cr.created_at DESC
      `;
        } else {
            query = `
        SELECT cr.*, 
               p.title as property_title,
               p.images as property_images,
               u.full_name as student_name,
               u.email as student_email
        FROM chat_rooms cr
        JOIN properties p ON cr.property_id = p.id
        JOIN users u ON cr.student_id = u.id
        WHERE cr.owner_id = $1
        ORDER BY cr.last_message_at DESC NULLS LAST, cr.created_at DESC
      `;
        }

        const result = await pool.query(query, [userId]);
        res.json({ rooms: result.rows });
    } catch (error) {
        console.error('Get rooms error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Get messages for a room
exports.getRoomMessages = async (req, res) => {
    try {
        const { room_id } = req.params;
        const userId = req.user.id;

        // Verify user is part of this room
        const roomCheck = await pool.query(
            `SELECT * FROM chat_rooms 
       WHERE id = $1 AND (student_id = $2 OR owner_id = $2)`,
            [room_id, userId]
        );

        if (roomCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Get messages
        const result = await pool.query(
            `SELECT cm.*, u.full_name as sender_name
       FROM chat_messages cm
       JOIN users u ON cm.sender_id = u.id
       WHERE cm.room_id = $1
       ORDER BY cm.created_at ASC`,
            [room_id]
        );

        // Mark messages as read
        await pool.query(
            `UPDATE chat_messages 
       SET is_read = true 
       WHERE room_id = $1 AND sender_id != $2`,
            [room_id, userId]
        );

        res.json({ messages: result.rows });
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};

// Send message (used by HTTP, Socket.IO handles real-time)
exports.sendMessage = async (req, res) => {
    try {
        const { room_id, message } = req.body;
        const sender_id = req.user.id;

        // Verify user is part of this room
        const roomCheck = await pool.query(
            `SELECT * FROM chat_rooms 
       WHERE id = $1 AND (student_id = $2 OR owner_id = $2)`,
            [room_id, sender_id]
        );

        if (roomCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Access denied' });
        }

        // Insert message
        const result = await pool.query(
            `INSERT INTO chat_messages (room_id, sender_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
            [room_id, sender_id, message]
        );

        // Update room's last message
        await pool.query(
            `UPDATE chat_rooms 
       SET last_message = $1, last_message_at = CURRENT_TIMESTAMP
       WHERE id = $2`,
            [message, room_id]
        );

        res.status(201).json({ message: result.rows[0] });
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ error: 'Server error' });
    }
};
