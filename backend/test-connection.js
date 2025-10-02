// backend/test-connection.js
const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();

async function testConnection() {
  console.log('Testing MongoDB connection...');
  console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Set ✓' : 'Not Set ✗');
  
  try {
    await prisma.$connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    // Try to count users
    const userCount = await prisma.user.count();
    console.log(`📊 Found ${userCount} users in database`);
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

testConnection();