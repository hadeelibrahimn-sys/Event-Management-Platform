const db = require('../config/db');

const SavedEvent = {
  // Idempotent — saving an already-saved event just leaves the row as is.
  async save(user_id, event_id) {
    await db.execute(
      `INSERT INTO saved_events (user_id, event_id)
       VALUES (?, ?)
       ON DUPLICATE KEY UPDATE saved_id = saved_id`,
      [user_id, event_id]
    );
    return true;
  },

  async unsave(user_id, event_id) {
    const [result] = await db.execute(
      'DELETE FROM saved_events WHERE user_id = ? AND event_id = ?',
      [user_id, event_id]
    );
    return result.affectedRows > 0;
  },

  async isSaved(user_id, event_id) {
    const [rows] = await db.execute(
      'SELECT 1 FROM saved_events WHERE user_id = ? AND event_id = ? LIMIT 1',
      [user_id, event_id]
    );
    return rows.length > 0;
  },

  // Full event rows for the "Saved Events" page, most recently saved first.
  async findEventsByUser(user_id) {
    const [rows] = await db.execute(
      `SELECT events.*, saved_events.created_at AS saved_at
       FROM saved_events
       JOIN events ON events.event_id = saved_events.event_id
       WHERE saved_events.user_id = ?
       ORDER BY saved_events.created_at DESC`,
      [user_id]
    );
    return rows;
  },

  // Just the event_ids — cheap way for a list page (ExploreEvents) to mark
  // which of the events it's already showing are saved, without an N+1.
  async findEventIdsByUser(user_id) {
    const [rows] = await db.execute(
      'SELECT event_id FROM saved_events WHERE user_id = ?',
      [user_id]
    );
    return rows.map((r) => r.event_id);
  },
};

module.exports = SavedEvent;
