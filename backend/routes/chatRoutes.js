const express = require('express');
const router = express.Router();
const { sendMessage, getAllConversations } = require('../controllers/chatController');
const { protect, optionalProtect } = require('../middleware/authMiddleware');
const { admin } = require('../middleware/adminMiddleware');

router.post('/', optionalProtect, sendMessage);
router.get('/admin', protect, admin, getAllConversations);

module.exports = router;
