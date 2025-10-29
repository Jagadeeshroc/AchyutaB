// routes/conversations.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const authMiddleware = require('../middleware/auth');

router.get('/', authMiddleware, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .populate('participants', 'name avatar')
      .populate('lastMessage')
      .sort({ updatedAt: -1 });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/', authMiddleware, async (req, res) => {
  const { participantId } = req.body;
  try {
    let convo = await Conversation.findOne({
      participants: { $all: [req.user.id, participantId] }
    });
    if (convo) return res.json(convo);
    convo = new Conversation({ participants: [req.user.id, participantId] });
    await convo.save();
    await convo.populate('participants', 'name avatar');
    res.json(convo);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create' });
  }
});

router.get('/:id/messages', authMiddleware, async (req, res) => {
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo || !convo.participants.includes(req.user.id)) return res.status(404).json({ error: 'Not found' });
    const messages = await Message.find({ conversation: req.params.id })
      .populate('sender', 'name avatar')
      .sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id', authMiddleware, async (req, res) => {
  const { content } = req.body;
  try {
    const convo = await Conversation.findById(req.params.id);
    if (!convo || !convo.participants.includes(req.user.id)) return res.status(404).json({ error: 'Not found' });
    const message = new Message({
      conversation: req.params.id,
      sender: req.user.id,
      content,
    });
    await message.save();
    await message.populate('sender', 'name avatar');
    convo.lastMessage = message._id;
    convo.updatedAt = Date.now();
    await convo.save();
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: 'Failed to send' });
  }
});
// Add this to routes/conversations.js

// Mark messages as read
router.put('/:conversationId/read', authMiddleware, async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      participants: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    await Message.updateMany(
      {
        conversation: req.params.conversationId,
        sender: { $ne: req.user.id },
        read: false
      },
      { $set: { read: true } }
    );
    
    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error('Error marking messages as read:', err.message);
    res.status(500).json({ error: 'Server error while marking messages as read' });
  }
});

module.exports = router;