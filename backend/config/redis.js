const redis = require('redis');

let client;

if (process.env.REDIS_URL) {
  client = redis.createClient({ url: process.env.REDIS_URL });
  client.on('error', (err) => {
    console.log('Redis Client Error', err);
  });
  client.connect().catch((err) => {
    console.log('Redis connect error', err);
  });
  console.log('ℹ️ Redis configured with REDIS_URL');
} else {
  // No-op client for development where Redis is not available
  console.log('ℹ️ REDIS_URL not set. Using in-memory no-op Redis client.');
  client = {
    async get() { return null; },
    async set() { return 'OK'; },
    async del() { return 1; },
    async expire() { return true; },
  };
}

module.exports = client;
