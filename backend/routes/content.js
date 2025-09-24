const express = require('express');
const router = express.Router();
const controller = require('../controllers/contentController');
const { optionalAuth, requireAdmin } = require('../middleware/auth');

// Public/optional auth for read operations
router.get('/', optionalAuth, controller.list);
router.get('/many', optionalAuth, controller.getMany);
router.get('/:key', optionalAuth, controller.get);

// Admin-only for mutations
router.put('/:key', requireAdmin, controller.upsert);
router.delete('/:key', requireAdmin, controller.remove);

module.exports = router;
