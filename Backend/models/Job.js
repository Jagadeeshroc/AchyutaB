const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  company: { type: String, required: true },
  posted_By: { type: mongoose.Schema.Types.ObjectId,
     ref: 'User',
      required: true },
  location: { type: String, required: true },
  type: { type: String, enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Remote'] },
  salary: { type: String },
  skillsRequired: [{ type: String }],
  experienceRequired: { type: String, enum: ['Entry-level', 'Mid-level', 'Senior-level'] },
  deadline: { type: Date, required: true },
  status: { type: String, enum: ['Open', 'Closed'], default: 'Open' },
  applicantsCount: { type: Number, default: 0 },

  
  applicants: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      appliedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Job', jobSchema);