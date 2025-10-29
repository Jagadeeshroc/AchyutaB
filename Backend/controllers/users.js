// Backend: controllers/users.js (Add follow/unfollow functions)
// Assuming this exists or create it

const User = require('../models/User');
const mongoose = require('mongoose');

const getUserFollowing = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const user = await User.findById(userId).populate('following', 'first_name last_name avatar title');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.following || []);
  } catch (err) {
    console.error('Error fetching following:', err.message);
    res.status(500).json({ error: 'Server error while fetching following' });
  }
};

const followUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }

    if (userId === currentUserId) {
      return res.status(400).json({ error: 'Cannot follow yourself' });
    }

    const targetUser = await User.findById(userId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (currentUser.following.includes(userId)) {
      return res.status(400).json({ error: 'Already following this user' });
    }

    currentUser.following.push(userId);
    targetUser.followers.push(currentUserId);

    await currentUser.save();
    await targetUser.save();

    await currentUser.populate('following', 'first_name last_name avatar');
    await targetUser.populate('followers', 'first_name last_name avatar');

    res.json({ message: 'User followed successfully', user: targetUser });
  } catch (err) {
    console.error('Error following user:', err.message);
    res.status(500).json({ error: 'Server error while following user' });
  }
};

const unfollowUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    if (userId === currentUserId) {
      return res.status(400).json({ error: 'Cannot unfollow yourself' });
    }

    const targetUser = await User.findById(userId);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove from following and followers
    currentUser.following = currentUser.following.filter(id => id.toString() !== userId);
    targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId);

    await currentUser.save();
    await targetUser.save();

    res.json({ 
      message: 'User unfollowed successfully',
      user: targetUser 
    });
  } catch (err) {
    console.error('Error unfollowing user:', err.message);
    res.status(500).json({ error: 'Server error while unfollowing user' });
  }
};

const getFollowers = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate('followers', 'first_name last_name avatar title');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.followers);
  } catch (err) {
    console.error('Error fetching followers:', err.message);
    res.status(500).json({ error: 'Server error while fetching followers' });
  }
};

const getFollowing = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await User.findById(userId).populate('following', 'first_name last_name avatar title');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user.following);
  } catch (err) {
    console.error('Error fetching following:', err.message);
    res.status(500).json({ error: 'Server error while fetching following' });
  }
};


module.exports = {
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  getUserFollowing
};