const { getDB } = require('../config/database');

const COLLECTION = 'site_content';

async function ensureIndexes() {
  const db = getDB();
  await db.collection(COLLECTION).createIndex({ key: 1 }, { unique: true });
}

async function getAll() {
  const db = getDB();
  await ensureIndexes();
  const docs = await db.collection(COLLECTION).find({}).sort({ key: 1 }).toArray();
  return docs;
}

async function getByKey(key) {
  const db = getDB();
  await ensureIndexes();
  const doc = await db.collection(COLLECTION).findOne({ key });
  return doc;
}

async function getMany(keys) {
  const db = getDB();
  await ensureIndexes();
  const docs = await db.collection(COLLECTION).find({ key: { $in: keys } }).toArray();
  return docs;
}

async function upsert(key, value, user) {
  const db = getDB();
  await ensureIndexes();
  const now = new Date();
  const result = await db.collection(COLLECTION).findOneAndUpdate(
    { key },
    { $set: { key, value, updatedAt: now, updatedBy: user?.id || null }, $setOnInsert: { createdAt: now } },
    { upsert: true, returnDocument: 'after' }
  );
  return result.value;
}

async function remove(key) {
  const db = getDB();
  await ensureIndexes();
  await db.collection(COLLECTION).deleteOne({ key });
  return { key };
}

module.exports = { getAll, getByKey, getMany, upsert, remove };
