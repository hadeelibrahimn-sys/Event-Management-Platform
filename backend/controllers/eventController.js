const Event = require('../models/Event');
const Booking = require('../models/Booking');
const SavedEvent = require('../models/SavedEvent');
const { getCategoryGroup } = require('../utils/eventCategories');

const validateBody = (body) => {
  const { title } = body;
  if (!title) {
    return 'title is required';
  }
  return null;
};

// POST /api/events — create a new event (must be logged in)
const createEvent = async (req, res) => {
  try {
    const error = validateBody(req.body);
    if (error) return res.status(400).json({ message: error });

    const event_id = await Event.create({
      organizer_id: req.user.user_id,
      title: req.body.title,
      category: req.body.category || null,
      category_group: getCategoryGroup(req.body.category),
      description: req.body.description || null,
      format: req.body.format || 'in-person',
      venue_name: req.body.venueName || req.body.venue_name || null,
      address: req.body.address || null,
      start_date: req.body.startDate || req.body.start_date || null,
      end_date: req.body.endDate || req.body.end_date || null,
      start_time: req.body.startTime || req.body.start_time || null,
      end_time: req.body.endTime || req.body.end_time || null,
      max_participants: req.body.maxParticipants || req.body.max_participants || null,
      registration_deadline: req.body.registrationDeadline || req.body.registration_deadline || null,
      image_url: req.body.imageUrl || req.body.image_url || null,
      status: req.body.status || 'published'
    });

    res.status(201).json({ message: 'Event created successfully', event_id });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/events — public list of published events, with optional filters
const getEvents = async (req, res) => {
  try {
    const { category, group, format, search } = req.query;
    const events = await Event.findAll({ category, group, format, search });
    res.status(200).json({ events });
  } catch (error) {
    console.error('List events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/events/:id — public event detail
const getEventById = async (req, res) => {
  try {
    const { id } = req.params;
    const event = await Event.findById(id);
    if (!event) return res.status(404).json({ message: 'Event not found' });

    // Lets the frontend show "X spots left" / "Sold out" without a second call.
    event.booked_count = await Booking.countConfirmedQuantity(id);

    res.status(200).json({ event });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// PUT /api/events/:id — update an event owned by the current user
const updateEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Event.findById(id);
    if (!existing) return res.status(404).json({ message: 'Event not found' });
    if (existing.organizer_id !== req.user.user_id)
      return res.status(403).json({ message: 'Not authorized to edit this event' });

    const error = validateBody(req.body);
    if (error) return res.status(400).json({ message: error });

    const updated = await Event.update(id, req.user.user_id, {
      title: req.body.title,
      category: req.body.category || null,
      category_group: getCategoryGroup(req.body.category),
      description: req.body.description || null,
      format: req.body.format || 'in-person',
      venue_name: req.body.venueName || req.body.venue_name || null,
      address: req.body.address || null,
      start_date: req.body.startDate || req.body.start_date || null,
      end_date: req.body.endDate || req.body.end_date || null,
      start_time: req.body.startTime || req.body.start_time || null,
      end_time: req.body.endTime || req.body.end_time || null,
      max_participants: req.body.maxParticipants || req.body.max_participants || null,
      registration_deadline: req.body.registrationDeadline || req.body.registration_deadline || null,
      image_url: req.body.imageUrl || req.body.image_url || null,
      status: req.body.status || existing.status
    });

    if (!updated) return res.status(500).json({ message: 'Update failed' });
    res.status(200).json({ message: 'Event updated successfully', event_id: Number(id) });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/events/recommended — a simple content-based feed for the
// dashboard: events in whichever category_group the user has shown the
// most interest in (via saves/bookings), excluding anything they've
// already saved, booked, or host themselves. Falls back to "recently
// published" when there's no signal yet or the preferred group comes up empty.
const getRecommendedEvents = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const [savedEvents, bookings, hostedEvents] = await Promise.all([
      SavedEvent.findEventsByUser(user_id),
      Booking.findByUser(user_id),
      Event.findByOrganizer(user_id),
    ]);

    const groupCounts = {};
    [...savedEvents, ...bookings].forEach((e) => {
      if (e.category_group) groupCounts[e.category_group] = (groupCounts[e.category_group] || 0) + 1;
    });
    const topGroup = Object.keys(groupCounts).sort((a, b) => groupCounts[b] - groupCounts[a])[0] || null;

    const excludeEventIds = [
      ...new Set([
        ...savedEvents.map((e) => e.event_id),
        ...bookings.map((b) => b.event_id),
        ...hostedEvents.map((e) => e.event_id),
      ]),
    ];

    let events = await Event.findRecommended({ excludeEventIds, group: topGroup, limit: 4 });
    if (topGroup && events.length === 0) {
      events = await Event.findRecommended({ excludeEventIds, group: null, limit: 4 });
    }

    res.status(200).json({ events, basedOn: topGroup });
  } catch (error) {
    console.error('Get recommended events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/events/mine/list — the current user's own events (any status)
const getMyEvents = async (req, res) => {
  try {
    const events = await Event.findByOrganizer(req.user.user_id);
    res.status(200).json({ events });
  } catch (error) {
    console.error('List my events error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/events/:id
const deleteEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await Event.findById(id);
    if (!existing) return res.status(404).json({ message: 'Event not found' });
    if (existing.organizer_id !== req.user.user_id)
      return res.status(403).json({ message: 'Not authorized to delete this event' });

    await Event.remove(id, req.user.user_id);
    res.status(200).json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  getMyEvents,
  getRecommendedEvents,
  deleteEvent
};
