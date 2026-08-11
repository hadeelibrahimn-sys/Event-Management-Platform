const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  getMyEvents,
  getRecommendedEvents,
  deleteEvent
} = require('../controllers/eventController');

// Specific routes before the /:id catch-all
router.get('/mine/list', authMiddleware, getMyEvents);
router.get('/recommended', authMiddleware, getRecommendedEvents);

router.post('/', authMiddleware, createEvent);
router.get('/', getEvents);
router.get('/:id', getEventById);
router.put('/:id', authMiddleware, updateEvent);
router.delete('/:id', authMiddleware, deleteEvent);

module.exports = router;
