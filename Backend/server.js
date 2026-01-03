// Backend Server: server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const multer = require('multer');

const allowedOrigins = [
  'http://localhost:5173',
  'https://achyutaf-future-of-hiring.vercel.app'
];

const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const postRoutes = require('./routes/posts');
// Placeholder for missing routes (add these files as needed)
const usersRoutes = require('./routes/usersRoutes');
const jobRoutes = require('./routes/jobs');
// 🚨 **CRITICAL FIX APPLIED HERE:** The name is likely capitalized on GitHub.
const jobReviewRoutes = require('./routes/JobReviews'); 
// const reviewRoutes = require('./routes/reviews');
const connectionRoutes = require('./routes/connections');
const notificationRoutes = require('./routes/notifications');
const conversationRoutes = require('./routes/conversations');
const freelanceRoutes = require('./routes/freelanceRoutes');


const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true
  }
});


// Middleware to attach io to req
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Multer configuration (for reference, used in routes)
const uploadDir = path.join(__dirname, 'Uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
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

// Middleware
app.use(cors({
  origin: function (origin, callback) {
    // allow Postman / server-to-server calls
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/Uploads', express.static(uploadDir));

// Connect to MongoDB
connectDB();

// API Routes
app.use('/api/auth', authRoutes); // No upload here; handled in auth.js
app.use('/api/users', usersRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/job-reviews', jobReviewRoutes);
app.use('/api/posts', postRoutes);
// app.use('/api/reviews', reviewRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/freelance', freelanceRoutes);

// Debugging route for uploads (KEEPING THIS FOR TROUBLESHOOTING)
app.get('/api/debug-uploads', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  
  const uploadDir = path.join(__dirname, 'uploads', 'freelance');
  
  try {
    if (!fs.existsSync(uploadDir)) {
      return res.json({ 
        error: 'Upload directory does not exist', 
        path: uploadDir,
        currentDir: __dirname
      });
    }
    
    const files = fs.readdirSync(uploadDir);
    const fileStats = files.map(filename => {
      const filePath = path.join(uploadDir, filename);
      const stats = fs.statSync(filePath);
      return {
        filename,
        size: stats.size,
        created: stats.birthtime,
        path: filePath,
        exists: true
      };
    });
    
    // Check for the specific missing files
    const missingFiles = [
      '1760861211727-875217476.jpeg',
      '1760861010022-504103758.jpeg', 
      '1760860608100-337938019.jpg'
    ].map(filename => {
      const filePath = path.join(uploadDir, filename);
      return {
        filename,
        exists: fs.existsSync(filePath),
        path: filePath
      };
    });
    
    res.json({
      uploadDir,
      totalFiles: files.length,
      existingFiles: fileStats,
      missingFiles: missingFiles.filter(f => !f.exists),
      allFiles: files
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Cleanup route (KEEPING THIS FOR TROUBLESHOOTING)
app.delete('/api/cleanup-missing-posts', async (req, res) => {
  try {
    const FreelancePost = require('./models/FreelancePost'); // Adjust path as needed
    const posts = await FreelancePost.find({});
    const fs = require('fs');
    const path = require('path');
    
    const uploadDir = path.join(__dirname, 'uploads', 'freelance');
    let deletedCount = 0;
    let postsToDelete = [];
    
    for (let post of posts) {
      if (post.attachments && post.attachments.length > 0) {
        const hasMissingFiles = post.attachments.some(attachment => {
          const filename = attachment.split('/').pop() || attachment.split('\\').pop() || attachment;
          const filePath = path.join(uploadDir, filename);
          const exists = fs.existsSync(filePath);
          if (!exists) {
            console.log(`❌ Missing file: ${filename} for post ${post._id}`);
          }
          return !exists;
        });
        
        if (hasMissingFiles) {
          postsToDelete.push(post._id);
          deletedCount++;
        }
      }
    }
    
    // Delete all posts with missing files
    if (postsToDelete.length > 0) {
      await FreelancePost.deleteMany({ _id: { $in: postsToDelete } });
    }
    
    res.json({ 
      deleted: deletedCount, 
      message: `Deleted ${deletedCount} posts with missing files`,
      deletedPosts: postsToDelete
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error Handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', {
    message: err?.message,
    stack: err?.stack,
    url: req?.url,
    method: req?.method
  });
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Socket.IO
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('connect_error', (error) => {
    console.error('Socket.IO server connection error:', error.message);
  });

  socket.on('joinUser', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their notification room`);
  });

  socket.on('joinConversation', (conversationId) => {
    socket.join(conversationId);
    console.log(`User joined conversation: ${conversationId}`);
  });

  socket.on('leaveConversation', (conversationId) => {
    socket.leave(conversationId);
    console.log(`User left conversation: ${conversationId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});



// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
