const SavedEvent = require('../models/SavedEvent');
const Event = require('../models/Event');

// POST /api/saved-events/:eventId — save an event for the current user
const saveEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    await SavedEvent.save(req.user.user_id, eventId);
    res.status(201).json({ message: 'Event saved', event_id: Number(eventId) });
  } catch (error) {
    console.error('Save event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/saved-events/:eventId — unsave an event for the current user
const unsaveEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    await SavedEvent.unsave(req.user.user_id, eventId);
    res.status(200).json({ message: 'Event unsaved', event_id: Number(eventId) });
  } catch (error) {
    console.error('Unsave event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/saved-events — full saved event rows for the current user
const getMySavedEvents = async (req, res) => {
  try {
    const events = await SavedEvent.findEventsByUser(req.user.user_id);
    res.status(200).json({ events });
  } catch (error) {
    console.error('List saved events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/saved-events/ids — just the event_ids the current user has saved
const getMySavedEventIds = async (req, res) => {
  try {
    const eventIds = await SavedEvent.findEventIdsByUser(req.user.user_id);
    res.status(200).json({ eventIds });
  } catch (error) {
    console.error('List saved event ids error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/saved-events/:eventId — is this one event saved by the current user?
const checkSaved = async (req, res) => {
  try {
    const { eventId } = req.params;
    const saved = await SavedEvent.isSaved(req.user.user_id, eventId);
    res.status(200).json({ saved });
  } catch (error) {
    console.error('Check saved event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  saveEvent,
  unsaveEvent,
  getMySavedEvents,
  getMySavedEventIds,
  checkSaved,
};
