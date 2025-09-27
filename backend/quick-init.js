// quick-init.js - Run this to initialize your database immediately
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/lms';

const userSchema = new mongoose.Schema({
  userId: { type: String, unique: true, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  phone: { type: String },
  role: { type: String, enum: ['admin', 'intern'], default: 'intern' },
  password: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date }
});

const User = mongoose.model('User', userSchema);

async function quickInit() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing users (optional)
    await User.deleteMany({});
    console.log('🗑️ Cleared existing users');

    // Create admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = new User({
      userId: 'ADMIN001',
      name: 'System Administrator',
      email: 'admin@lms.com',
      role: 'admin',
      password: adminPassword,
      isActive: true
    });
    await admin.save();
    console.log('✅ Admin created: admin@lms.com / admin123');

    // Create sample interns
    const interns = [
      { userId: 'INT001', name: 'John Doe', email: 'john@example.com', password: 'int001' },
      { userId: 'INT002', name: 'Jane Smith', email: 'jane@example.com', password: 'int002' }
    ];

    for (const internData of interns) {
      const hashedPassword = await bcrypt.hash(internData.password, 10);
      const intern = new User({
        ...internData,
        password: hashedPassword,
        role: 'intern',
        isActive: true
      });
      await intern.save();
      console.log(`✅ Intern created: ${intern.email} / ${internData.password}`);
    }

    console.log('\n🎉 SUCCESS! Database initialized!');
    console.log('\n🔑 LOGIN CREDENTIALS:');
    console.log('Admin: admin@lms.com / admin123');
    console.log('Intern 1: john@example.com / int001');
    console.log('Intern 2: jane@example.com / int002');
    console.log('\nNow try logging in! 🚀');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

quickInit();