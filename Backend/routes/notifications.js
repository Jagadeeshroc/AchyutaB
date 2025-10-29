const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { 
  getNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} = require('../controllers/notifications');

router.get('/', auth, getNotifications);
router.put('/:id/read', auth, markNotificationAsRead);
router.put('/read-all', auth, markAllNotificationsAsRead);

module.exports = router;