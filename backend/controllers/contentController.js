const contentService = require('../services/contentService');

exports.list = async (req, res, next) => {
  try {
    const items = await contentService.getAll();
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

exports.get = async (req, res, next) => {
  try {
    const { key } = req.params;
    const item = await contentService.getByKey(key);
    if (!item) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

exports.getMany = async (req, res, next) => {
  try {
    const { keys } = req.query;
    const parsed = Array.isArray(keys) ? keys : (keys ? String(keys).split(',') : []);
    const items = await contentService.getMany(parsed);
    res.json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

exports.upsert = async (req, res, next) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    if (typeof key !== 'string' || key.trim() === '') {
      return res.status(400).json({ success: false, message: 'Invalid key' });
    }
    const saved = await contentService.upsert(key, value, req.user);
    res.json({ success: true, data: saved });
  } catch (err) {
    next(err);
  }
};

exports.remove = async (req, res, next) => {
  try {
    const { key } = req.params;
    await contentService.remove(key);
    res.json({ success: true, data: { key } });
  } catch (err) {
    next(err);
  }
};
