const Job = require("../models/Job");
const mongoose = require('mongoose'); // ✅ ADD THIS


// Create a job
exports.createJob = async (req, res) => {
  try {
    const userId = req.user.id; // This assumes your JWT middleware adds `user` to `req`
    const newJob = new Job({
      ...req.body,
      posted_By: userId, // Attach the user who is creating the job
    });
      await newJob.save();
    res.status(201).json({ message: "Job created", newJob  });
  } catch (err) {
    console.error("Job creation failed:", err.message);
    res.status(500).json({ error: "Server error" });
  }
};  

// Get all jobs
exports.getAllJobs = async (req, res) => {
  try {
    const jobs = await Job.find().populate("posted_By", "name email");
    res.json(jobs);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};



exports.getJob = async (req, res) => {
    try {
      const job = await Job.findById(req.params.id).populate("posted_By", "name email");
      if (!job) {
        return res.status(404).json({ error: "Job not found" });
      }
      res.json(job);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };
  exports.deleteJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json({ message: "Job deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: "Server error" });
  }
};
// Update a job
// Update a job
exports.updateJob = async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true, // Return the updated document
      runValidators: true, // Validate fields based on schema
    });

    if (!job) {
      return res.status(404).json({ error: "Job not found" });
    }

    res.json({ message: "Job updated successfully", job });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};
exports.applyJob = async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);

    if (!job) return res.status(404).json({ error: 'Job not found' });

    console.log('Job found:', job._id);
    console.log('Deadline:', job.deadline);         // 👈 Check if this is undefined
    console.log('Posted_By:', job.posted_By);       // 👈 Check if this is undefined

    const alreadyApplied = job.applicants.some(applicant =>
      applicant.userId.toString() === req.user.id
    );

    if (alreadyApplied) {
      return res.status(400).json({ error: 'You already applied to this job' });
    }

    job.applicants.push({ userId: req.user.id });
    console.log('Saving job...');

    await job.save({ validateBeforeSave: false });


    res.json({ message: 'Application submitted!' });
  } catch (err) {
    console.error('Apply error:', err);
    res.status(500).json({ error: 'Server error during job application' });
  }
};


