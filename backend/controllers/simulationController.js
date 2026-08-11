const VisualSimulation = require('../models/VisualSimulation');

const parseItems = (placed_items) => {
  if (Array.isArray(placed_items)) return placed_items;
  if (typeof placed_items === 'string') {
    try { return JSON.parse(placed_items); } catch (e) { return []; }
  }
  return [];
};

const parseGeometry = (custom_geometry) => {
  if (!custom_geometry) return null;
  if (typeof custom_geometry === 'string') {
    try { return JSON.parse(custom_geometry); } catch (e) { return null; }
  }
  return custom_geometry;
};

const validateBody = (body) => {
  const { event_name, guests, workspace_type, layout_type, width, length, height } = body;
  if (!event_name || !guests || !workspace_type || !layout_type || !width || !length || !height) {
    return 'event_name, guests, workspace_type, layout_type, width, length and height are required';
  }
  return null;
};

// POST /api/simulation — save a new layout
const saveSimulation = async (req, res) => {
  try {
    const error = validateBody(req.body);
    if (error) return res.status(400).json({ message: error });

    const simulation_id = await VisualSimulation.create({
      user_id: req.user.user_id,
      event_id: req.body.event_id || null,
      event_name: req.body.event_name,
      guests: req.body.guests,
      workspace_type: req.body.workspace_type,
      layout_type: req.body.layout_type,
      width: req.body.width,
      length: req.body.length,
      height: req.body.height,
      wall_color: req.body.wall_color || '#ffffff',
      floor_color: req.body.floor_color || '#f0ece8',
      wall_texture: req.body.wall_texture ?? 0,
      lighting: req.body.lighting || 'Soft',
      placed_items: req.body.placed_items || [],
      custom_geometry: req.body.custom_geometry || null
    });

    res.status(201).json({ message: 'Layout saved successfully', simulation_id });
  } catch (error) {
    console.error('Save simulation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/simulation/:id — update an existing layout owned by the user
const updateSimulation = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await VisualSimulation.findById(id);
    if (!existing) return res.status(404).json({ message: 'Layout not found' });
    if (existing.user_id !== req.user.user_id)
      return res.status(403).json({ message: 'Not authorized to edit this layout' });

    const error = validateBody(req.body);
    if (error) return res.status(400).json({ message: error });

    const updated = await VisualSimulation.update(id, req.user.user_id, {
      event_id: req.body.event_id || null,
      event_name: req.body.event_name,
      guests: req.body.guests,
      workspace_type: req.body.workspace_type,
      layout_type: req.body.layout_type,
      width: req.body.width,
      length: req.body.length,
      height: req.body.height,
      wall_color: req.body.wall_color || '#ffffff',
      floor_color: req.body.floor_color || '#f0ece8',
      wall_texture: req.body.wall_texture ?? 0,
      lighting: req.body.lighting || 'Soft',
      placed_items: req.body.placed_items || [],
      custom_geometry: req.body.custom_geometry || null
    });

    if (!updated) return res.status(500).json({ message: 'Update failed' });
    res.status(200).json({ message: 'Layout updated successfully', simulation_id: Number(id) });
  } catch (error) {
    console.error('Update simulation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/simulation — list the current user's saved layouts (summary only)
const getMySimulations = async (req, res) => {
  try {
    const simulations = await VisualSimulation.findByUser(req.user.user_id);
    res.status(200).json({ simulations });
  } catch (error) {
    console.error('List simulations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/simulation/:id — full detail for one layout (must belong to user)
const getSimulationById = async (req, res) => {
  try {
    const { id } = req.params;
    const simulation = await VisualSimulation.findById(id);
    if (!simulation) return res.status(404).json({ message: 'Layout not found' });
    if (simulation.user_id !== req.user.user_id)
      return res.status(403).json({ message: 'Not authorized to view this layout' });

    simulation.placed_items = parseItems(simulation.placed_items);
    simulation.custom_geometry = parseGeometry(simulation.custom_geometry);
    res.status(200).json({ simulation });
  } catch (error) {
    console.error('Get simulation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/simulation/:id
const deleteSimulation = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await VisualSimulation.findById(id);
    if (!existing) return res.status(404).json({ message: 'Layout not found' });
    if (existing.user_id !== req.user.user_id)
      return res.status(403).json({ message: 'Not authorized to delete this layout' });

    await VisualSimulation.remove(id, req.user.user_id);
    res.status(200).json({ message: 'Layout deleted successfully' });
  } catch (error) {
    console.error('Delete simulation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  saveSimulation,
  updateSimulation,
  getMySimulations,
  getSimulationById,
  deleteSimulation
};
