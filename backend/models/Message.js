const db = require('../config/db');

const Message = {
  async create(conversation_id, sender_id, body) {
    const [result] = await db.execute(
      'INSERT INTO messages (conversation_id, sender_id, body) VALUES (?, ?, ?)',
      [conversation_id, sender_id, body]
    );
    // Bump the conversation so the inbox re-sorts by most recent activity.
    await db.execute(
      'UPDATE conversations SET updated_at = NOW() WHERE conversation_id = ?',
      [conversation_id]
    );
    return result.insertId;
  },

  async findByConversation(conversation_id) {
    const [rows] = await db.execute(
      `SELECT message_id, conversation_id, sender_id, body, created_at
       FROM messages WHERE conversation_id = ? ORDER BY created_at ASC`,
      [conversation_id]
    );
    return rows;
  },
};

module.exports = Message;
