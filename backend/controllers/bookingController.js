const Booking = require('../models/Booking');
const Event = require('../models/Event');

// POST /api/bookings — reserve a spot at an event (free RSVP, v1 — no payment)
const createBooking = async (req, res) => {
  try {
    const { event_id } = req.body;
    const quantity = Number(req.body.quantity) || 1;

    if (!event_id) return res.status(400).json({ message: 'event_id is required' });
    if (!Number.isInteger(quantity) || quantity < 1) {
      return res.status(400).json({ message: 'quantity must be a whole number of at least 1' });
    }

    const event = await Event.findById(event_id);
    if (!event) return res.status(404).json({ message: 'Event not found' });
    if (event.status !== 'published') {
      return res.status(400).json({ message: "This event isn't open for booking." });
    }

    if (event.max_participants != null) {
      const alreadyBooked = await Booking.countConfirmedQuantity(event_id);
      const remaining = event.max_participants - alreadyBooked;
      if (quantity > remaining) {
        return res.status(400).json({
          message: remaining > 0
            ? `Only ${remaining} spot${remaining === 1 ? '' : 's'} left for this event.`
            : 'This event is fully booked.',
        });
      }
    }

    const { booking_id, reference_code } = await Booking.create({
      event_id,
      user_id: req.user.user_id,
      quantity,
    });

    res.status(201).json({
      message: 'Booking confirmed',
      booking_id,
      reference_code,
      quantity,
      status: 'confirmed',
    });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/bookings/mine — the current user's bookings ("Attending" tab)
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.findByUser(req.user.user_id);
    res.status(200).json({ bookings });
  } catch (error) {
    console.error('List my bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/bookings/:id
const getBookingById = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'Not authorized to view this booking' });
    }
    res.status(200).json({ booking });
  } catch (error) {
    console.error('Get booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// DELETE /api/bookings/:id — cancel (sets status, doesn't delete the row)
const cancelBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });
    if (booking.user_id !== req.user.user_id) {
      return res.status(403).json({ message: 'Not authorized to cancel this booking' });
    }
    if (booking.status === 'cancelled') {
      return res.status(200).json({ message: 'Booking already cancelled' });
    }

    await Booking.cancel(id, req.user.user_id);
    res.status(200).json({ message: 'Booking cancelled' });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
};
