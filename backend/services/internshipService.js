const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const logger = require('../utils/logger');
const { calculatePagination } = require('../utils/helpers');

class InternshipService {
  // Get all internships with filters and pagination
  async getInternships(filters = {}, pagination = {}) {
    const db = getDB();
    const { category, difficulty, search, priceMin, priceMax, isActive = true } = filters;
    const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = pagination;

    // Build filter object
    const filter = { isActive };
    
    if (category) filter.category = category;
    if (difficulty) filter.difficulty = difficulty;
    if (priceMin || priceMax) {
      filter.price = {};
      if (priceMin) filter.price.$gte = parseFloat(priceMin);
      if (priceMax) filter.price.$lte = parseFloat(priceMax);
    }
    
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const paginationInfo = calculatePagination(page, limit, 0); // Total will be calculated
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Get internships with enrollment count
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
          enrolledCount: { $size: '$enrollments' },
          spotsLeft: { $subtract: ['$maxStudents', { $size: '$enrollments' }] }
        }
      },
      { $project: { enrollments: 0 } },
      { $sort: sort },
      { $skip: paginationInfo.skip },
      { $limit: paginationInfo.limit }
    ]).toArray();

    const total = await db.collection('internships').countDocuments(filter);
    const finalPagination = calculatePagination(page, limit, total);

    return {
      internships: internships.map(internship => ({
        ...internship,
        id: internship._id.toString()
      })),
      pagination: finalPagination
    };
  }

  // Get internship by ID with detailed information
  async getInternshipById(id) {
    const db = getDB();

    const internship = await db.collection('internships').aggregate([
      { $match: { _id: new ObjectId(id) } },
      {
        $lookup: {
          from: 'tasks',
          localField: '_id',
          foreignField: 'internshipId',
          as: 'tasks',
          pipeline: [
            { $sort: { taskOrder: 1 } },
            { $project: { title: 1, taskOrder: 1, estimatedHours: 1, isMandatory: 1 } }
          ]
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
        $lookup: {
          from: 'users',
          localField: 'createdById',
          foreignField: '_id',
          as: 'creator',
          pipeline: [
            { $project: { firstName: 1, lastName: 1, email: 1 } }
          ]
        }
      },
      { $unwind: { path: '$creator', preserveNullAndEmptyArrays: true } },
      {
        $addFields: {
          enrolledCount: { $size: '$enrollments' },
          spotsLeft: { $subtract: ['$maxStudents', { $size: '$enrollments' }] },
          isFullyBooked: { $gte: [{ $size: '$enrollments' }, '$maxStudents'] }
        }
      },
      { $project: { enrollments: 0 } }
    ]).toArray();

    if (!internship.length) {
      throw new Error('Internship not found');
    }

    return {
      ...internship[0],
      id: internship[0]._id.toString(),
      tasks: internship[0].tasks.map(task => ({
        ...task,
        id: task._id.toString()
      }))
    };
  }

  // Create new internship
  async createInternship(internshipData, createdById) {
    const db = getDB();

    const internshipDoc = {
      title: internshipData.title,
      description: internshipData.description,
      duration: internshipData.duration || 12,
      price: parseFloat(internshipData.price),
      maxStudents: internshipData.maxStudents || 50,
      totalTasks: internshipData.totalTasks || 10,
      category: internshipData.category,
      difficulty: internshipData.difficulty || 'BEGINNER',
      requirements: internshipData.requirements || [],
      outcomes: internshipData.outcomes || [],
      isActive: true,
      thumbnail: internshipData.thumbnail || null,
      createdById: new ObjectId(createdById),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('internships').insertOne(internshipDoc);

    logger.info(`Internship created: ${result.insertedId}`);

    return {
      ...internshipDoc,
      id: result.insertedId.toString()
    };
  }

  // Update internship
  async updateInternship(id, updateData) {
    const db = getDB();

    const updateFields = {
      ...updateData,
      updatedAt: new Date()
    };

    // Remove undefined fields
    Object.keys(updateFields).forEach(key => {
      if (updateFields[key] === undefined) {
        delete updateFields[key];
      }
    });

    const result = await db.collection('internships').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateFields },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Internship not found');
    }

    logger.info(`Internship updated: ${id}`);

    return {
      ...result.value,
      id: result.value._id.toString()
    };
  }

  // Delete internship
  async deleteInternship(id) {
    const db = getDB();

    // Check if there are active enrollments
    const enrollmentCount = await db.collection('enrollments').countDocuments({
      internshipId: new ObjectId(id),
      status: { $in: ['ACTIVE', 'COMPLETED'] }
    });

    if (enrollmentCount > 0) {
      throw new Error('Cannot delete internship with active enrollments');
    }

    // Delete associated tasks first
    await db.collection('tasks').deleteMany({
      internshipId: new ObjectId(id)
    });

    // Delete the internship
    const result = await db.collection('internships').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      throw new Error('Internship not found');
    }

    logger.info(`Internship deleted: ${id}`);

    return { message: 'Internship deleted successfully' };
  }

  // Enroll student in internship
  async enrollStudent(internshipId, studentId) {
    const db = getDB();

    // Check if internship exists and is active
    const internship = await db.collection('internships').findOne({
      _id: new ObjectId(internshipId),
      isActive: true
    });

    if (!internship) {
      throw new Error('Internship not found or inactive');
    }

    // Check enrollment capacity
    const currentEnrollments = await db.collection('enrollments').countDocuments({
      internshipId: new ObjectId(internshipId)
    });

    if (currentEnrollments >= internship.maxStudents) {
      throw new Error('Internship is full');
    }

    // Check if student is already enrolled
    const existingEnrollment = await db.collection('enrollments').findOne({
      studentId: new ObjectId(studentId),
      internshipId: new ObjectId(internshipId)
    });

    if (existingEnrollment) {
      throw new Error('Already enrolled in this internship');
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

    logger.info(`Student enrolled: ${studentId} in internship ${internshipId}`);

    return {
      ...enrollmentDoc,
      id: result.insertedId.toString(),
      internship
    };
  }

  // Get student enrollments
  async getStudentEnrollments(studentId, filters = {}) {
    const db = getDB();
    const { status, paymentStatus } = filters;

    const filter = { studentId: new ObjectId(studentId) };
    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;

    const enrollments = await db.collection('enrollments').aggregate([
      { $match: filter },
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
        progressPercentage: Math.round(progressPercentage),
        completedTasks,
        totalTasks,
        nextTask: enrollment.tasks.find(task => 
          !enrollment.taskSubmissions.some(sub => 
            sub.taskId.toString() === task._id.toString() && sub.status === 'APPROVED'
          )
        )
      };
    });

    return enrichedEnrollments;
  }

  // Get internship categories
  async getCategories() {
    const db = getDB();

    const categories = await db.collection('internships').aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          averagePrice: { $avg: '$price' },
          averageDuration: { $avg: '$duration' }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    return categories.map(cat => ({
      category: cat._id,
      internshipCount: cat.count,
      averagePrice: Math.round(cat.averagePrice),
      averageDuration: Math.round(cat.averageDuration)
    }));
  }

  // Get internship statistics
  async getInternshipStats(internshipId) {
    const db = getDB();

    const stats = await db.collection('enrollments').aggregate([
      { $match: { internshipId: new ObjectId(internshipId) } },
      {
        $group: {
          _id: null,
          totalEnrollments: { $sum: 1 },
          activeEnrollments: {
            $sum: { $cond: [{ $eq: ['$status', 'ACTIVE'] }, 1, 0] }
          },
          completedEnrollments: {
            $sum: { $cond: [{ $eq: ['$status', 'COMPLETED'] }, 1, 0] }
          },
          paidEnrollments: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'COMPLETED'] }, 1, 0] }
          },
          totalRevenue: {
            $sum: { $cond: [{ $eq: ['$paymentStatus', 'COMPLETED'] }, '$paymentAmount', 0] }
          },
          averageProgress: { $avg: '$progressPercentage' }
        }
      }
    ]).toArray();

    const taskStats = await db.collection('taskSubmissions').aggregate([
      {
        $lookup: {
          from: 'enrollments',
          localField: 'enrollmentId',
          foreignField: '_id',
          as: 'enrollment'
        }
      },
      { $unwind: '$enrollment' },
      { $match: { 'enrollment.internshipId': new ObjectId(internshipId) } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    return {
      overview: stats[0] || {
        totalEnrollments: 0,
        activeEnrollments: 0,
        completedEnrollments: 0,
        paidEnrollments: 0,
        totalRevenue: 0,
        averageProgress: 0
      },
      taskSubmissions: taskStats.reduce((acc, stat) => {
        acc[stat._id.toLowerCase()] = stat.count;
        return acc;
      }, { pending: 0, approved: 0, rejected: 0, needs_revision: 0 })
    };
  }

  // Search internships
  async searchInternships(query, filters = {}) {
    const db = getDB();

    const searchFilter = {
      isActive: true,
      $or: [
        { title: { $regex: query, $options: 'i' } },
        { description: { $regex: query, $options: 'i' } },
        { category: { $regex: query, $options: 'i' } },
        { requirements: { $elemMatch: { $regex: query, $options: 'i' } } },
        { outcomes: { $elemMatch: { $regex: query, $options: 'i' } } }
      ]
    };

    // Apply additional filters
    if (filters.category) searchFilter.category = filters.category;
    if (filters.difficulty) searchFilter.difficulty = filters.difficulty;
    if (filters.priceMax) searchFilter.price = { $lte: parseFloat(filters.priceMax) };

    const internships = await db.collection('internships').aggregate([
      { $match: searchFilter },
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
          enrolledCount: { $size: '$enrollments' },
          spotsLeft: { $subtract: ['$maxStudents', { $size: '$enrollments' }] },
          score: { $meta: 'textScore' } // For text search scoring
        }
      },
      { $project: { enrollments: 0 } },
      { $sort: { score: { $meta: 'textScore' }, createdAt: -1 } },
      { $limit: 20 }
    ]).toArray();

    return internships.map(internship => ({
      ...internship,
      id: internship._id.toString()
    }));
  }

  // Get popular internships
  async getPopularInternships(limit = 6) {
    const db = getDB();

    const popular = await db.collection('internships').aggregate([
      { $match: { isActive: true } },
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
          enrolledCount: { $size: '$enrollments' },
          popularityScore: {
            $add: [
              { $size: '$enrollments' },
              { $divide: [{ $subtract: [new Date(), '$createdAt'] }, 86400000] } // Days since creation
            ]
          }
        }
      },
      { $project: { enrollments: 0 } },
      { $sort: { popularityScore: -1 } },
      { $limit: limit }
    ]).toArray();

    return popular.map(internship => ({
      ...internship,
      id: internship._id.toString()
    }));
  }

  // Get recommended internships for student
  async getRecommendedInternships(studentId, limit = 5) {
    const db = getDB();

    // Get student's completed/enrolled categories
    const studentCategories = await db.collection('enrollments').aggregate([
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
        $group: {
          _id: '$internship.category',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]).toArray();

    const preferredCategories = studentCategories.map(cat => cat._id);

    // Get recommendations based on preferences and popularity
    const recommendations = await db.collection('internships').aggregate([
      {
        $match: {
          isActive: true,
          _id: {
            $nin: await db.collection('enrollments')
              .find({ studentId: new ObjectId(studentId) })
              .toArray()
              .then(enrollments => enrollments.map(e => e.internshipId))
          }
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
          enrolledCount: { $size: '$enrollments' },
          categoryMatch: {
            $cond: [
              { $in: ['$category', preferredCategories] },
              2,
              1
            ]
          },
          recommendationScore: {
            $multiply: [
              { $size: '$enrollments' },
              {
                $cond: [
                  { $in: ['$category', preferredCategories] },
                  2,
                  1
                ]
              }
            ]
          }
        }
      },
      { $project: { enrollments: 0 } },
      { $sort: { recommendationScore: -1, createdAt: -1 } },
      { $limit: limit }
    ]).toArray();

    return recommendations.map(internship => ({
      ...internship,
      id: internship._id.toString()
    }));
  }

  // Update enrollment status
  async updateEnrollmentStatus(enrollmentId, status, completedAt = null) {
    const db = getDB();

    const updateData = {
      status,
      updatedAt: new Date()
    };

    if (completedAt) {
      updateData.completedAt = completedAt;
    }

    const result = await db.collection('enrollments').findOneAndUpdate(
      { _id: new ObjectId(enrollmentId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      throw new Error('Enrollment not found');
    }

    return {
      ...result.value,
      id: result.value._id.toString()
    };
  }
}

module.exports = new InternshipService();