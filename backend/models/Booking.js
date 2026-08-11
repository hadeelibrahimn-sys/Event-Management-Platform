const db = require('../config/db');

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion

function generateReferenceCode() {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return `EVT-${code}`;
}

const Booking = {
  async create({ event_id, user_id, quantity = 1 }) {
    // Reference codes are random and short, so collisions are astronomically
    // unlikely — but this retries a handful of times just in case rather
    // than trusting that.
    let lastError;
    for (let attempt = 0; attempt < 5; attempt++) {
      const reference_code = generateReferenceCode();
      try {
        const [result] = await db.execute(
          `INSERT INTO bookings (event_id, user_id, quantity, status, reference_code)
           VALUES (?, ?, ?, 'confirmed', ?)`,
          [event_id, user_id, quantity, reference_code]
        );
        return { booking_id: result.insertId, reference_code };
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          lastError = error;
          continue;
        }
        throw error;
      }
    }
    throw lastError;
  },

  async findById(booking_id) {
    const [rows] = await db.execute(
      'SELECT * FROM bookings WHERE booking_id = ?',
      [booking_id]
    );
    return rows[0] || null;
  },

  // Joined with events so the "Attending" tab can render without N+1 calls.
  async findByUser(user_id) {
    const [rows] = await db.execute(
      `SELECT
         bookings.booking_id, bookings.event_id, bookings.quantity, bookings.status,
         bookings.reference_code, bookings.created_at,
         events.title, events.image_url, events.start_date, events.start_time,
         events.venue_name, events.format, events.category_group
       FROM bookings
       JOIN events ON events.event_id = bookings.event_id
       WHERE bookings.user_id = ?
       ORDER BY bookings.created_at DESC`,
      [user_id]
    );
    return rows;
  },

  async countConfirmedQuantity(event_id) {
    const [rows] = await db.execute(
      `SELECT COALESCE(SUM(quantity), 0) AS total
       FROM bookings WHERE event_id = ? AND status = 'confirmed'`,
      [event_id]
    );
    return Number(rows[0].total);
  },

  async cancel(booking_id, user_id) {
    const [result] = await db.execute(
      `UPDATE bookings SET status = 'cancelled'
       WHERE booking_id = ? AND user_id = ? AND status = 'confirmed'`,
      [booking_id, user_id]
    );
    return result.affectedRows > 0;
  },
};

module.exports = Booking;
