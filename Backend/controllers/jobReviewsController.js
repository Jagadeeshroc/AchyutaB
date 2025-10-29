const JobReview = require('../models/JobReview'); // Updated import

exports.getJobReviews = async (req, res) => {
  try {
    const reviews = await JobReview.find({ job: req.params.id })
      .populate('user', 'name avatar email')
      .sort({ createdAt: -1 });
    
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

exports.addJobReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const jobId = req.params.id;
    const userId = req.user._id;

    const existingReview = await JobReview.findOne({ job: jobId, user: userId });
    if (existingReview) {
      return res.status(400).json({ message: 'You have already reviewed this job' });
    }

    const review = new JobReview({
      job: jobId,
      user: userId,
      rating,
      comment
    });

    await review.save();
    await review.populate('user', 'name avatar email');
    
    res.status(201).json(review);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};