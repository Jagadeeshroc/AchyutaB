const mongoose = require('mongoose');

const companySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: { type: String },
  industry: { type: String },
  logo: { type: String },
  website: { type: String },
  employees: [{ 
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    position: String,
    from: Date,
    to: Date,
    current: Boolean
  }],
  reviews: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Review' }]
});

module.exports = mongoose.model('Company', companySchema);