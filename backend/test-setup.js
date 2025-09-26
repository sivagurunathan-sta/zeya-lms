// test-setup.js - Run this to verify your setup
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

async function verifySetup() {
  console.log('🔍 Verifying LMS Setup...\n');

  try {
    // Test 1: Database Connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connected successfully\n');

    // Test 2: Check if admin user exists
    console.log('2. Checking for admin user...');
    const adminUser = await prisma.user.findUnique({
      where: { userId: 'ADMIN001' }
    });

    if (adminUser) {
      console.log('✅ Admin user found:', adminUser.email);
      
      // Test password
      const isValidPassword = await bcrypt.compare('admin123', adminUser.passwordHash);
      if (isValidPassword) {
        console.log('✅ Admin password is correct\n');
      } else {
        console.log('❌ Admin password is incorrect\n');
      }
    } else {
      console.log('❌ Admin user not found');
      console.log('Creating admin user...');
      
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const newAdmin = await prisma.user.create({
        data: {
          userId: 'ADMIN001',
          name: 'System Administrator',
          email: 'admin@lms.com',
          role: 'ADMIN',
          passwordHash: hashedPassword,
          isActive: true
        }
      });
      console.log('✅ Admin user created:', newAdmin.email, '\n');
    }

    // Test 3: Check environment variables
    console.log('3. Checking environment variables...');
    const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
    let envValid = true;

    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} is set`);
      } else {
        console.log(`❌ ${envVar} is missing`);
        envValid = false;
      }
    }

    if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 20) {
      console.log('⚠️  JWT_SECRET should be longer for security');
      envValid = false;
    }

    console.log('');

    // Test 4: Count records
    console.log('4. Checking database records...');
    const userCount = await prisma.user.count();
    const internshipCount = await prisma.internship.count();
    const taskCount = await prisma.task.count();
    
    console.log(`📊 Users: ${userCount}`);
    console.log(`📊 Internships: ${internshipCount}`);
    console.log(`📊 Tasks: ${taskCount}\n`);

    // Test 5: Test login simulation
    console.log('5. Testing login simulation...');
    const jwt = require('jsonwebtoken');
    
    if (adminUser && process.env.JWT_SECRET) {
      try {
        const token = jwt.sign(
          { 
            id: adminUser.id, 
            userId: adminUser.userId, 
            role: adminUser.role 
          },
          process.env.JWT_SECRET,
          { expiresIn: '24h' }
        );
        
        // Verify token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('✅ JWT token generation and verification works');
        console.log('✅ Login simulation successful\n');
      } catch (error) {
        console.log('❌ JWT token error:', error.message, '\n');
      }
    }

    // Summary
    console.log('🎉 Setup verification complete!');
    
    if (envValid && adminUser) {
      console.log('\n✅ Your setup looks good! You can try logging in with:');
      console.log('   Email: admin@lms.com');
      console.log('   User ID: ADMIN001');
      console.log('   Password: admin123');
      
      console.log('\n🚀 Start your server with: npm run dev');
      console.log('📡 Test login at: POST http://localhost:3000/api/auth/login');
    } else {
      console.log('\n❌ There are issues that need to be fixed before sign-in will work.');
    }

  } catch (error) {
    console.error('❌ Setup verification failed:', error.message);
    
    if (error.code === 'P1001') {
      console.log('\n💡 Database connection failed. Please check:');
      console.log('   - PostgreSQL is running');
      console.log('   - DATABASE_URL in .env is correct');
      console.log('   - Database exists');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifySetup();