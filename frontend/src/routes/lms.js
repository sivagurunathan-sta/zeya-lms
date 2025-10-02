const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const { authenticateToken, authorizeAdmin } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const prisma = new PrismaClient();

// Multer config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = req.body.uploadType || 'general';
    cb(null, `uploads/${type}`);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|pdf|doc|docx|zip|mp4|avi/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// ===== ADMIN: CREATE INTERNSHIP =====
router.post('/admin/internships/create', authenticateToken, authorizeAdmin, upload.fields([
  { name: 'courseImage', maxCount: 1 },
  { name: 'taskFiles', maxCount: 50 }
]), async (req, res) => {
  try {
    const { courseName, courseDescription, duration, passPercentage, certificatePrice, tasks } = req.body;

    const courseImage = req.files['courseImage'] ? `/uploads/courses/${req.files['courseImage'][0].filename}` : null;

    const internship = await prisma.internship.create({
      data: {
        title: courseName,
        description: courseDescription,
        coverImage: courseImage,
        durationDays: parseInt(duration) || 35,
        passPercentage: parseFloat(passPercentage) || 75,
        certificatePrice: parseInt(certificatePrice) || 499
      }
    });

    const tasksArray = JSON.parse(tasks);
    const createdTasks = [];

    for (const taskData of tasksArray) {
      const taskFiles = req.files['taskFiles'] || [];
      const fileUrls = taskFiles
        .filter(f => f.originalname.includes(`task${taskData.taskNumber}`))
        .map(f => ({ name: f.originalname, url: `/uploads/tasks/${f.filename}`, type: path.extname(f.originalname).substring(1) }));

      const task = await prisma.task.create({
        data: {
          internshipId: internship.id,
          taskNumber: parseInt(taskData.taskNumber),
          title: taskData.title,
          description: taskData.description,
          videoUrl: taskData.videoUrl || null,
          files: fileUrls,
          submissionType: taskData.submissionType || 'GITHUB',
          points: parseInt(taskData.points) || 100,
          waitTimeHours: 12
        }
      });

      createdTasks.push(task);
    }

    res.status(201).json({
      success: true,
      message: 'Internship created successfully',
      data: { internship, tasks: createdTasks }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create internship', error: error.message });
  }
});

// Continuing in next artifact...