const db = require('../config/db');

const Conversation = {
  // An existing, exactly-two-person conversation between these two users, if any.
  async findExistingBetween(userA, userB) {
    const [rows] = await db.execute(
      `SELECT c.conversation_id
       FROM conversations c
       JOIN conversation_participants p1 ON p1.conversation_id = c.conversation_id AND p1.user_id = ?
       JOIN conversation_participants p2 ON p2.conversation_id = c.conversation_id AND p2.user_id = ?
       WHERE (
         SELECT COUNT(*) FROM conversation_participants p3
         WHERE p3.conversation_id = c.conversation_id
       ) = 2
       LIMIT 1`,
      [userA, userB]
    );
    return rows[0]?.conversation_id || null;
  },

  async create(userA, userB) {
    const [result] = await db.execute('INSERT INTO conversations () VALUES ()');
    const conversation_id = result.insertId;
    await db.execute(
      `INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)`,
      [conversation_id, userA, conversation_id, userB]
    );
    return conversation_id;
  },

  // The "Contact Organizer" entry point — reopen if it exists, else create.
  async findOrCreateBetween(userA, userB) {
    const existing = await this.findExistingBetween(userA, userB);
    if (existing) return existing;
    return this.create(userA, userB);
  },

  async isParticipant(conversation_id, user_id) {
    const [rows] = await db.execute(
      'SELECT 1 FROM conversation_participants WHERE conversation_id = ? AND user_id = ? LIMIT 1',
      [conversation_id, user_id]
    );
    return rows.length > 0;
  },

  async findById(conversation_id) {
    const [rows] = await db.execute(
      'SELECT * FROM conversations WHERE conversation_id = ?',
      [conversation_id]
    );
    return rows[0] || null;
  },

  // The "other" participant in a (v1: always two-person) conversation.
  async getOtherParticipant(conversation_id, user_id) {
    const [rows] = await db.execute(
      `SELECT u.user_id, u.full_name
       FROM conversation_participants cp
       JOIN users u ON u.user_id = cp.user_id
       WHERE cp.conversation_id = ? AND cp.user_id != ?
       LIMIT 1`,
      [conversation_id, user_id]
    );
    return rows[0] || null;
  },

  async markRead(conversation_id, user_id) {
    await db.execute(
      'UPDATE conversation_participants SET last_read_at = NOW() WHERE conversation_id = ? AND user_id = ?',
      [conversation_id, user_id]
    );
  },

  // Inbox: every conversation this user is in, with the other participant,
  // a preview of the latest message, and whether it's unread for them.
  async findByUser(user_id) {
    const [rows] = await db.execute(
      `SELECT
         c.conversation_id, c.updated_at, me.last_read_at,
         other.user_id AS other_user_id, ou.full_name AS other_user_name,
         (SELECT body FROM messages m WHERE m.conversation_id = c.conversation_id ORDER BY m.created_at DESC LIMIT 1) AS last_message_body,
         (SELECT created_at FROM messages m WHERE m.conversation_id = c.conversation_id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at,
         (SELECT sender_id FROM messages m WHERE m.conversation_id = c.conversation_id ORDER BY m.created_at DESC LIMIT 1) AS last_message_sender_id
       FROM conversation_participants me
       JOIN conversations c ON c.conversation_id = me.conversation_id
       JOIN conversation_participants other ON other.conversation_id = c.conversation_id AND other.user_id != me.user_id
       JOIN users ou ON ou.user_id = other.user_id
       WHERE me.user_id = ?
       ORDER BY c.updated_at DESC`,
      [user_id]
    );

    return rows.map((r) => ({
      conversation_id: r.conversation_id,
      other_user_id: r.other_user_id,
      other_user_name: r.other_user_name,
      last_message: r.last_message_body,
      last_message_at: r.last_message_at,
      updated_at: r.updated_at,
      unread: !!r.last_message_body
        && r.last_message_sender_id !== user_id
        && (!r.last_read_at || new Date(r.last_message_at) > new Date(r.last_read_at)),
    }));
  },
};

module.exports = Conversation;
