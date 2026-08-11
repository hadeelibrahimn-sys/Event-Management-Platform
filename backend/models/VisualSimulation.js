const db = require('../config/db');

const VisualSimulation = {
  async create({
    user_id, event_id = null, event_name, guests,
    workspace_type, layout_type, width, length, height,
    wall_color, floor_color, wall_texture, lighting, placed_items, custom_geometry
  }) {
    const [result] = await db.execute(
      `INSERT INTO visual_simulations
        (user_id, event_id, event_name, guests, workspace_type, layout_type,
         width, length, height, wall_color, floor_color, wall_texture, lighting, placed_items, custom_geometry)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id, event_id, event_name, guests, workspace_type, layout_type,
        width, length, height, wall_color, floor_color, wall_texture, lighting,
        JSON.stringify(placed_items || []),
        custom_geometry ? JSON.stringify(custom_geometry) : null
      ]
    );
    return result.insertId;
  },

  async update(simulation_id, user_id, {
    event_id = null, event_name, guests,
    workspace_type, layout_type, width, length, height,
    wall_color, floor_color, wall_texture, lighting, placed_items, custom_geometry
  }) {
    const [result] = await db.execute(
      `UPDATE visual_simulations SET
        event_id = ?, event_name = ?, guests = ?, workspace_type = ?, layout_type = ?,
        width = ?, length = ?, height = ?, wall_color = ?, floor_color = ?,
        wall_texture = ?, lighting = ?, placed_items = ?, custom_geometry = ?
       WHERE simulation_id = ? AND user_id = ?`,
      [
        event_id, event_name, guests, workspace_type, layout_type,
        width, length, height, wall_color, floor_color, wall_texture, lighting,
        JSON.stringify(placed_items || []),
        custom_geometry ? JSON.stringify(custom_geometry) : null,
        simulation_id, user_id
      ]
    );
    return result.affectedRows > 0;
  },

  async findById(simulation_id) {
    const [rows] = await db.execute(
      'SELECT * FROM visual_simulations WHERE simulation_id = ?',
      [simulation_id]
    );
    return rows[0] || null;
  },

  async findByUser(user_id) {
    const [rows] = await db.execute(
      `SELECT simulation_id, event_id, event_name, guests, workspace_type, layout_type,
              width, length, height, created_at, updated_at
       FROM visual_simulations WHERE user_id = ? ORDER BY updated_at DESC`,
      [user_id]
    );
    return rows;
  },

  async remove(simulation_id, user_id) {
    const [result] = await db.execute(
      'DELETE FROM visual_simulations WHERE simulation_id = ? AND user_id = ?',
      [simulation_id, user_id]
    );
    return result.affectedRows > 0;
  }
};

module.exports = VisualSimulation;
