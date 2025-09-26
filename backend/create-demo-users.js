const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Your MongoDB connection
const MONGODB_URL = "mongodb+srv://sivagurunathan875_db_user:shDbGcTzGPFwjwsW@cluster0.epgf9z2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

// User Schema - MUST match your server.js schema exactly
const userSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'user', 'intern'], default: 'user' },
  profileDetails: {
    phone: String,
    address: String,
    dateOfBirth: Date,
    profileImage: String,
    bio: String,
    githubUsername: String,
    linkedinUrl: String
  },
  assignedCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  progress: [{
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
    status: { type: String, enum: ['not_started', 'in_progress', 'completed'], default: 'not_started' },
    completedAt: Date,
    score: Number
  }],
  internshipStatus: {
    isEnrolled: { type: Boolean, default: false },
    enrolledAt: Date,
    currentDay: { type: Number, default: 0 },
    completionPercentage: { type: Number, default: 0 }
  },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  lastLogin: Date
});

const User = mongoose.model('User', userSchema);

const createDemoUsers = async () => {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Connected to MongoDB successfully');

    // Clear existing demo users first (optional - remove if you want to keep existing data)
    console.log('🧹 Cleaning up existing demo users...');
    await User.deleteMany({ 
      userId: { $in: ['ADMIN_001', 'INTERN_DEMO001'] }
    });

    console.log('👨‍💼 Creating admin user...');
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = new User({
      userId: 'ADMIN_001',
      name: 'System Administrator',
      email: 'admin@zeya-lms.com',
      password: adminPassword,
      role: 'admin',
      profileDetails: {
        phone: '+91-9876543210',
        bio: 'System Administrator for ZEYA LMS'
      },
      isActive: true
    });
    await admin.save();
    console.log('✅ Admin user created successfully');

    console.log('👨‍🎓 Creating demo intern user...');
    const internPassword = await bcrypt.hash('intern123', 12);
    const intern = new User({
      userId: 'INTERN_DEMO001',
      name: 'Demo Student',
      email: 'demo.intern@gmail.com',
      password: internPassword,
      role: 'user', // This will act as intern role
      profileDetails: {
        phone: '+91-9876543211',
        bio: 'Demo student account for testing the LMS system'
      },
      internshipStatus: {
        isEnrolled: false,
        currentDay: 0,
        completionPercentage: 0
      },
      isActive: true
    });
    await intern.save();
    console.log('✅ Demo intern user created successfully');

    console.log('\n🎉 Demo users setup completed successfully!');
    console.log('\n📋 LOGIN CREDENTIALS:');
    console.log('\n👨‍💼 ADMIN DASHBOARD ACCESS:');
    console.log('┌─────────────────────────────────────────┐');
    console.log('│  User ID: ADMIN_001                     │');
    console.log('│  Email:   admin@zeya-lms.com            │');
    console.log('│  Password: admin123                     │');
    console.log('│  Role:    Administrator                 │');
    console.log('└─────────────────────────────────────────┘');
    
    console.log('\n👨‍🎓 STUDENT/INTERN DASHBOARD ACCESS:');
    console.log('┌─────────────────────────────────────────┐');
    console.log('│  User ID: INTERN_DEMO001                │');
    console.log('│  Email:   demo.intern@gmail.com         │');
    console.log('│  Password: intern123                    │');
    console.log('│  Role:    Student/Intern                │');
    console.log('└─────────────────────────────────────────┘');
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Start your backend server: node server.js');
    console.log('2. Start your frontend: npm start');
    console.log('3. Open browser: http://localhost:3000');
    console.log('4. Try logging in with admin credentials first');
    console.log('5. Create some tasks in admin panel');
    console.log('6. Then login as intern to test student flow');
    
    console.log('\n⚠️ IMPORTANT NOTES:');
    console.log('• You can login using either User ID or Email');
    console.log('• Admin can access full admin dashboard');
    console.log('• Intern will see student dashboard');
    console.log('• Change passwords after first login');
    console.log('• Backend should be running on port 5000');
    console.log('• Frontend should be running on port 3000');

  } catch (error) {
    console.error('❌ Error creating demo users:', error.message);
    
    if (error.code === 11000) {
      console.log('\n🔍 This appears to be a duplicate key error.');
      console.log('Users might already exist. Try the credentials above first.');
    }
    
    console.log('\n🔧 TROUBLESHOOTING:');
    console.log('1. Make sure MongoDB connection string is correct');
    console.log('2. Check if users already exist in database');
    console.log('3. Try clearing the users collection if needed');
    console.log('4. Verify your server.js has matching User schema');
    
  } finally {
    await mongoose.connection.close();
    console.log('\n📦 Database connection closed');
    process.exit(0);
  }
};

// Handle script termination
process.on('SIGINT', async () => {
  console.log('\n👋 Script interrupted, closing database connection...');
  await mongoose.connection.close();
  process.exit(0);
});

// Run the function
console.log('🎯 Starting Demo Users Creation Script...');
console.log('📅 ' + new Date().toLocaleString());
console.log('─'.repeat(50));
createDemoUsers();