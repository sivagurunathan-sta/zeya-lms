const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const Intern = require('../models/Intern');

const adminAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin only.' });
    }

    const admin = await Admin.findById(decoded.userId);
    
    if (!admin || !admin.isActive) {
      return res.status(401).json({ message: 'Admin not found or inactive' });
    }

    req.admin = admin;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

const internAuth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No authentication token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    if (decoded.role !== 'intern') {
      return res.status(403).json({ message: 'Access denied. Intern only.' });
    }

    const intern = await Intern.findById(decoded.userId);
    
    if (!intern || !intern.isActive) {
      return res.status(401).json({ message: 'Intern not found or inactive' });
    }

    req.intern = intern;
    req.userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = { adminAuth, internAuth };