const express = require('express');
const { getJobReviews, addJobReview } = require('../controllers/jobReviewsController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/jobs/:id/reviews', getJobReviews);
router.post('/jobs/:id/reviews', authMiddleware, addJobReview);

module.exports = router;