const express = require('express');
const User = require('../models/User');
const Job = require('../models/Job');
const Company = require('../models/Company');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).send({ error: 'Search query required' });

    const [users, jobs, companies] = await Promise.all([
      User.find({ $text: { $search: query } }).limit(5),
      Job.find({ $text: { $search: query } }).populate('postedBy company').limit(5),
      Company.find({ $text: { $search: query } }).limit(5)
    ]);

    res.send({ users, jobs, companies });
  } catch (error) {
    res.status(500).send({ error: error.message });
  }
});

module.exports = router;