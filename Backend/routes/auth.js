// Backend Routes: routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/auth');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

// 1. Configure Cloudinary (Make sure these are in your .env or Render Dashboard)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// 2. Configure Storage Engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    return {
      folder: 'achyuta_uploads', // Folder name in your Cloudinary Dashboard
      resource_type: 'auto',     // Auto-detect (important for PDFs vs Images)
      // Allow these formats
      allowed_formats: ['jpg', 'png', 'jpeg', 'webp', 'pdf', 'doc', 'docx'],
      // Keep original filename if you want
      public_id: `${Date.now()}-${file.originalname.split('.')[0]}`
    };
  },
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 20 * 1024 * 1024 } // 20MB Limit
});

// 3. Define Routes
router.post('/register', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'resume', maxCount: 1 }
]), register);

router.post('/login', login);

module.exports = router;