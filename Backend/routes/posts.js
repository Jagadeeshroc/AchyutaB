const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const multer = require('multer');
const {
  createPost,
  getPosts,
  likePost,
  addComment,
  applyToPost,
  getFollowingPosts,
  getDiscoverPosts,
  getPostById,
  getFeaturedPosts
} = require('../controllers/posts');

// ===== Multer Configuration =====
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'Uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// ===== Routes =====

// ✅ Public Routes (No auth needed)
router.get('/', getPosts);
router.get('/featured', getFeaturedPosts);
router.get('/discover', getDiscoverPosts);

// 🔐 Protected Routes (Require token)
router.post('/', auth, upload.single('image'), createPost);
router.post('/:postId/like', auth, likePost);
router.post('/:postId/comment', auth, addComment);
router.post('/applications', auth, applyToPost);
router.get('/following', auth, getFollowingPosts);
router.get('/:id', auth, getPostById);

module.exports = router;
