const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');

// Get all conversations
router.get('/', async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user.id
    })
    .populate('participants', 'name avatar')
    .populate('lastMessage')
    .sort('-updatedAt');
    
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get messages in a conversation
router.get('/:conversationId', async (req, res) => {
  try {
    const messages = await Message.find({
      conversation: req.params.conversationId
    }).sort('createdAt');
    
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new conversation or get existing one
router.post('/', async (req, res) => {
  try {
    const { participantId } = req.body;
    
    // Check if conversation already exists
    let conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, participantId] }
    });
    
    if (!conversation) {
      conversation = new Conversation({
        participants: [req.user.id, participantId]
      });
      await conversation.save();
    }
    
    res.json(conversation);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Send message
router.post('/:conversationId', async (req, res) => {
  try {
    const { content } = req.body;
    
    const message = new Message({
      conversation: req.params.conversationId,
      sender: req.user.id,
      content
    });
    
    await message.save();
    
    // Update conversation last message
    await Conversation.findByIdAndUpdate(req.params.conversationId, {
      lastMessage: message._id,
      updatedAt: Date.now()
    });
    
    // Emit socket event
    const populatedMessage = await Message.findById(message._id).populate('sender', 'name avatar');
    req.io.to(req.params.conversationId).emit('newMessage', populatedMessage);
    
    res.status(201).json(message);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mark messages as read
router.put('/:conversationId/read', async (req, res) => {
  try {
    await Message.updateMany({
      conversation: req.params.conversationId,
      sender: { $ne: req.user.id },
      read: false
    }, {
      $set: { read: true }
    });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;