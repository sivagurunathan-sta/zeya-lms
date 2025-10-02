const multer = require('multer');
const path = require('path');

const createUploadMiddleware = (destinationFolder, fileTypes = ['jpg', 'jpeg', 'png', 'pdf']) => {
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, `uploads/${destinationFolder}`);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
  });

  const fileFilter = (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (fileTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed: ${fileTypes.join(', ')}`));
    }
  };

  return multer({
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
  });
};

module.exports = { createUploadMiddleware };