const Connection = require('../models/Connection');
const Notification = require('../models/Notification');

const getConnections = async (req, res) => {
  try {
    const userId = req.user.id;
    const connections = await Connection.find({
      $or: [{ requester: userId }, { recipient: userId }],
      status: 'accepted' // Only return accepted connections
    }).populate('requester recipient', 'first_name last_name email avatar title');

    res.json(connections);
  } catch (err) {
    console.error('Error fetching connections:', err.message);
    res.status(500).json({ error: 'Server error while fetching connections' });
  }
};

const sendConnectionRequest = async (req, res) => {
  try {
    const { receiverId } = req.params;
    const requesterId = req.user.id;
    if (!requesterId) {
      return res.status(401).json({ error: 'Unauthorized - User ID not found' });
    }
    if (receiverId === requesterId.toString()) {
      return res.status(400).json({ error: 'Cannot send connection request to self' });
    }

    const existing = await Connection.findOne({
      $or: [
        { requester: requesterId, recipient: receiverId },
        { requester: receiverId, recipient: requesterId }
      ]
    });

    if (existing) {
      return res.status(400).json({ error: 'Connection already exists or pending' });
    }

    const connection = new Connection({
      requester: requesterId,
      recipient: receiverId,
      status: 'pending'
    });

    await connection.save();

    // Create notification
    const notification = new Notification({
      recipient: receiverId,
      sender: requesterId,
      type: 'connection_request',
      content: 'You have a new connection request'
    });
    await notification.save();

    // Emit Socket.IO event
    req.io.to(receiverId).emit('newNotification', notification);

    res.status(201).json(connection);
  } catch (err) {
    console.error('Error sending connection request:', err.message);
    if (err.code === 11000) {
      return res.status(400).json({ error: 'Duplicate connection request' });
    }
    res.status(500).json({ error: 'Server error while sending connection request' });
  }
};

const acceptConnectionRequest = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.connectionId);
    if (!connection || connection.recipient.toString() !== req.user.id) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    connection.status = 'accepted';
    await connection.save();

    // Create notification for requester
    const notification = new Notification({
      recipient: connection.requester,
      sender: req.user.id,
      type: 'connection_accepted',
      content: 'Your connection request was accepted'
    });
    await notification.save();

    // Emit Socket.IO event
    req.io.to(connection.requester.toString()).emit('newNotification', notification);

    res.json(connection);
  } catch (err) {
    console.error('Error accepting connection request:', err.message);
    res.status(500).json({ error: 'Server error while accepting connection request' });
  }
};

const rejectConnectionRequest = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.connectionId);
    if (!connection || connection.recipient.toString() !== req.user.id) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    connection.status = 'rejected';
    await connection.save();

    // Create notification for requester
    const notification = new Notification({
      recipient: connection.requester,
      sender: req.user.id,
      type: 'connection_rejected',
      content: 'Your connection request was rejected'
    });
    await notification.save();

    // Emit Socket.IO event
    req.io.to(connection.requester.toString()).emit('newNotification', notification);

    res.json(connection);
  } catch (err) {
    console.error('Error rejecting connection request:', err.message);
    res.status(500).json({ error: 'Server error while rejecting connection request' });
  }
};

const removeConnection = async (req, res) => {
  try {
    const connection = await Connection.findById(req.params.connectionId);
    if (
      !connection ||
      (connection.requester.toString() !== req.user.id &&
       connection.recipient.toString() !== req.user.id)
    ) {
      return res.status(404).json({ error: 'Connection not found' });
    }

    await connection.deleteOne();
    res.json({ message: 'Connection removed successfully' });
  } catch (err) {
    console.error('Error removing connection:', err.message);
    res.status(500).json({ error: 'Server error while removing connection' });
  }
};

const cancelConnectionRequest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const connection = await Connection.findById(id);
    if (!connection) {
      return res.status(404).json({ error: 'Connection request not found' });
    }

    // Ensure it's an outgoing request from the current user
    if (connection.requester.toString() !== userId) {
      return res.status(403).json({ error: 'Not authorized to cancel this request' });
    }

    // Ensure it's still pending
    if (connection.status !== 'pending') {
      return res.status(400).json({ error: 'Cannot cancel a non-pending request' });
    }

    // Delete the request
    await Connection.findByIdAndDelete(id);

    // Optionally, emit socket event for real-time update (no notification needed for self-cancel)
    req.io.to(userId).emit('connectionCanceled', { requestId: id });

    res.json({ message: 'Connection request canceled successfully' });
  } catch (err) {
    console.error('Error canceling connection request:', err.message);
    res.status(500).json({ error: 'Server error while canceling connection request' });
  }
};

const getOutgoingRequests = async (req, res) => {
  try {
    const userId = req.user.id;
    const requests = await Connection.find({
      requester: userId,
      status: 'pending'
    }).populate('recipient', 'first_name last_name email avatar title');
    res.json(requests);
  } catch (err) {
    console.error('Error fetching outgoing requests:', err.message);
    res.status(500).json({ error: 'Server error while fetching outgoing requests' });
  }
};

module.exports = {
  getConnections,
  sendConnectionRequest,
  acceptConnectionRequest,
  rejectConnectionRequest,
  removeConnection,
  cancelConnectionRequest,
  getOutgoingRequests
};