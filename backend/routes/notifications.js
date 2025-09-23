const express = require('express');
const { auth, adminAuth } = require('../middleware/auth');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');

const router = express.Router();

// Get notifications for user
router.get('/', auth, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, isRead } = req.query;
    const db = getDB();
    
    const filter = { userId: new ObjectId(req.user.id) };
    if (isRead !== undefined) filter.isRead = isRead === 'true';
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const notifications = await db.collection('notifications')
      .find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    const total = await db.collection('notifications').countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        notifications: notifications.map(n => ({ ...n, id: n._id.toString() })),
        pagination: { page: parseInt(page), limit: parseInt(limit), total }
      }
    });
  } catch (error) {
    next(error);
  }
});

// Mark notification as read
router.put('/:id/read', auth, async (req, res, next) => {
  try {
    const db = getDB();
    
    await db.collection('notifications').updateOne(
      { _id: new ObjectId(req.params.id), userId: new ObjectId(req.user.id) },
      { $set: { isRead: true, readAt: new Date() } }
    );
    
    res.json({ success: true, message: 'Notification marked as read' });
  } catch (error) {
    next(error);
  }
});

// Mark all notifications as read
router.put('/read-all', auth, async (req, res, next) => {
  try {
    const db = getDB();
    
    await db.collection('notifications').updateMany(
      { userId: new ObjectId(req.user.id), isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    next(error);
  }
});

// Delete notification
router.delete('/:id', auth, async (req, res, next) => {
  try {
    const db = getDB();
    
    await db.collection('notifications').deleteOne({
      _id: new ObjectId(req.params.id),
      userId: new ObjectId(req.user.id)
    });
    
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;