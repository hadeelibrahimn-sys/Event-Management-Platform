const db = require('../config/db');

const Event = {
  async create({
    organizer_id, title, category = null, category_group = null, description = null,
    format = 'in-person', venue_name = null, address = null,
    start_date = null, end_date = null, start_time = null, end_time = null,
    max_participants = null, registration_deadline = null,
    image_url = null, status = 'published'
  }) {
    const [result] = await db.execute(
      `INSERT INTO events
        (organizer_id, title, category, category_group, description, format, venue_name, address,
         start_date, end_date, start_time, end_time, max_participants,
         registration_deadline, image_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        organizer_id, title, category, category_group, description, format, venue_name, address,
        start_date, end_date, start_time, end_time, max_participants,
        registration_deadline, image_url, status
      ]
    );
    return result.insertId;
  },

  async update(event_id, organizer_id, {
    title, category = null, category_group = null, description = null,
    format = 'in-person', venue_name = null, address = null,
    start_date = null, end_date = null, start_time = null, end_time = null,
    max_participants = null, registration_deadline = null,
    image_url = null, status = 'published'
  }) {
    const [result] = await db.execute(
      `UPDATE events SET
        title = ?, category = ?, category_group = ?, description = ?, format = ?, venue_name = ?, address = ?,
        start_date = ?, end_date = ?, start_time = ?, end_time = ?, max_participants = ?,
        registration_deadline = ?, image_url = ?, status = ?
       WHERE event_id = ? AND organizer_id = ?`,
      [
        title, category, category_group, description, format, venue_name, address,
        start_date, end_date, start_time, end_time, max_participants,
        registration_deadline, image_url, status,
        event_id, organizer_id
      ]
    );
    return result.affectedRows > 0;
  },

  async findAll({ category = null, group = null, format = null, search = null } = {}) {
    let query = `SELECT * FROM events WHERE status = 'published'`;
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (group) {
      query += ' AND category_group = ?';
      params.push(group);
    }
    if (format) {
      query += ' AND format = ?';
      params.push(format);
    }
    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const [rows] = await db.execute(query, params);
    return rows;
  },

  async findById(event_id) {
    const [rows] = await db.execute(
      'SELECT * FROM events WHERE event_id = ?',
      [event_id]
    );
    return rows[0] || null;
  },

  async findByOrganizer(organizer_id) {
    const [rows] = await db.execute(
      'SELECT * FROM events WHERE organizer_id = ? ORDER BY created_at DESC',
      [organizer_id]
    );
    return rows;
  },

  // Just the published ones — for the public Organizer Profile page.
  async findPublishedByOrganizer(organizer_id) {
    const [rows] = await db.execute(
      `SELECT * FROM events WHERE organizer_id = ? AND status = 'published' ORDER BY created_at DESC`,
      [organizer_id]
    );
    return rows;
  },

  // Simple content-based "recommendations" — published events, optionally
  // narrowed to one category_group, excluding a given set of ids (events
  // the user already saved/booked/hosts). Not ML, just a filtered feed.
  async findRecommended({ excludeEventIds = [], group = null, limit = 4 } = {}) {
    let query = `SELECT * FROM events WHERE status = 'published'`;
    const params = [];

    if (excludeEventIds.length) {
      query += ` AND event_id NOT IN (${excludeEventIds.map(() => '?').join(', ')})`;
      params.push(...excludeEventIds);
    }
    if (group) {
      query += ' AND category_group = ?';
      params.push(group);
    }

    const safeLimit = Math.max(1, Math.min(Number(limit) || 4, 20));
    query += ` ORDER BY created_at DESC LIMIT ${safeLimit}`;

    const [rows] = await db.execute(query, params);
    return rows;
  },

  async remove(event_id, organizer_id) {
    const [result] = await db.execute(
      'DELETE FROM events WHERE event_id = ? AND organizer_id = ?',
      [event_id, organizer_id]
    );
    return result.affectedRows > 0;
  }
};

module.exports = Event;
