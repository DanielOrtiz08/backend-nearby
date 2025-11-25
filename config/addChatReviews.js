const pool = require('./database');

const addChatAndReviewsTables = async () => {
    try {
        console.log('🚀 Adding chat and reviews tables...');

        // Create chat_rooms table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_rooms (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        last_message TEXT,
        last_message_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(property_id, student_id, owner_id)
      );
    `);
        console.log('✅ Chat rooms table created');

        // Create chat_messages table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id SERIAL PRIMARY KEY,
        room_id INTEGER REFERENCES chat_rooms(id) ON DELETE CASCADE,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('✅ Chat messages table created');

        // Create reviews table
        await pool.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        property_id INTEGER REFERENCES properties(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(property_id, user_id)
      );
    `);
        console.log('✅ Reviews table created');

        // Create indexes
        await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_chat_rooms_student ON chat_rooms(student_id);
      CREATE INDEX IF NOT EXISTS idx_chat_rooms_owner ON chat_rooms(owner_id);
      CREATE INDEX IF NOT EXISTS idx_chat_rooms_property ON chat_rooms(property_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
      CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_property ON reviews(property_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_user ON reviews(user_id);
    `);
        console.log('✅ Indexes created');

        console.log('🎉 Chat and reviews tables added successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error adding tables:', error);
        process.exit(1);
    }
};

addChatAndReviewsTables();
