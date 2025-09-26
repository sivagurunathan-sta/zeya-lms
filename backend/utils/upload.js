const multer = require('multer');
const AWS = require('aws-sdk');
const path = require('path');
const crypto = require('crypto');
const sharp = require('sharp');
const fs = require('fs');
const logger = require('./logger');

// Configure AWS S3
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'us-east-1'
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET;

// File upload configurations
const fileConfig = {
  // Maximum file size (50MB)
  maxFileSize: 50 * 1024 * 1024,
  
  // Allowed file types
  allowedImageTypes: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'],
  allowedDocumentTypes: ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
  allowedVideoTypes: ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm'],
  allowedAudioTypes: ['.mp3', '.wav', '.aac', '.ogg', '.wma'],
  allowedArchiveTypes: ['.zip', '.rar', '.7z', '.tar', '.gz'],
  
  // Image optimization settings
  imageOptimization: {
    maxWidth: 1920,
    maxHeight: 1080,
    quality: 85,
    format: 'jpeg'
  }
};

// Multer configuration for local storage (temporary)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/temp');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  }
});

// File filter function
const fileFilter = (req, file, cb) => {
  const extension = path.extname(file.originalname).toLowerCase();
  const allowedExtensions = [
    ...fileConfig.allowedImageTypes,
    ...fileConfig.allowedDocumentTypes,
    ...fileConfig.allowedVideoTypes,
    ...fileConfig.allowedAudioTypes,
    ...fileConfig.allowedArchiveTypes
  ];

  if (allowedExtensions.includes(extension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${extension} is not allowed`), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: fileConfig.maxFileSize
  }
});

// Upload file to S3
const uploadToS3 = async (fileBuffer, key, contentType, options = {}) => {
  try {
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      ACL: options.public ? 'public-read' : 'private',
      ...options.metadata && { Metadata: options.metadata }
    };

    const result = await s3.upload(uploadParams).promise();
    
    logger.info(`File uploaded to S3: ${key}`);
    
    return result.Location;
  } catch (error) {
    logger.error('S3 upload failed:', error);
    throw new Error('Failed to upload file to cloud storage');
  }
};

// Upload file with processing
const uploadFileWithProcessing = async (file, userId, options = {}) => {
  try {
    const fileExtension = path.extname(file.originalname).toLowerCase();
    const fileName = generateFileName(file.originalname);
    const s3Key = `uploads/${userId}/${fileName}`;
    
    let fileBuffer = fs.readFileSync(file.path);
    let contentType = file.mimetype;

    // Process image files
    if (fileConfig.allowedImageTypes.includes(fileExtension)) {
      const processedImage = await processImage(fileBuffer, options.imageOptions);
      fileBuffer = processedImage.buffer;
      contentType = processedImage.contentType;
    }

    // Upload to S3
    const fileUrl = await uploadToS3(fileBuffer, s3Key, contentType, {
      public: options.public !== false,
      metadata: {
        originalName: file.originalname,
        uploadedBy: userId,
        uploadDate: new Date().toISOString()
      }
    });

    // Clean up temporary file
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    return {
      originalName: file.originalname,
      fileName,
      fileSize: fileBuffer.length,
      mimeType: contentType,
      s3Key,
      fileUrl
    };
  } catch (error) {
    // Clean up temporary file on error
    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    
    logger.error('File upload processing failed:', error);
    throw error;
  }
};

// Process image (resize, optimize, convert)
const processImage = async (buffer, options = {}) => {
  try {
    const config = { ...fileConfig.imageOptimization, ...options };
    
    let image = sharp(buffer);
    const metadata = await image.metadata();

    // Resize if needed
    if (metadata.width > config.maxWidth || metadata.height > config.maxHeight) {
      image = image.resize(config.maxWidth, config.maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      });
    }

    // Convert and optimize based on format
    let processedBuffer;
    let contentType;

    switch (config.format) {
      case 'jpeg':
        processedBuffer = await image.jpeg({ quality: config.quality }).toBuffer();
        contentType = 'image/jpeg';
        break;
      case 'png':
        processedBuffer = await image.png({ compressionLevel: 9 }).toBuffer();
        contentType = 'image/png';
        break;
      case 'webp':
        processedBuffer = await image.webp({ quality: config.quality }).toBuffer();
        contentType = 'image/webp';
        break;
      default:
        // Keep original format but optimize
        if (metadata.format === 'jpeg') {
          processedBuffer = await image.jpeg({ quality: config.quality }).toBuffer();
          contentType = 'image/jpeg';
        } else if (metadata.format === 'png') {
          processedBuffer = await image.png({ compressionLevel: 9 }).toBuffer();
          contentType = 'image/png';
        } else {
          processedBuffer = buffer;
          contentType = `image/${metadata.format}`;
        }
    }

    return {
      buffer: processedBuffer,
      contentType,
      originalSize: buffer.length,
      processedSize: processedBuffer.length,
      compressionRatio: ((buffer.length - processedBuffer.length) / buffer.length * 100).toFixed(2)
    };
  } catch (error) {
    logger.error('Image processing failed:', error);
    // Return original buffer if processing fails
    return {
      buffer,
      contentType: 'image/jpeg' // default fallback
    };
  }
};

// Generate unique filename
const generateFileName = (originalName) => {
  const extension = path.extname(originalName);
  const nameWithoutExt = path.basename(originalName, extension);
  const timestamp = Date.now();
  const randomString = crypto.randomBytes(8).toString('hex');
  
  // Sanitize filename
  const sanitizedName = nameWithoutExt
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 50);
  
  return `${sanitizedName}_${timestamp}_${randomString}${extension}`;
};

// Delete file from S3
const deleteFromS3 = async (s3Key) => {
  try {
    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key
    };

    await s3.deleteObject(deleteParams).promise();
    logger.info(`File deleted from S3: ${s3Key}`);
    
    return true;
  } catch (error) {
    logger.error('S3 delete failed:', error);
    throw new Error('Failed to delete file from cloud storage');
  }
};

// Get file from S3
const getFromS3 = async (s3Key) => {
  try {
    const getParams = {
      Bucket: BUCKET_NAME,
      Key: s3Key
    };

    const result = await s3.getObject(getParams).promise();
    
    return {
      buffer: result.Body,
      contentType: result.ContentType,
      lastModified: result.LastModified,
      contentLength: result.ContentLength
    };
  } catch (error) {
    logger.error('S3 get failed:', error);
    throw new Error('Failed to retrieve file from cloud storage');
  }
};

// Generate presigned URL for direct upload
const generatePresignedUploadUrl = (s3Key, contentType, expiresIn = 3600) => {
  try {
    const presignedUrl = s3.getSignedUrl('putObject', {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      ContentType: contentType,
      Expires: expiresIn,
      ACL: 'public-read'
    });

    const fileUrl = `https://${BUCKET_NAME}.s3.amazonaws.com/${s3Key}`;

    return {
      presignedUrl,
      fileUrl,
      s3Key,
      expiresIn
    };
  } catch (error) {
    logger.error('Failed to generate presigned URL:', error);
    throw new Error('Failed to generate upload URL');
  }
};

// Generate presigned URL for download
const generatePresignedDownloadUrl = (s3Key, expiresIn = 3600, filename = null) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: s3Key,
      Expires: expiresIn
    };

    if (filename) {
      params.ResponseContentDisposition = `attachment; filename="${filename}"`;
    }

    const presignedUrl = s3.getSignedUrl('getObject', params);

    return {
      downloadUrl: presignedUrl,
      expiresIn
    };
  } catch (error) {
    logger.error('Failed to generate download URL:', error);
    throw new Error('Failed to generate download URL');
  }
};

// Validate file type
const validateFileType = (filename, allowedTypes) => {
  const extension = path.extname(filename).toLowerCase();
  return allowedTypes.includes(extension);
};

// Get file type category
const getFileCategory = (filename) => {
  const extension = path.extname(filename).toLowerCase();
  
  if (fileConfig.allowedImageTypes.includes(extension)) return 'image';
  if (fileConfig.allowedDocumentTypes.includes(extension)) return 'document';
  if (fileConfig.allowedVideoTypes.includes(extension)) return 'video';
  if (fileConfig.allowedAudioTypes.includes(extension)) return 'audio';
  if (fileConfig.allowedArchiveTypes.includes(extension)) return 'archive';
  
  return 'other';
};

// Format file size
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Clean up temporary files (call periodically)
const cleanupTempFiles = () => {
  const tempDir = path.join(__dirname, '../uploads/temp');
  
  if (!fs.existsSync(tempDir)) return;

  const files = fs.readdirSync(tempDir);
  const now = Date.now();
  const maxAge = 60 * 60 * 1000; // 1 hour

  files.forEach(file => {
    const filePath = path.join(tempDir, file);
    const stats = fs.statSync(filePath);
    
    if (now - stats.mtime.getTime() > maxAge) {
      fs.unlinkSync(filePath);
      logger.info(`Cleaned up temporary file: ${file}`);
    }
  });
};

// Validate image dimensions
const validateImageDimensions = async (buffer, maxWidth = 5000, maxHeight = 5000) => {
  try {
    const metadata = await sharp(buffer).metadata();
    
    return {
      isValid: metadata.width <= maxWidth && metadata.height <= maxHeight,
      width: metadata.width,
      height: metadata.height,
      format: metadata.format
    };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
};

// Check if S3 bucket exists and is accessible
const checkS3Connection = async () => {
  try {
    await s3.headBucket({ Bucket: BUCKET_NAME }).promise();
    return { connected: true };
  } catch (error) {
    logger.error('S3 connection check failed:', error);
    return { connected: false, error: error.message };
  }
};

module.exports = {
  upload,
  uploadToS3,
  uploadFileWithProcessing,
  processImage,
  deleteFromS3,
  getFromS3,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  validateFileType,
  getFileCategory,
  formatFileSize,
  cleanupTempFiles,
  validateImageDimensions,
  checkS3Connection,
  fileConfig
};