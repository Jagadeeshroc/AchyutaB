const mongoose = require('mongoose');

const freelanceReviewSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'FreelancePost',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

freelanceReviewSchema.index({ post: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('FreelanceReview', freelanceReviewSchema);