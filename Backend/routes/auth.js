// Backend Routes: routes/auth.js
const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/auth');
const multer = require('multer');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'Uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uniqueSuffix}-${file.originalname}`);
  }
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
    validTypes.includes(file.mimetype)
      ? cb(null, true)
      : cb(new Error('Only JPG, PNG, GIF, WebP, PDF, DOC, or DOCX files allowed'), false);
  }
});

router.post('/register', upload.fields([
  { name: 'avatar', maxCount: 1 },
  { name: 'resume', maxCount: 1 }
]), register);
router.post('/login', login);

module.exports = router;