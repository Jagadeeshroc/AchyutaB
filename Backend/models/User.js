// Backend Model: models/User.js
const mongoose = require('mongoose');

const experienceSchema = new mongoose.Schema({
  title: { type: String, trim: true },
  company: { type: String, trim: true },
  location: { type: String, trim: true },
  from: { type: Date },
  to: { type: Date, default: null },
  current: { type: Boolean, default: false },
  description: { type: String, trim: true },
}, { _id: false });

const educationSchema = new mongoose.Schema({
  school: { type: String, trim: true },
  degree: { type: String, trim: true },
  field: { type: String, trim: true },
  from: { type: Date },
  to: { type: Date },
  description: { type: String, trim: true },
}, { _id: false });

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true },
  phone: { type: String, trim: true, default: '' },
  headline: { type: String, trim: true, default: '' },
  about: { type: String, trim: true, default: '' },
  portfolio: { type: String, trim: true, default: '' },
  location: { type: String, trim: true, default: '' },
  skills: [{ type: String, trim: true }],
  socialLinks: { type: Map, of: String, default: {} },
  experience: [experienceSchema],
  education: [educationSchema],
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  avatar: { type: String, default: null },
  resume: { type: String, default: null },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);