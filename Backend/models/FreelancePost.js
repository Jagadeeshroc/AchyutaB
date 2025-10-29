// models/FreelancePost.js
const mongoose = require('mongoose');

const freelancePostSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['job', 'service', 'part-time', 'private-work'],
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    required: true,
    trim: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  skills: [{ 
    type: String,
    trim: true 
  }],
  budget: { 
    type: Number,
    min: 0 
  },
  price: { 
    type: Number,
    min: 0 
  },
  duration: { 
    type: String,
    trim: true 
  },
  deliveryTime: { 
    type: String,
    trim: true 
  },
  location: { 
    type: String,
    trim: true 
  },
  attachments: [{ 
    type: String 
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
   likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
});

// Add index for better query performance
freelancePostSchema.index({ user: 1, createdAt: -1 });
freelancePostSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('FreelancePost', freelancePostSchema);