const jwt = require('jsonwebtoken');
let prismaClient;
try {
  prismaClient = require('../config/database').prisma;
} catch (e) {
  prismaClient = null;
}

const fs = require('fs');
const path = require('path');
const dataDir = path.join(__dirname, '../../data');
const usersFile = path.join(dataDir, 'users.json');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, JSON.stringify([]));

const readUsers = () => {
  try { return JSON.parse(fs.readFileSync(usersFile, 'utf-8') || '[]'); } catch { return []; }
};

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Access token required' });
    }

    const secret = process.env.JWT_SECRET || 'dev-secret';
    const decoded = jwt.verify(token, secret);
    const userId = decoded.id || decoded.userId || decoded.user || decoded.sub;

    if (prismaClient && process.env.DATABASE_URL) {
      const user = await prismaClient.user.findUnique({ where: { id: userId }, select: { id: true, userId: true, name: true, email: true, role: true, isActive: true } });
      if (!user || !user.isActive) return res.status(403).json({ success: false, message: 'User not found or inactive' });
      req.user = user;
      return next();
    }

    // Fallback: file-based users
    const users = readUsers();
    const user = users.find(u => u.id === userId || u.userId === userId || u.email === userId);
    if (!user) return res.status(403).json({ success: false, message: 'User not found or inactive' });
    if (!user.isActive) return res.status(403).json({ success: false, message: 'User not found or inactive' });

    req.user = { id: user.id, userId: user.userId, name: user.name, email: user.email, role: user.role, isActive: user.isActive };
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(403).json({ success: false, message: 'Invalid or expired token' });
  }
};

const authorizeAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  next();
};

const authorizeIntern = (req, res, next) => {
  if (req.user.role !== 'INTERN') {
    return res.status(403).json({
      success: false,
      message: 'Intern access required'
    });
  }
  next();
};

module.exports = { authenticateToken, authorizeAdmin, authorizeIntern };
