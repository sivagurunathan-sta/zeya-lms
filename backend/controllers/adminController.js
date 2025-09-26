const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const logger = require('../utils/logger');

// Get dashboard statistics
const getDashboardStats = async (req, res, next) => {
  try {
    const db = getDB();

    // Get total counts
    const [
      totalStudents,
      totalInternships,
      totalEnrollments,
      totalRevenue,
      activeEnrollments,
      completedEnrollments
    ] = await Promise.all([
      db.collection('users').countDocuments({ role: 'STUDENT', isActive: true }),
      db.collection('internships').countDocuments({ isActive: true }),
      db.collection('enrollments').countDocuments(),
      db.collection('payments').aggregate([
        { $match: { status: 'COMPLETED' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]).toArray(),
      db.collection('enrollments').countDocuments({ status: 'ACTIVE' }),
      db.collection('enrollments').countDocuments({ status: 'COMPLETED' })
    ]);

    // Recent enrollments
    const recentEnrollments = await db.collection('enrollments').aggregate([
      { $sort: { enrolledAt: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student',
          pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }]
        }
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'internships',
          localField: 'internshipId',
          foreignField: '_id',
          as: 'internship',
          pipeline: [{ $project: { title: 1, category: 1 } }]
        }
      },
      { $unwind: '$internship' }
    ]).toArray();

    // Monthly stats
    const monthlyStats = await db.collection('enrollments').aggregate([
      {
        $match: {
          enrolledAt: { $gte: new Date(Date.now() - 12 * 30 * 24 * 60 * 60 * 1000) }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$enrolledAt' },
            month: { $month: '$enrolledAt' }
          },
          enrollments: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]).toArray();

    res.json({
      success: true,
      data: {
        overview: {
          totalStudents,
          totalInternships,
          totalEnrollments,
          totalRevenue: totalRevenue[0]?.total || 0,
          activeEnrollments,
          completedEnrollments
        },
        recentEnrollments: recentEnrollments.map(enrollment => ({
          ...enrollment,
          id: enrollment._id.toString()
        })),
        monthlyStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get all students
const getAllStudents = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const db = getDB();
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = { role: 'STUDENT' };
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }
    if (status !== undefined) {
      filter.isActive = status === 'active';
    }

    const students = await db.collection('users').aggregate([
      { $match: filter },
      {
        $lookup: {
          from: 'enrollments',
          localField: '_id',
          foreignField: 'studentId',
          as: 'enrollments'
        }
      },
      {
        $addFields: {
          enrollmentCount: { $size: '$enrollments' },
          completedCount: {
            $size: {
              $filter: {
                input: '$enrollments',
                cond: { $eq: ['$$this.status', 'COMPLETED'] }
              }
            }
          }
        }
      },
      { $project: { passwordHash: 0, enrollments: 0 } },
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    const total = await db.collection('users').countDocuments(filter);

    res.json({
      success: true,
      data: {
        students: students.map(student => ({
          ...student,
          id: student._id.toString()
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

// Get all internships (admin view)
const getAllInternships = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    const db = getDB();
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter
    const filter = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    if (status !== undefined) {
      filter.isActive = status === 'active';
    }

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
        $lookup: {
          from: 'users',
          localField: 'createdById',
          foreignField: '_id',
          as: 'creator',
          pipeline: [{ $project: { firstName: 1, lastName: 1 } }]
        }
      },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          enrollmentCount: { $size: '$enrollments' },
          revenue: {
            $sum: {
              $map: {
                input: {
                  $filter: {
                    input: '$enrollments',
                    cond: { $eq: ['$$this.paymentStatus', 'COMPLETED'] }
                  }
                },
                as: 'enrollment',
                in: '$$enrollment.paymentAmount'
              }
            }
          }
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
};

// Update student status
const updateStudentStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const db = getDB();

    const result = await db.collection('users').updateOne(
      { _id: new ObjectId(id), role: 'STUDENT' },
      {
        $set: {
          isActive: Boolean(isActive),
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    res.json({
      success: true,
      message: `Student ${isActive ? 'activated' : 'deactivated'} successfully`
    });
  } catch (error) {
    next(error);
  }
};

// Get revenue analytics
const getRevenueAnalytics = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const db = getDB();

    const matchStage = { status: 'COMPLETED' };
    if (startDate && endDate) {
      matchStage.paidAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const analytics = await db.collection('payments').aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$amount' },
          totalTransactions: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      }
    ]).toArray();

    // Monthly revenue
    const monthlyRevenue = await db.collection('payments').aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            year: { $year: '$paidAt' },
            month: { $month: '$paidAt' }
          },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': -1, '_id.month': -1 } },
      { $limit: 12 }
    ]).toArray();

    res.json({
      success: true,
      data: {
        overview: analytics[0] || {
          totalRevenue: 0,
          totalTransactions: 0,
          averageAmount: 0
        },
        monthlyRevenue
      }
    });
  } catch (error) {
    next(error);
  }
};

// Export data
const exportData = async (req, res, next) => {
  try {
    const { type } = req.params;
    const db = getDB();

    let data = [];
    let filename = '';

    switch (type) {
      case 'students':
        data = await db.collection('users').find(
          { role: 'STUDENT' },
          { projection: { passwordHash: 0 } }
        ).toArray();
        filename = 'students.json';
        break;

      case 'enrollments':
        data = await db.collection('enrollments').aggregate([
          {
            $lookup: {
              from: 'users',
              localField: 'studentId',
              foreignField: '_id',
              as: 'student',
              pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }]
            }
          },
          { $unwind: '$student' },
          {
            $lookup: {
              from: 'internships',
              localField: 'internshipId',
              foreignField: '_id',
              as: 'internship',
              pipeline: [{ $project: { title: 1, category: 1 } }]
            }
          },
          { $unwind: '$internship' }
        ]).toArray();
        filename = 'enrollments.json';
        break;

      case 'payments':
        data = await db.collection('payments').aggregate([
          { $match: { status: 'COMPLETED' } },
          {
            $lookup: {
              from: 'enrollments',
              localField: 'enrollmentId',
              foreignField: '_id',
              as: 'enrollment'
            }
          },
          { $unwind: '$enrollment' },
          {
            $lookup: {
              from: 'users',
              localField: 'enrollment.studentId',
              foreignField: '_id',
              as: 'student',
              pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1 } }]
            }
          },
          { $unwind: '$student' }
        ]).toArray();
        filename = 'payments.json';
        break;

      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid export type'
        });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
  getAllStudents,
  getAllInternships,
  updateStudentStatus,
  getRevenueAnalytics,
  exportData
};