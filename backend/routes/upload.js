// routes/upload.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const { adminOnly } = require('../middleware/auth');
const { uploadFile, deleteFile } = require('../utils/helpers');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/temp/'); // Temporary storage before uploading to Cloudinary
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Define allowed file types based on upload type
    const uploadType = req.route.path;
    let allowedTypes = [];

    if (uploadType.includes('video')) {
      allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];
    } else if (uploadType.includes('image')) {
      allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    } else if (uploadType.includes('document') || uploadType.includes('file')) {
      allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
        'application/zip',
        'application/x-zip-compressed'
      ];
    } else {
      // General file upload - allow most common types
      allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
      ];
    }

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
    }
  }
});

// Admin-only file uploads
router.use(adminOnly);

// ==========================
// VIDEO UPLOADS
// ==========================

router.post('/video', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No video file provided'
      });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadFile(req.file, 'lms/videos');

    // Clean up temporary file
    require('fs').unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Video uploaded successfully',
      data: {
        url: uploadResult.url,
        publicId: uploadResult.public_id,
        format: uploadResult.format,
        duration: uploadResult.duration,
        size: uploadResult.bytes
      }
    });

  } catch (error) {
    // Clean up temporary file on error
    if (req.file && req.file.path) {
      try {
        require('fs').unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }

    console.error('Video upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload video'
    });
  }
});

// ==========================
// IMAGE UPLOADS
// ==========================

router.post('/image', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file provided'
      });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadFile(req.file, 'lms/images');

    // Clean up temporary file
    require('fs').unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Image uploaded successfully',
      data: {
        url: uploadResult.url,
        publicId: uploadResult.public_id,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        size: uploadResult.bytes
      }
    });

  } catch (error) {
    // Clean up temporary file on error
    if (req.file && req.file.path) {
      try {
        require('fs').unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }

    console.error('Image upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload image'
    });
  }
});

// ==========================
// DOCUMENT UPLOADS
// ==========================

router.post('/document', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No document file provided'
      });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadFile(req.file, 'lms/documents');

    // Clean up temporary file
    require('fs').unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        url: uploadResult.url,
        publicId: uploadResult.public_id,
        format: uploadResult.format,
        originalName: req.file.originalname,
        size: uploadResult.bytes
      }
    });

  } catch (error) {
    // Clean up temporary file on error
    if (req.file && req.file.path) {
      try {
        require('fs').unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }

    console.error('Document upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload document'
    });
  }
});

// ==========================
// MULTIPLE FILES UPLOAD
// ==========================

router.post('/files', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files provided'
      });
    }

    const uploadPromises = req.files.map(file => 
      uploadFile(file, 'lms/files').then(result => {
        // Clean up temporary file
        require('fs').unlinkSync(file.path);
        return {
          originalName: file.originalname,
          url: result.url,
          publicId: result.public_id,
          format: result.format,
          size: result.bytes
        };
      }).catch(error => {
        // Clean up temporary file on error
        try {
          require('fs').unlinkSync(file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
        throw error;
      })
    );

    const uploadResults = await Promise.all(uploadPromises);

    res.json({
      success: true,
      message: `${uploadResults.length} files uploaded successfully`,
      data: {
        files: uploadResults
      }
    });

  } catch (error) {
    // Clean up any remaining temporary files
    if (req.files) {
      req.files.forEach(file => {
        try {
          require('fs').unlinkSync(file.path);
        } catch (cleanupError) {
          console.error('Error cleaning up temp file:', cleanupError);
        }
      });
    }

    console.error('Multiple files upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload files'
    });
  }
});

// ==========================
// COVER IMAGE UPLOAD
// ==========================

router.post('/cover-image', upload.single('coverImage'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No cover image provided'
      });
    }

    // Upload to Cloudinary with specific transformations for cover images
    const uploadResult = await uploadFile(req.file, 'lms/cover-images');

    // Clean up temporary file
    require('fs').unlinkSync(req.file.path);

    res.json({
      success: true,
      message: 'Cover image uploaded successfully',
      data: {
        url: uploadResult.url,
        publicId: uploadResult.public_id,
        format: uploadResult.format,
        width: uploadResult.width,
        height: uploadResult.height,
        size: uploadResult.bytes
      }
    });

  } catch (error) {
    // Clean up temporary file on error
    if (req.file && req.file.path) {
      try {
        require('fs').unlinkSync(req.file.path);
      } catch (cleanupError) {
        console.error('Error cleaning up temp file:', cleanupError);
      }
    }

    console.error('Cover image upload error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload cover image'
    });
  }
});

// ==========================
// DELETE FILE
// ==========================

router.delete('/file/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    // Decode the public ID (in case it's URL encoded)
    const decodedPublicId = decodeURIComponent(publicId);

    const result = await deleteFile(decodedPublicId, resourceType);

    if (result.result === 'ok') {
      res.json({
        success: true,
        message: 'File deleted successfully'
      });
    } else {
      res.status(400).json({
        success: false,
        message: 'Failed to delete file'
      });
    }

  } catch (error) {
    console.error('Delete file error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete file'
    });
  }
});

// ==========================
// GET FILE INFO
// ==========================

router.get('/file-info/:publicId', async (req, res) => {
  try {
    const { publicId } = req.params;
    const { resourceType = 'image' } = req.query;

    if (!publicId) {
      return res.status(400).json({
        success: false,
        message: 'Public ID is required'
      });
    }

    // Get file info from Cloudinary
    const cloudinary = require('cloudinary').v2;
    const result = await cloudinary.api.resource(publicId, {
      resource_type: resourceType
    });

    res.json({
      success: true,
      data: {
        publicId: result.public_id,
        url: result.secure_url,
        format: result.format,
        resourceType: result.resource_type,
        size: result.bytes,
        width: result.width,
        height: result.height,
        createdAt: result.created_at,
        tags: result.tags
      }
    });

  } catch (error) {
    console.error('Get file info error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to get file info'
    });
  }
});

// ==========================
// ERROR HANDLING
// ==========================

// Handle multer errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File too large. Maximum size is 50MB.'
      });
    } else if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum is 10 files.'
      });
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected file field.'
      });
    }
  }

  // Handle custom file filter errors
  if (error.message.includes('Invalid file type')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
});

module.exports = router;