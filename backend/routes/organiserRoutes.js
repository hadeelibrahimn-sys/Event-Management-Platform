const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  getMyProfile,
  upsertMyProfile,
  getOrganizers,
  getOrganizerById,
} = require('../controllers/organiserController');

// /me must come before /:userId or express would treat "me" as a userId.
router.get('/me', authMiddleware, getMyProfile);
router.put('/me', authMiddleware, upsertMyProfile);

router.get('/', getOrganizers);
router.get('/:userId', getOrganizerById);

module.exports = router;
