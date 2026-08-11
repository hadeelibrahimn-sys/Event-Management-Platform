const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  saveEvent,
  unsaveEvent,
  getMySavedEvents,
  getMySavedEventIds,
  checkSaved,
} = require('../controllers/savedEventController');

// Everything here is about the current user's own saved list, so every
// route requires auth — there's no public view of someone else's saves.
router.use(authMiddleware);

// /ids must come before /:eventId or express would treat "ids" as an id.
router.get('/ids', getMySavedEventIds);
router.get('/', getMySavedEvents);
router.get('/:eventId', checkSaved);
router.post('/:eventId', saveEvent);
router.delete('/:eventId', unsaveEvent);

module.exports = router;
