const db = require('../config/db');

const OrganiserProfile = {
  // Create-or-update, keyed on the unique user_id.
  async upsert(user_id, { bio = null, specialty = null, experience_years = null, avatar_url = null, location = null }) {
    await db.execute(
      `INSERT INTO organiser_profiles (user_id, bio, specialty, experience_years, avatar_url, location)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         bio = VALUES(bio),
         specialty = VALUES(specialty),
         experience_years = VALUES(experience_years),
         avatar_url = VALUES(avatar_url),
         location = VALUES(location)`,
      [user_id, bio, specialty, experience_years, avatar_url, location]
    );
    return this.findByUserId(user_id);
  },

  async findByUserId(user_id) {
    const [rows] = await db.execute(
      'SELECT * FROM organiser_profiles WHERE user_id = ?',
      [user_id]
    );
    return rows[0] || null;
  },

  // The public directory: only users with a profile AND at least one
  // published event show up here — avoids listing someone who clicked
  // "Create Event" once and never actually organized anything.
  async findDirectory({ search = null } = {}) {
    let query = `
      SELECT
        u.user_id, u.full_name,
        op.bio, op.specialty, op.experience_years, op.avatar_url, op.location,
        COUNT(e.event_id) AS published_event_count
      FROM organiser_profiles op
      JOIN users u ON u.user_id = op.user_id
      JOIN events e ON e.organizer_id = u.user_id AND e.status = 'published'
    `;
    const params = [];

    if (search) {
      query += ' WHERE (u.full_name LIKE ? OR op.specialty LIKE ? OR op.location LIKE ? OR op.bio LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += `
      GROUP BY u.user_id, u.full_name, op.organiser_profile_id, op.bio, op.specialty,
               op.experience_years, op.avatar_url, op.location
      HAVING published_event_count >= 1
      ORDER BY published_event_count DESC, u.full_name ASC
    `;

    const [rows] = await db.execute(query, params);
    return rows;
  },

  // Single organizer's public profile — same eligibility rule as the
  // directory (profile + >=1 published event), so a guessed user_id for
  // someone who isn't a real organizer just 404s.
  async findPublicByUserId(user_id) {
    const [rows] = await db.execute(
      `SELECT
         u.user_id, u.full_name,
         op.bio, op.specialty, op.experience_years, op.avatar_url, op.location,
         COUNT(e.event_id) AS published_event_count
       FROM organiser_profiles op
       JOIN users u ON u.user_id = op.user_id
       JOIN events e ON e.organizer_id = u.user_id AND e.status = 'published'
       WHERE u.user_id = ?
       GROUP BY u.user_id, u.full_name, op.organiser_profile_id, op.bio, op.specialty,
                op.experience_years, op.avatar_url, op.location
       HAVING published_event_count >= 1`,
      [user_id]
    );
    return rows[0] || null;
  },
};

module.exports = OrganiserProfile;
