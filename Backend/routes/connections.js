const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
  getConnections, 
  sendConnectionRequest, 
  acceptConnectionRequest, 
  rejectConnectionRequest,
  removeConnection,
  getOutgoingRequests,
  cancelConnectionRequest
} = require('../controllers/connections');
const Connection = require('../models/Connection');
const User = require('../models/User'); // Assuming a User model exists

router.get('/', auth, getConnections);
router.post('/:receiverId', auth, sendConnectionRequest);
router.put('/:connectionId/accept', auth, acceptConnectionRequest);
router.put('/:connectionId/reject', auth, rejectConnectionRequest);
router.delete('/:connectionId', auth, removeConnection);
router.get('/requests/outgoing', auth, getOutgoingRequests);

// Cancel outgoing connection request
router.delete('/requests/:id', auth, cancelConnectionRequest);

// Get pending connection requests
router.get('/requests', auth, async (req, res) => {
  try {
    const requests = await Connection.find({
      recipient: req.user.id,
      status: 'pending'
    }).populate('requester', 'first_name last_name email avatar title');
    res.json(requests);
  } catch (err) {
    console.error('Error fetching requests:', err.message);
    res.status(500).json({ error: 'Server error while fetching requests' });
  }
});

// Get recommended users (basic implementation)
router.get('/recommended', auth, async (req, res) => {
  try {
    // Simple recommendation: users not already connected
    const connections = await Connection.find({
      $or: [{ requester: req.user.id }, { recipient: req.user.id }]
    }).select('requester recipient');
    const connectedIds = connections.flatMap(c => [
      c.requester.toString(),
      c.recipient.toString()
    ]).filter(id => id !== req.user.id);

    const recommended = await User.find({
      _id: { $nin: [...connectedIds, req.user.id] }
    }).select('first_name last_name email avatar title');
    res.json(recommended);
  } catch (err) {
    console.error('Error fetching recommended users:', err.message);
    res.status(500).json({ error: 'Server error while fetching recommended users' });
  }
});

module.exports = router;