// routes/freelanceRoutes.js
const express = require('express');
const multer = require('multer');
const path = require("path");
const fs = require('fs');

const { 
  createPost, 
  getPosts, 
  getFeatured,
  getPostById,
  likePost,
  getPostReviews,
  addReview
} = require('../controllers/freelanceController');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const freelanceUploadDir = path.join(__dirname, '../uploads/freelance');
if (!fs.existsSync(freelanceUploadDir)) {
  fs.mkdirSync(freelanceUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, freelanceUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const validTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (validTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
});

// Routes
router.post('/posts', authMiddleware, upload.array('attachments', 5), createPost);
router.get('/posts', getPosts);
router.get('/posts/featured', getFeatured);
router.get('/posts/:id', getPostById);
router.post('/posts/:id/like', authMiddleware, likePost);
router.get('/posts/:id/reviews', getPostReviews);
router.post('/posts/:id/reviews', authMiddleware, addReview);

module.exports = router;