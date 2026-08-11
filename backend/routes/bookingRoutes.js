const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
} = require('../controllers/bookingController');

// Booking is always tied to "the current user," so every route requires auth.
router.use(authMiddleware);

router.post('/', createBooking);
router.get('/mine', getMyBookings);
router.get('/:id', getBookingById);
router.delete('/:id', cancelBooking);

module.exports = router;
