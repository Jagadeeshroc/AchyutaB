// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authMiddleware = async (req, res, next) => {
  try {
    console.log('=== AUTH MIDDLEWARE DEBUG ===');
    console.log('Request URL:', req.originalUrl);
    console.log('Request Method:', req.method);
    console.log('Authorization Header:', req.headers.authorization);
    
    const authHeader = req.header('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No Bearer token found in header');
      return res.status(401).json({ message: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('Token extracted:', token.substring(0, 20) + '...'); // Log first 20 chars
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('✅ Token decoded successfully');
    console.log('Decoded token payload:', decoded);

    // Handle different possible field names in the token
    const userId = decoded.id || decoded.userId || decoded._id;
    console.log('Extracted user ID:', userId);
    
    if (!userId) {
      console.log('❌ No user ID found in token');
      return res.status(401).json({ message: 'Invalid token structure' });
    }

    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      console.log('❌ User not found in database for ID:', userId);
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;
    console.log('✅ Authentication successful for user:', user._id);
    console.log('User email:', user.email);
    console.log('=== END AUTH DEBUG ===');
    next();
  } catch (err) {
    console.error('❌ Auth middleware error:', err.message);
    console.error('Error name:', err.name);
    
    if (err.name === 'JsonWebTokenError') {
      console.log('❌ JWT Error - Invalid token signature');
      return res.status(401).json({ message: 'Invalid token' });
    }
    if (err.name === 'TokenExpiredError') {
      console.log('❌ JWT Error - Token expired');
      return res.status(401).json({ message: 'Token expired' });
    }
    
    console.error('❌ Other auth error:', err);
    res.status(500).json({ message: 'Authentication failed' });
  }
};

module.exports = authMiddleware;