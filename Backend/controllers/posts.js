// Backend Controller: controllers/posts.js
const Post = require('../models/Post');
const User = require('../models/User');
const Application = require('../models/Application');
const mongoose = require('mongoose');

const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    if (!content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const post = new Post({
      user: userId,
      content,
      image
    });

    await post.save();
    await post.populate('user', 'name email avatar headline');

    res.status(201).json(post);
  } catch (err) {
    console.error('Error creating post:', err.message);
    res.status(500).json({ error: 'Server error while creating post' });
  }
};


const getPosts = async (req, res) => {
  try {
    const query = {};
    if (req.query.type) query.type = req.query.type;
    if (req.query.isPremium !== undefined) query.isPremium = req.query.isPremium === 'true';

    const posts = await Post.find(query)
      .populate('user', 'name email avatar headline')
      .populate('likes', 'name email avatar headline')
      .populate('comments.user', 'name email avatar headline')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json(posts);
  } catch (err) {
    console.error('Error fetching posts:', err.message);
    res.status(500).json({ error: 'Server error while fetching posts' });
  }
};

const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const userLikedIndex = post.likes.indexOf(userId);
    if (userLikedIndex > -1) post.likes.splice(userLikedIndex, 1);
    else post.likes.push(userId);

    // bypass validation to prevent 'type required' error
    await post.save({ validateBeforeSave: false });

    await post.populate('user', 'name email avatar headline');
    await post.populate('likes', 'name email avatar headline');
    await post.populate('comments.user', 'name email avatar headline');

    if (req.io) {
      req.io.to(post.user._id.toString()).emit('new-like', { postId: post._id, likes: post.likes.length });
      req.io.emit('update-post', post);
    }

    res.json(post);
  } catch (err) {
    console.error('Error liking post:', err);
    res.status(500).json({ error: 'Server error while liking post' });
  }
};

const addComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { comment } = req.body;
    const userId = req.user.id;

    if (!comment?.trim()) {
      return res.status(400).json({ error: 'Comment is required' });
    }

    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ error: 'Post not found' });

    post.comments.push({ user: userId, content: comment.trim() });

    // bypass validation to prevent 'type required' error
    await post.save({ validateBeforeSave: false });

    await post.populate('user', 'name email avatar headline');
    await post.populate('likes', 'name email avatar headline');
    await post.populate('comments.user', 'name email avatar headline');

    if (req.io) {
      const newComment = post.comments[post.comments.length - 1];
      req.io.to(post.user._id.toString()).emit('new-comment', { postId: post._id, comment: newComment });
      req.io.emit('update-post', post);
    }

    res.json(post);
  } catch (err) {
    console.error('Error adding comment:', err.message);
    res.status(500).json({ error: 'Server error while adding comment' });
  }
};

const applyToPost = async (req, res) => {
  try {
    const { postId, message } = req.body;
    const userId = req.user.id;

    const post = await Post.findById(postId).populate('user', 'name');
    if (!post) return res.status(404).json({ error: 'Post not found' });

    const existingApplication = await Application.findOne({ post: postId, applicant: userId });
    if (existingApplication) {
      return res.status(400).json({ error: 'Already applied to this post' });
    }

    const application = new Application({
      post: postId,
      applicant: userId,
      message: message?.trim() || ''
    });
    await application.save();
    await application.populate('applicant', 'name');

    if (req.io) {
      req.io.to(post.user._id.toString()).emit('new-application', {
        postId: post._id,
        postTitle: post.content.substring(0, 50) + '...',
        applicantId: userId,
        applicantName: req.user.name || 'Freelancer'
      });
    }

    res.status(201).json(application);
  } catch (err) {
    console.error('Error applying to post:', err.message);
    res.status(500).json({ error: 'Server error while applying to post' });
  }
};

const getFollowingPosts = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentUser = await User.findById(userId).select('following');
    
    if (!currentUser) return res.status(404).json({ error: 'User not found' });
    
    const followingIds = currentUser.following;
    const query = { user: { $in: followingIds } };
    if (req.query.type) query.type = req.query.type;

    const posts = await Post.find(query)
      .populate('user', 'name email avatar headline')
      .populate('likes', 'name email avatar headline')
      .populate('comments.user', 'name email avatar headline')
      .sort({ createdAt: -1 })
      .limit(10);
    
    res.json(posts);
  } catch (err) {
    console.error('Error fetching following posts:', err.message);
    res.status(500).json({ error: 'Server error while fetching following posts' });
  }
};

const getDiscoverPosts = async (req, res) => {
  try {
    const query = {};
    if (req.query.type) query.type = req.query.type;

    const posts = await Post.find(query)
      .populate('user', 'name email avatar headline')
      .populate('likes', 'name email avatar headline')
      .populate('comments.user', 'name email avatar headline')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(posts);
  } catch (err) {
    console.error('Error fetching discover posts:', err.message);
    res.status(500).json({ error: 'Server error while fetching discover posts' });
  }
};

const getPostById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ error: 'Invalid post ID' });

    const post = await Post.findById(id)
      .populate('user', 'name email avatar headline')
      .populate('likes', 'name email avatar headline')
      .populate('comments.user', 'name email avatar headline');

    if (!post) return res.status(404).json({ error: 'Post not found' });

    res.json(post);
  } catch (err) {
    console.error('Error fetching post:', err.message);
    res.status(500).json({ error: 'Server error while fetching post' });
  }
};

const getFeaturedPosts = async (req, res) => {
  try {
    const posts = await Post.find({ isPremium: true })
      .populate('user', 'name email avatar headline')
      .sort({ createdAt: -1 })
      .limit(10);
      
    res.json(posts);
  } catch (err) {
    console.error('Error fetching featured posts:', err.message);
    res.status(500).json({ error: 'Server error while fetching featured posts' });
  }
};

module.exports = {
  createPost,
  getPosts,
  likePost,
  addComment,
  applyToPost,
  getFollowingPosts,
  getDiscoverPosts,
  getPostById,
  getFeaturedPosts
};
