const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const pool = require('./config/database');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/properties', require('./routes/properties'));
app.use('/api/users', require('./routes/users'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/reviews', require('./routes/reviews'));

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Nearby API is running' });
});

// Socket.IO authentication middleware
io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
        return next(new Error('Authentication error'));
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        socket.userType = decoded.user_type;
        next();
    } catch (err) {
        next(new Error('Authentication error'));
    }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.userId}`);

    // Join user's personal room
    socket.join(`user:${socket.userId}`);

    // Join a chat room
    socket.on('join_room', (roomId) => {
        socket.join(`room:${roomId}`);
        console.log(`User ${socket.userId} joined room ${roomId}`);
    });

    // Leave a chat room
    socket.on('leave_room', (roomId) => {
        socket.leave(`room:${roomId}`);
        console.log(`User ${socket.userId} left room ${roomId}`);
    });

    // Send message
    socket.on('send_message', async (data) => {
        try {
            const { room_id, message } = data;

            // Verify user is part of this room
            const roomCheck = await pool.query(
                `SELECT * FROM chat_rooms 
         WHERE id = $1 AND (student_id = $2 OR owner_id = $2)`,
                [room_id, socket.userId]
            );

            if (roomCheck.rows.length === 0) {
                socket.emit('error', { message: 'Access denied' });
                return;
            }

            // Insert message
            const result = await pool.query(
                `INSERT INTO chat_messages (room_id, sender_id, message)
         VALUES ($1, $2, $3)
         RETURNING *`,
                [room_id, socket.userId, message]
            );

            // Update room's last message
            await pool.query(
                `UPDATE chat_rooms 
         SET last_message = $1, last_message_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
                [message, room_id]
            );

            // Get sender info
            const senderInfo = await pool.query(
                'SELECT full_name FROM users WHERE id = $1',
                [socket.userId]
            );

            const messageData = {
                ...result.rows[0],
                sender_name: senderInfo.rows[0].full_name
            };

            // Broadcast to room
            io.to(`room:${room_id}`).emit('new_message', messageData);

            // Get the other user in the room and notify them
            const room = roomCheck.rows[0];
            const otherUserId = room.student_id === socket.userId ? room.owner_id : room.student_id;
            io.to(`user:${otherUserId}`).emit('new_notification', {
                type: 'message',
                room_id,
                message: message.substring(0, 50)
            });

        } catch (error) {
            console.error('Send message error:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    // Typing indicator
    socket.on('typing', (data) => {
        socket.to(`room:${data.room_id}`).emit('user_typing', {
            userId: socket.userId,
            isTyping: data.isTyping
        });
    });

    socket.on('disconnect', () => {
        console.log(`❌ User disconnected: ${socket.userId}`);
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);

    if (err.name === 'MulterError') {
        return res.status(400).json({ error: 'File upload error: ' + err.message });
    }

    res.status(err.status || 500).json({
        error: err.message || 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
server.listen(PORT, () => {
    console.log(`🚀 Nearby API server running on port ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📁 Uploads directory: ${path.join(__dirname, 'uploads')}`);
    console.log(`💬 Socket.IO ready for real-time chat`);
});

module.exports = { app, server, io };

