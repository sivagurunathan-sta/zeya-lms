const { MongoClient, ServerApiVersion } = require('mongodb');
const { MongoMemoryServer } = require('mongodb-memory-server');

let client;
let db;
let memoryServer = null;

async function connectDB() {
  if (db) return db;

  const dbName = process.env.MONGODB_DB_NAME || 'student_lms';
  let uri = process.env.MONGODB_URI && process.env.MONGODB_URI.trim();

  try {
    // Fallback to in-memory MongoDB for local/dev environments when no URI is provided
    if (!uri) {
      memoryServer = await MongoMemoryServer.create({ binary: { version: '7.0.5' } });
      uri = memoryServer.getUri();
      console.log('ℹ️ Using in-memory MongoDB for development');
    }

    client = new MongoClient(uri, uri.includes('mongodb+srv://') ? {
      serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true },
    } : {});

    await client.connect();
    db = client.db(dbName);
    console.log(`✅ Connected to MongoDB (${memoryServer ? 'memory' : 'external'}) - DB: ${dbName}`);
    return db;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    throw error;
  }
}

function getDB() {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB first.');
  }
  return db;
}

module.exports = { connectDB, getDB, client };
