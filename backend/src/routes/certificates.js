const express = require('express');
const router = express.Router();
const { adminAuth, internAuth } = require('../middleware/auth');
const Certificate = require('../models/Certificate');
const Intern = require('../models/Intern');

// Admin: Get all certificates
router.get('/', adminAuth, async (req, res) => {
  try {
    const certificates = await Certificate.find()
      .populate('intern', 'name email userId')
      .populate('course', 'name')
      .populate('issuedBy', 'name')
      .sort({ issuedAt: -1 });

    res.json({ certificates });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Intern: Get own certificates
router.get('/my', internAuth, async (req, res) => {
  try {
    const certificates = await Certificate.find({ intern: req.intern._id })
      .populate('course', 'name description')
      .sort({ issuedAt: -1 });

    res.json({ certificates });
  } catch (error) {
    console.error('Error fetching certificates:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Public: Verify certificate by ID
router.get('/verify/:certificateId', async (req, res) => {
  try {
    const certificate = await Certificate.findOne({ 
      certificateId: req.params.certificateId 
    })
      .populate('intern', 'name email')
      .populate('course', 'name');

    if (!certificate) {
      return res.status(404).json({ 
        valid: false,
        message: 'Certificate not found' 
      });
    }

    res.json({
      valid: true,
      certificate: {
        certificateId: certificate.certificateId,
        internName: certificate.intern.name,
        courseName: certificate.course.name,
        finalScore: certificate.finalScore,
        completionDate: certificate.completionDate,
        issuedAt: certificate.issuedAt
      }
    });
  } catch (error) {
    console.error('Error verifying certificate:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;