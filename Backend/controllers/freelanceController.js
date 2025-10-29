const FreelancePost = require('../models/FreelancePost');
const FreelanceReview = require('../models/FreelanceReview');
const path = require('path');
const fs = require('fs');

// Assuming multer setup in routes
// controllers/freelanceController.js
// controllers/freelanceController.js

exports.createPost = async (req, res) => {
  try {
    console.log('Received files:', req.files);
    
    const { type, title, description, skills, budget, price, duration, deliveryTime, location } = req.body;
    
    if (!req.user || !req.user._id) {
      return res.status(401).json({ message: 'User not authenticated' });
    }

    // Store ONLY filenames, not full paths
    const attachments = req.files?.map(file => file.filename) || [];

    console.log('Storing attachments as filenames:', attachments);

    let skillsArray = [];
    if (skills) {
      try {
        if (typeof skills === 'string' && skills.trim().startsWith('[')) {
          skillsArray = JSON.parse(skills);
        } else {
          skillsArray = [skills];
        }
      } catch (parseError) {
        console.log('Skills parsing error, treating as single skill');
        skillsArray = [skills];
      }
    }

    const post = new FreelancePost({
      type,
      title,
      description,
      user: req.user._id,
      skills: skillsArray,
      budget: budget ? Number(budget) : undefined,
      price: price ? Number(price) : undefined,
      duration,
      deliveryTime,
      location,
      attachments, // Store just filenames like "1760861211727-875217476.jpeg"
    });

    await post.save();
    await post.populate('user', 'username email name avatar');

    if (req.io) {
      req.io.emit('newPost', post);
    }

    res.status(201).json(post);
  } catch (err) {
    console.error('Error in createPost:', err);
    res.status(500).json({ 
      message: 'Error creating post',
      error: err.message 
    });
  }
};

exports.getPosts = async (req, res) => {
  try {
    const { type } = req.query;
    const query = type && type !== 'all' ? { type } : {};
    const posts = await FreelancePost.find(query)
      .populate('user', 'username email name avatar')
      .sort({ createdAt: -1 });
    
    // Fix ALL file paths to proper HTTP URLs
    const postsWithFixedUrls = posts.map(post => {
      const postObj = post.toObject();
      
      if (postObj.attachments && Array.isArray(postObj.attachments)) {
        postObj.attachments = postObj.attachments.map(attachment => {
          console.log('Original attachment path:', attachment);
          
          // If it's a file:// URL or local path, extract filename
          if (attachment.startsWith('file://') || attachment.includes('uploads\\freelance') || attachment.includes('uploads/freelance')) {
            // Extract just the filename from the path
            const filename = path.basename(attachment);
            console.log('Extracted filename:', filename);
            return `/uploads/freelance/${filename}`;
          }
          
          // If it's already a proper relative URL, return as is
          if (attachment.startsWith('/uploads/')) {
            return attachment;
          }
          
          // If it's just a filename, assume it's from freelance uploads
          return `/uploads/freelance/${attachment}`;
        });
      }
      
      console.log('Fixed attachments:', postObj.attachments);
      return postObj;
    });
    
    res.json(postsWithFixedUrls);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.getFeatured = async (req, res) => {
  try {
    // Simple: Get recent 3 random
    const posts = await FreelancePost.find().populate('user', 'username').sort({ createdAt: -1 }).limit(3);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// In freelanceController.js
exports.getPostById = async (req, res) => {
  try {
    const post = await FreelancePost.findById(req.params.id)
      .populate('user', 'username email name avatar');
    
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.likePost = async (req, res) => {
  try {
    const post = await FreelancePost.findById(req.params.id);
    const userId = req.user._id;

    const likedIndex = post.likes.indexOf(userId);
    
    if (likedIndex > -1) {
      // Unlike
      post.likes.splice(likedIndex, 1);
    } else {
      // Like
      post.likes.push(userId);
    }

    await post.save();
    
    res.json({
      liked: likedIndex === -1,
      likesCount: post.likes.length
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// In freelanceController.js
exports.getPostReviews = async (req, res) => {
  try {
    // You'll need a Review model for this
    const reviews = await Review.find({ post: req.params.id })
      .populate('user', 'name avatar')
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    
    const review = new Review({
      post: req.params.id,
      user: req.user._id,
      rating,
      comment
    });

    await review.save();
    await review.populate('user', 'name avatar');
    
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get reviews for a freelance post
exports.getPostReviews = async (req, res) => {
  try {
    console.log('📝 Fetching freelance reviews for post:', req.params.id);
    
    const reviews = await FreelanceReview.find({ post: req.params.id })
      .populate('user', 'name avatar email')
      .sort({ createdAt: -1 });
    
    console.log(`✅ Found ${reviews.length} freelance reviews`);
    res.json(reviews);
  } catch (err) {
    console.error('❌ Error in getPostReviews:', err);
    res.status(500).json({ message: err.message });
  }
};

exports.addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const postId = req.params.id;
    const userId = req.user._id;

    console.log('📝 Adding/Updating review for post:', postId);

    // Check if post exists
    const post = await FreelancePost.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false,
        message: 'Post not found' 
      });
    }

    // Check if user already reviewed this post
    let review = await FreelanceReview.findOne({ 
      post: postId, 
      user: userId 
    });
    
    let action = 'created';
    
    if (review) {
      // UPDATE EXISTING REVIEW
      review.rating = rating;
      review.comment = comment;
      review.createdAt = new Date(); // Update the timestamp
      action = 'updated';
      console.log('✅ Updating existing review');
    } else {
      // CREATE NEW REVIEW
      review = new FreelanceReview({
        post: postId,
        user: userId,
        rating,
        comment
      });
      console.log('✅ Creating new review');
    }

    await review.save();
    await review.populate('user', 'name avatar email');
    
    console.log(`✅ Review ${action} successfully:`, review._id);
    res.status(201).json({
      success: true,
      message: `Review ${action} successfully`,
      action: action,
      review: review
    });
    
  } catch (err) {
    console.error('❌ Error in addReview:', err);
    res.status(500).json({ 
      success: false,
      message: 'Internal server error: ' + err.message 
    });
  }
};