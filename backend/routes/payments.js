const express = require('express');
const { auth } = require('../middleware/auth');
const {
  createPaymentOrder,
  verifyPayment,
  getPaymentHistory
} = require('../controllers/paymentController');

const router = express.Router();

// Create payment order
router.post('/create-order', auth, createPaymentOrder);

// Verify payment
router.post('/verify', auth, verifyPayment);

// Get payment history for current user
router.get('/history', auth, getPaymentHistory);

module.exports = router;
