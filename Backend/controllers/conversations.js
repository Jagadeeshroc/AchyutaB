const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Notification = require('../models/Notification');

const getConversations = async (req, res) => {
  try {
    console.log('Fetching conversations for user:', req.user.id);
    let conversations = await Conversation.find({
      participants: req.user.id
    })
      .populate('participants', 'first_name last_name avatar')
      .populate('lastMessage')
      .sort('-updatedAt')
      .lean();
    console.log('Raw conversations from MongoDB:', conversations.length, conversations.map(c => c._id));
    // Deduplicate by _id
    conversations = Array.from(
      new Map(conversations.map((conv) => [conv._id.toString(), conv])).values()
    );
    console.log('Unique conversations after deduplication:', conversations.length, conversations.map(c => c._id));
    res.json(conversations);
  } catch (err) {
    console.error('Error fetching conversations:', err.message);
    res.status(500).json({ error: 'Server error while fetching conversations' });
  }
};

const getMessages = async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      participants: req.user.id
    });
    
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const messages = await Message.find({
      conversation: req.params.conversationId
    })
      .populate('sender', 'first_name last_name avatar')
      .sort('createdAt');
    
    res.json(messages);
  } catch (err) {
    console.error('Error fetching messages:', err.message);
    res.status(500).json({ error: 'Server error while fetching messages' });
  }
};

const createConversation = async (req, res) => {
  try {
    const { participantId } = req.body;
    if (participantId === req.user.id) {
      return res.status(400).json({ error: 'Cannot create conversation with self' });
    }

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
    console.error('Error creating conversation:', err.message);
    res.status(500).json({ error: 'Server error while creating conversation' });
  }
};

const sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      participants: req.user.id
    });

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const message = new Message({
      conversation: req.params.conversationId,
      sender: req.user.id,
      content
    });
    
    await message.save();
    
    // Update conversation
    await Conversation.findByIdAndUpdate(req.params.conversationId, {
      lastMessage: message._id,
      updatedAt: Date.now()
    });
    
    // Create notification for other participant
    const recipientId = conversation.participants.find(id => id.toString() !== req.user.id);
    const notification = new Notification({
      recipient: recipientId,
      sender: req.user.id,
      type: 'message',
      content: 'You have a new message'
    });
    await notification.save();

    // Emit Socket.IO events
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'first_name last_name avatar');
    req.io.to(req.params.conversationId).emit('newMessage', populatedMessage);
    req.io.to(recipientId.toString()).emit('newNotification', notification);
    
    res.status(201).json(message);
  } catch (err) {
    console.error('Error sending message:', err.message);
    res.status(500).json({ error: 'Server error while sending message' });
  }
};

const markMessagesAsRead = async (req, res) => {
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
      { $set: { read: true, readBy: [req.user.id] } }
    );
    
    res.json({ message: 'Messages marked as read' });
  } catch (err) {
    console.error('Error marking messages as read:', err.message);
    res.status(500).json({ error: 'Server error while marking messages as read' });
  }
};

module.exports = {
  getConversations,
  getMessages,
  createConversation,
  sendMessage,
  markMessagesAsRead
};