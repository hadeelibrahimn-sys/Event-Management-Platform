const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
  startOrOpenConversation,
  getMyConversations,
  getMessages,
  sendMessage,
} = require('../controllers/conversationController');

// Messaging is always "as me" — every route requires auth.
router.use(authMiddleware);

router.post('/conversations', startOrOpenConversation);
router.get('/conversations', getMyConversations);
router.get('/conversations/:id/messages', getMessages);
router.post('/conversations/:id/messages', sendMessage);

module.exports = router;
