const express = require('express');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const { auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Get all internships (public)
router.get('/', async (req, res, next) => {
  try {
    const { category, difficulty, page = 1, limit = 10, search } = req.query;
    const db = getDB();
    
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const internships = await db.collection('internships').aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'enrollments',
          localField: '_id',
          foreignField: 'internshipId',
          as: 'enrollments'
        }
      },
      {
        $addFields: {
          enrolledCount: { $size: '$enrollments' }
        }
      },
      { $project: { enrollments: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    const total = await db.collection('internships').countDocuments(filter);

    res.json({
      success: true,
      data: {
        internships: internships.map(internship => ({
          ...internship,
          id: internship._id.toString()
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
});

// Get internship by ID
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    const internship = await db.collection('internships').aggregate([
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: 'tasks',
          localField: '_id',
          foreignField: 'internshipId',
          as: 'tasks',
          pipeline: [{ $sort: { taskOrder: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'enrollments',
          localField: '_id',
          foreignField: 'internshipId',
          as: 'enrollments'
        }
      },
      {
        $addFields: {
          enrolledCount: { $size: '$enrollments' }
        }
      },
      { $project: { enrollments: 0 } }
    ]).toArray();

    if (!internship.length) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...internship[0],
        id: internship[0]._id.toString(),
        tasks: internship[0].tasks.map(task => ({
          ...task,
          id: task._id.toString()
        }))
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create internship (Admin only)
router.post('/', [auth, adminAuth], async (req, res, next) => {
  try {
    const {
      title,
      description,
      duration,
      price,
      maxStudents,
      totalTasks,
      category,
      difficulty,
      requirements,
      outcomes
    } = req.body;

    const db = getDB();

    const internshipDoc = {
      title,
      description,
      duration: duration || 12,
      price: parseFloat(price),
      maxStudents: maxStudents || 50,
      totalTasks: totalTasks || 10,
      category,
      difficulty: difficulty || 'BEGINNER',
      requirements: requirements || [],
      outcomes: outcomes || [],
      isActive: true,
      createdById: new ObjectId(req.user.id),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('internships').insertOne(internshipDoc);

    res.status(201).json({
      success: true,
      message: 'Internship created successfully',
      data: {
        ...internshipDoc,
        id: result.insertedId.toString()
      }
    });
  } catch (error) {
    next(error);
  }
});

// Enroll in internship
router.post('/:id/enroll', auth, async (req, res, next) => {
  try {
    const internshipId = req.params.id;
    const studentId = req.user.id;
    const db = getDB();

    // Check if internship exists
    const internship = await db.collection('internships').findOne({
      _id: new ObjectId(internshipId),
      isActive: true
    });

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    // Check enrollment limit
    const enrollmentCount = await db.collection('enrollments').countDocuments({
      internshipId: new ObjectId(internshipId)
    });

    if (enrollmentCount >= internship.maxStudents) {
      return res.status(400).json({
        success: false,
        message: 'Internship is full'
      });
    }

    // Check if already enrolled
    const existingEnrollment = await db.collection('enrollments').findOne({
      studentId: new ObjectId(studentId),
      internshipId: new ObjectId(internshipId)
    });

    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'Already enrolled in this internship'
      });
    }

    // Create enrollment
    const enrollmentDoc = {
      studentId: new ObjectId(studentId),
      internshipId: new ObjectId(internshipId),
      status: 'ACTIVE',
      progressPercentage: 0,
      paymentStatus: 'PENDING',
      paymentAmount: internship.price,
      paymentId: null,
      certificateIssued: false,
      enrolledAt: new Date(),
      completedAt: null
    };

    const result = await db.collection('enrollments').insertOne(enrollmentDoc);

    res.status(201).json({
      success: true,
      message: 'Enrolled successfully',
      data: {
        ...enrollmentDoc,
        id: result.insertedId.toString(),
        internship
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get my enrollments
router.get('/my/enrollments', auth, async (req, res, next) => {
  try {
    const studentId = req.user.id;
    const db = getDB();

    const enrollments = await db.collection('enrollments').aggregate([
      { $match: { studentId: new ObjectId(studentId) } },
      {
        $lookup: {
          from: 'internships',
          localField: 'internshipId',
          foreignField: '_id',
          as: 'internship'
        }
      },
      { $unwind: '$internship' },
      {
        $lookup: {
          from: 'tasks',
          localField: 'internshipId',
          foreignField: 'internshipId',
          as: 'tasks',
          pipeline: [{ $sort: { taskOrder: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'taskSubmissions',
          localField: '_id',
          foreignField: 'enrollmentId',
          as: 'taskSubmissions'
        }
      },
      { $sort: { enrolledAt: -1 } }
    ]).toArray();

    // Calculate progress for each enrollment
    const enrichedEnrollments = enrollments.map(enrollment => {
      const completedTasks = enrollment.taskSubmissions.filter(
        sub => sub.status === 'APPROVED'
      ).length;
      const totalTasks = enrollment.tasks.length;
      const progressPercentage = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        ...enrollment,
        id: enrollment._id.toString(),
        internship: {
          ...enrollment.internship,
          id: enrollment.internship._id.toString()
        },
        progressPercentage,
        completedTasks,
        totalTasks
      };
    });

    res.json({
      success: true,
      data: enrichedEnrollments
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;