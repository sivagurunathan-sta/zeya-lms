const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const path = require('path');
const fs = require('fs');
const logger = require('../utils/logger');

// Upload files
const uploadFiles = async (req, res, next) => {
  try {
    const files = req.files || [req.file];
    const db = getDB();
    
    if (!files || files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedFiles = [];
    
    for (const file of files) {
      if (!file) continue;
      
      // Generate unique filename
      const timestamp = Date.now();
      const randomString = Math.random().toString(36).substring(2);
      const extension = path.extname(file.originalname);
      const fileName = `${timestamp}-${randomString}${extension}`;
      
      // Define file path (relative to backend/uploads)
      const relativePath = `uploads/${fileName}`;
      const absolutePath = path.join(__dirname, '..', relativePath);
      
      // Ensure uploads directory exists
      const uploadsDir = path.join(__dirname, '..', 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      
      // Move file from temp to permanent location
      if (file.path) {
        fs.renameSync(file.path, absolutePath);
      } else {
        fs.writeFileSync(absolutePath, file.buffer);
      }
      
      // Save file record to database
      const fileRecord = {
        originalName: file.originalname,
        fileName,
        filePath: relativePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedBy: new ObjectId(req.user.id),
        uploadedAt: new Date(),
        isActive: true
      };
      
      const result = await db.collection('uploads').insertOne(fileRecord);
      
      uploadedFiles.push({
        id: result.insertedId.toString(),
        originalName: file.originalname,
        fileName,
        fileSize: file.size,
        mimeType: file.mimetype,
        url: `/uploads/${fileName}`,
        uploadedAt: fileRecord.uploadedAt
      });
      
      logger.info(`File uploaded: ${file.originalname} -> ${fileName}`);
    }

    res.json({
      success: true,
      message: `${uploadedFiles.length} file(s) uploaded successfully`,
      data: uploadedFiles
    });
  } catch (error) {
    // Clean up any uploaded files on error
    if (req.files) {
      req.files.forEach(file => {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    
    logger.error('File upload error:', error);
    next(error);
  }
};

// Delete file
const deleteFile = async (req, res, next) => {
  try {
    const { key } = req.params;
    const db = getDB();
    
    // Find file record
    const fileRecord = await db.collection('uploads').findOne({
      $or: [
        { _id: new ObjectId(key) },
        { fileName: key }
      ],
      uploadedBy: new ObjectId(req.user.id),
      isActive: true
    });
    
    if (!fileRecord) {
      return res.status(404).json({
        success: false,
        message: 'File not found or unauthorized'
      });
    }
    
    // Delete physical file
    const filePath = path.join(__dirname, '..', fileRecord.filePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Mark as deleted in database
    await db.collection('uploads').updateOne(
      { _id: fileRecord._id },
      {
        $set: {
          isActive: false,
          deletedAt: new Date()
        }
      }
    );
    
    logger.info(`File deleted: ${fileRecord.fileName}`);
    
    res.json({
      success: true,
      message: 'File deleted successfully'
    });
  } catch (error) {
    logger.error('File deletion error:', error);
    next(error);
  }
};

// Get uploaded files for user
const getUserFiles = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type } = req.query;
    const db = getDB();
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter
    const filter = {
      uploadedBy: new ObjectId(req.user.id),
      isActive: true
    };
    
    if (type) {
      filter.mimeType = { $regex: type, $options: 'i' };
    }
    
    const files = await db.collection('uploads')
      .find(filter)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .toArray();
    
    const total = await db.collection('uploads').countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        files: files.map(file => ({
          id: file._id.toString(),
          originalName: file.originalName,
          fileName: file.fileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          url: `/uploads/${file.fileName}`,
          uploadedAt: file.uploadedAt
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get file info
const getFileInfo = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    const file = await db.collection('uploads').findOne({
      _id: new ObjectId(id),
      uploadedBy: new ObjectId(req.user.id),
      isActive: true
    });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    res.json({
      success: true,
      data: {
        id: file._id.toString(),
        originalName: file.originalName,
        fileName: file.fileName,
        fileSize: file.fileSize,
        mimeType: file.mimeType,
        url: `/uploads/${file.fileName}`,
        uploadedAt: file.uploadedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// Download file
const downloadFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();
    
    const file = await db.collection('uploads').findOne({
      _id: new ObjectId(id),
      uploadedBy: new ObjectId(req.user.id),
      isActive: true
    });
    
    if (!file) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }
    
    const filePath = path.join(__dirname, '..', file.filePath);
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found on disk'
      });
    }
    
    res.setHeader('Content-Disposition', `attachment; filename="${file.originalName}"`);
    res.setHeader('Content-Type', file.mimeType);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

// Admin: Get all files
const getAllFiles = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, userId } = req.query;
    const db = getDB();
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build filter
    const filter = { isActive: true };
    
    if (type) {
      filter.mimeType = { $regex: type, $options: 'i' };
    }
    
    if (userId) {
      filter.uploadedBy = new ObjectId(userId);
    }
    
    const files = await db.collection('uploads').aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'users',
          localField: 'uploadedBy',
          foreignField: '_id',
          as: 'user',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, email: 1 } }
          ]
        }
      },
      { $unwind: '$user' },
      { $sort: { uploadedAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();
    
    const total = await db.collection('uploads').countDocuments(filter);
    
    res.json({
      success: true,
      data: {
        files: files.map(file => ({
          id: file._id.toString(),
          originalName: file.originalName,
          fileName: file.fileName,
          fileSize: file.fileSize,
          mimeType: file.mimeType,
          url: `/uploads/${file.fileName}`,
          uploadedAt: file.uploadedAt,
          uploadedBy: {
            id: file.user._id.toString(),
            name: `${file.user.firstName} ${file.user.lastName}`,
            email: file.user.email
          }
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// Utility function to format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Utility function to get file category
const getFileCategory = (mimeType) => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('video/')) return 'video';
  if (mimeType.startsWith('audio/')) return 'audio';
  if (mimeType.includes('pdf')) return 'document';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'document';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'spreadsheet';
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return 'presentation';
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return 'archive';
  return 'other';
};

module.exports = {
  uploadFiles,
  deleteFile,
  getUserFiles,
  getFileInfo,
  downloadFile,
  getAllFiles,
  formatFileSize,
  getFileCategory
};