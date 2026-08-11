const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// POST /api/conversations — "Contact Organizer" entry point. Reopens the
// existing conversation between these two users if one exists, else
// creates a new one.
const startOrOpenConversation = async (req, res) => {
  try {
    const { other_user_id } = req.body;
    if (!other_user_id) return res.status(400).json({ message: 'other_user_id is required' });
    if (Number(other_user_id) === req.user.user_id) {
      return res.status(400).json({ message: "You can't start a conversation with yourself" });
    }

    const otherUser = await User.findById(other_user_id);
    if (!otherUser) return res.status(404).json({ message: 'User not found' });

    const conversation_id = await Conversation.findOrCreateBetween(req.user.user_id, other_user_id);
    res.status(200).json({ conversation_id });
  } catch (error) {
    console.error('Start conversation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/conversations — inbox
const getMyConversations = async (req, res) => {
  try {
    const conversations = await Conversation.findByUser(req.user.user_id);
    res.status(200).json({ conversations });
  } catch (error) {
    console.error('List conversations error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/conversations/:id/messages — thread, and marks it read for the caller
const getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const isParticipant = await Conversation.isParticipant(id, req.user.user_id);
    if (!isParticipant) return res.status(403).json({ message: 'Not part of this conversation' });

    const [messages, otherUser] = await Promise.all([
      Message.findByConversation(id),
      Conversation.getOtherParticipant(id, req.user.user_id),
    ]);

    await Conversation.markRead(id, req.user.user_id);

    res.status(200).json({ messages, otherUser });
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/conversations/:id/messages — send a message
const sendMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const body = (req.body.body || '').trim();
    if (!body) return res.status(400).json({ message: 'Message cannot be empty' });

    const isParticipant = await Conversation.isParticipant(id, req.user.user_id);
    if (!isParticipant) return res.status(403).json({ message: 'Not part of this conversation' });

    const message_id = await Message.create(id, req.user.user_id, body);
    // Sending counts as having read the thread up to this point too.
    await Conversation.markRead(id, req.user.user_id);

    res.status(201).json({
      message_id,
      conversation_id: Number(id),
      sender_id: req.user.user_id,
      body,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
  startOrOpenConversation,
  getMyConversations,
  getMessages,
  sendMessage,
};
