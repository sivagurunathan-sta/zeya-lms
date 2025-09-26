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

// UPI QR: returns a UPI URI for amount/payee
router.get('/upi-qr', (req, res) => {
  const vpa = process.env.UPI_VPA || 'sivagurunathan874@oksbi';
  const name = encodeURIComponent(process.env.UPI_NAME || 'BroskiesHub');
  const amount = req.query.amount ? Number(req.query.amount) : undefined;
  const base = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${name}`;
  const uri = amount ? `${base}&am=${amount.toFixed(2)}&cu=INR` : `${base}&cu=INR`;
  res.json({ success: true, data: { vpa, name: decodeURIComponent(name), upiUri: uri } });
});

module.exports = router;
