// Backend Controller: controllers/auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

exports.register = async (req, res) => {
  try {
    console.log('Received files:', req.files);
    console.log('Received body:', JSON.stringify(req.body, null, 2));
    const {
      name, email, password, phone, headline, about, portfolio, location, skills, socialLinks, experience, education, role
    } = req.body;

    if (!name?.trim() || !email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    let parsedSkills = [];
    let parsedSocialLinks = {};
    let parsedExperience = [];
    let parsedEducation = [];
    try {
      parsedSkills = skills ? JSON.parse(skills) : [];
      parsedSocialLinks = socialLinks ? JSON.parse(socialLinks) : {};
      parsedExperience = experience ? JSON.parse(experience) : [];
      parsedEducation = education ? JSON.parse(education) : [];
    } catch (err) {
      return res.status(400).json({ message: 'Invalid JSON format in skills, socialLinks, experience, or education' });
    }

    const avatar = req.files && req.files.avatar && req.files.avatar[0] ? `/Uploads/${req.files.avatar[0].filename}` : null;
    const resume = req.files && req.files.resume && req.files.resume[0] ? `/Uploads/${req.files.resume[0].filename}` : null;
    console.log('Avatar path:', avatar);
    console.log('Resume path:', resume);

    const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password.trim(), salt);

    const user = new User({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone: phone?.trim() || '',
      headline: headline?.trim() || '',
      about: about?.trim() || '',
      portfolio: portfolio?.trim() || '',
      location: location?.trim() || '',
      skills: Array.isArray(parsedSkills) ? parsedSkills : [],
      socialLinks: typeof parsedSocialLinks === 'object' ? parsedSocialLinks : {},
      experience: Array.isArray(parsedExperience) ? parsedExperience.map(exp => ({
        ...exp,
        from: exp.from ? new Date(exp.from) : null,
        to: exp.current ? null : (exp.to ? new Date(exp.to) : null),
      })) : [],
      education: Array.isArray(parsedEducation) ? parsedEducation.map(edu => ({
        ...edu,
        from: edu.from ? new Date(edu.from) : null,
        to: edu.to ? new Date(edu.to) : null,
      })) : [],
      role: role?.trim() || 'user',
      avatar,
      resume,
    });

    await user.save();
    console.log('Registered user:', user);
    res.status(201).json({ message: 'User registered successfully', user: user.toObject() });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(400).json({ message: error.message || 'Registration failed' });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email?.trim() || !password?.trim()) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() });
    if (!user) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password.trim(), user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user._id, name: user.name }, process.env.JWT_SECRET || 'secret_key', { expiresIn: '7d' });

    res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({ message: error.message || 'Login failed' });
  }
};