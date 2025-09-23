const express = require('express');
const { auth } = require('../middleware/auth');
const { uploadFileWithProcessing, deleteFromS3 } = require('../utils/upload');
const { upload } = require('../utils/upload');

const router = express.Router();

// Upload files (multiple)
router.post('/files', [auth, upload.array('files', 5)], async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadPromises = req.files.map(file => 
      uploadFileWithProcessing(file, req.user.id, { public: true })
    );

    const uploadResults = await Promise.all(uploadPromises);

    res.json({
      success: true,
      message: 'Files uploaded successfully',
      data: uploadResults
    });
  } catch (error) {
    next(error);
  }
});

// Upload single file
router.post('/file', [auth, upload.single('file')], async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const uploadResult = await uploadFileWithProcessing(req.file, req.user.id, { public: true });

    res.json({
      success: true,
      message: 'File uploaded successfully',
      data: uploadResult
    });
  } catch (error) {
    next(error);
  }
});

// Delete file
router.delete('/file/:key', auth, async (req, res, next) => {
  try {
    const { key } = req.params;
    
    await deleteFromS3(key);

    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;