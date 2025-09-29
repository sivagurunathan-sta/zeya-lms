// test-connection.js
const { MongoClient } = require('mongodb');

const uri = "mongodb+srv://sivagurunathan875_db_user:shDbGcTzGPFwjwsW@cluster0.epgf9z2.mongodb.net/lms_database?retryWrites=true&w=majority&appName=Cluster0";

async function testConnection() {
  const client = new MongoClient(uri);
  
  try {
    console.log('🔄 Attempting to connect to MongoDB...');
    await client.connect();
    console.log('✅ Successfully connected to MongoDB!');
    
    // Test database access
    const db = client.db('lms_database');
    const collections = await db.listCollections().toArray();
    console.log('📦 Available collections:', collections.length);
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  } finally {
    await client.close();
  }
}

testConnection();