const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
  async create({ full_name, email, password, role = 'customer' }) {
    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await db.execute(
      `INSERT INTO users (full_name, email, password, role, created_at) VALUES (?, ?, ?, ?, NOW())`,
      [full_name, email, hashedPassword, role]
    );
    return result.insertId;
  },

  async findByEmail(email) {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    return rows[0] || null;
  },

  async findById(user_id) {
    const [rows] = await db.execute(
      'SELECT user_id, full_name, email, role, created_at FROM users WHERE user_id = ?',
      [user_id]
    );
    return rows[0] || null;
  },

  async comparePassword(plainPassword, hashedPassword) {
    return await bcrypt.compare(plainPassword, hashedPassword);
  },

  // Email is UNIQUE, so this checks no *other* user already has it before writing.
  async isEmailTakenByAnotherUser(email, user_id) {
    const [rows] = await db.execute(
      'SELECT 1 FROM users WHERE email = ? AND user_id != ? LIMIT 1',
      [email, user_id]
    );
    return rows.length > 0;
  },

  async updateProfile(user_id, { full_name, email }) {
    await db.execute(
      'UPDATE users SET full_name = ?, email = ? WHERE user_id = ?',
      [full_name, email, user_id]
    );
    return this.findById(user_id);
  },

  // Unlike findById, this deliberately includes the password hash — only
  // for internal use verifying the current password before a change.
  async findByIdWithPassword(user_id) {
    const [rows] = await db.execute('SELECT * FROM users WHERE user_id = ?', [user_id]);
    return rows[0] || null;
  },

  async updatePassword(user_id, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.execute('UPDATE users SET password = ? WHERE user_id = ?', [hashedPassword, user_id]);
    return true;
  }
};

module.exports = User;
