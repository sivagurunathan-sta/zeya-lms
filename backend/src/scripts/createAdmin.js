const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Admin = require('../models/Admin');
require('dotenv').config();

const createAdmin = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('Connected to MongoDB');

    // Admin credentials - CHANGE THESE!
    const adminData = {
      name: 'Super Admin',
      userId: 'ADMIN001',
      password: 'admin123',  // CHANGE THIS PASSWORD!
      email: 'admin@lms.com',
      isActive: true
    };

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ userId: adminData.userId });
    if (existingAdmin) {
      console.log('Admin with this User ID already exists!');
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // Create admin
    const admin = new Admin({
      name: adminData.name,
      userId: adminData.userId,
      password: hashedPassword,
      email: adminData.email,
      isActive: adminData.isActive
    });

    await admin.save();

    console.log('✅ Admin created successfully!');
    console.log('------------------------');
    console.log('Admin Credentials:');
    console.log('User ID:', adminData.userId);
    console.log('Password:', adminData.password);
    console.log('------------------------');
    console.log('⚠️  IMPORTANT: Please change the password after first login!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
};

createAdmin();