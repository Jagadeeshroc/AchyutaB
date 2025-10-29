// Updated usersRoutes.js - Add missing auth import
const express = require("express");
const router = express.Router();
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const auth = require('../middleware/auth'); // Add this line
const { followUser, unfollowUser, getFollowers, getFollowing, getUserFollowing } = require('../controllers/users');
// ✅ GET all users
router.get("/", async (req, res) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json(users);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});
// Add this new route - Get current user info
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users by name or email
router.get('/search', auth, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }

    console.log('Authenticated user ID:', req.user.id);
    console.log('Search query:', query);

    const sanitizedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const users = await User.find({
      $or: [
        { name: { $regex: sanitizedQuery, $options: 'i' } },
        { email: { $regex: sanitizedQuery, $options: 'i' } },
      ],
    })
      .select('name email avatar headline')
      .limit(10);

    console.log('Found users:', users);
    res.json(users);
  } catch (err) {
    console.error('Error searching users:', err.message, err.stack);
    res.status(500).json({ error: 'Server error while searching users', details: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});



// ✅ CREATE a new user
router.post("/", async (req, res) => {
  try {
    const { name, email, password, role, profilePic, skills } = req.body;
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "Email already in use" });

    const newUser = new User({ name, email, password, role, profilePic, skills });
    await newUser.save();

    const userToReturn = newUser.toObject();
    delete userToReturn.password;
    res.status(201).json(userToReturn);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// ✅ UPDATE a user
router.put("/:id", async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }
    const updatedUser = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).select("-password");

    if (!updatedUser) return res.status(404).json({ error: "User not found" });

    res.status(200).json(updatedUser);
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

// ✅ DELETE a user
router.delete("/:id", async (req, res) => {
  try {
    const deletedUser = await User.findByIdAndDelete(req.params.id);
    if (!deletedUser) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server Error" });
  }
});

router.get('/recommended', async (req, res) => {
  try {
    const users = await User.find().limit(5);
    console.log('Fetched users:', users);
    res.json(users);
  } catch (err) {
    console.error('ERROR in /recommended:', err);
    res.status(500).send(err.message);
  }
});
router.get('/me/following', auth, getUserFollowing);

router.post('/:userId/follow', auth, followUser);
router.delete('/:userId/follow', auth, unfollowUser);
router.get('/:userId/followers', auth, getFollowers);
router.get('/:userId/following', auth, getFollowing);


module.exports = router;