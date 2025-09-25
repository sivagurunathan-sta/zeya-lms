const express = require('express');
const User = require('../models/User');
const Course = require('../models/Course');
const Submission = require('../models/Submission');
const Announcement = require('../models/Announcement');
const Progress = require('../models/Progress');
const { auth, adminOnly } = require('../middleware/auth');
const { 
  validateUser, 
  validateCourse, 
  validateAnnouncement, 
  validateObjectId, 
  validatePagination,
  handleValidation 
} = require('../middleware/validation');
const upload = require('../config/multer');
const router = express.Router();

// Apply admin middleware to all routes
router.use(auth, adminOnly);

// =====================
// USER MANAGEMENT ROUTES
// =====================

// @route   GET /api/admin/users
// @desc    Get all users with pagination and filtering
// @access  Private (Admin)
router.get('/users', validatePagination, handleValidation, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      order = 'desc',
      role,
      status,
      search 
    } = req.query;

    const query = {};
    
    // Add filters
    if (role) query.role = role;
    if (status) query.status = status;
    
    if (search) {
      query.$or = [
        { userId: { $regex: search, $options: 'i' } },
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { 'profile.email': { $regex: search, $options: 'i' } }
      ];
    }

    const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
    
    const users = await User.find(query)
      .select('-password')
      .populate('enrolledCourses.course', 'title')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/users
// @desc    Create new user
// @access  Private (Admin)
router.post('/users', validateUser, handleValidation, async (req, res) => {
  try {
    const userData = req.body;
    
    // Check if userId or email already exists
    const existingUser = await User.findOne({
      $or: [
        { userId: userData.userId },
        { 'profile.email': userData.profile.email }
      ]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User ID or email already exists'
      });
    }

    const user = new User(userData);
    await user.save();

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: userResponse }
    });

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   GET /api/admin/users/:id
// @desc    Get user by ID
// @access  Private (Admin)
router.get('/users/:id', validateObjectId('id'), handleValidation, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('enrolledCourses.course', 'title description')
      .populate('submissions');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      data: { user }
    });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/users/:id
// @desc    Update user
// @access  Private (Admin)
router.put('/users/:id', validateObjectId('id'), handleValidation, async (req, res) => {
  try {
    const { password, ...updateData } = req.body;
    
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update user fields
    Object.keys(updateData).forEach(key => {
      if (key === 'profile') {
        user.profile = { ...user.profile, ...updateData.profile };
      } else {
        user[key] = updateData[key];
      }
    });

    // Update password if provided
    if (password) {
      user.password = password;
    }

    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: userResponse }
    });

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user
// @access  Private (Admin)
router.delete('/users/:id', validateObjectId('id'), handleValidation, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deleting self
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'User deleted successfully'
    });

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/users/:id/status
// @desc    Update user status (activate/deactivate/suspend)
// @access  Private (Admin)
router.put('/users/:id/status', validateObjectId('id'), handleValidation, async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['active', 'inactive', 'suspended'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be active, inactive, or suspended'
      });
    }

    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    user.status = status;
    await user.save();

    res.json({
      success: true,
      message: `User ${status} successfully`,
      data: { user: { id: user._id, status: user.status } }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// =====================
// COURSE MANAGEMENT ROUTES
// =====================

// @route   GET /api/admin/courses
// @desc    Get all courses with pagination
// @access  Private (Admin)
router.get('/courses', validatePagination, handleValidation, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      order = 'desc',
      category,
      level,
      isActive,
      search 
    } = req.query;

    const query = {};
    
    // Add filters
    if (category) query.category = category;
    if (level) query.level = level;
    if (isActive !== undefined) query.isActive = isActive === 'true';
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
{ description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
    
    const courses = await Course.find(query)
      .populate('instructor', 'profile.firstName profile.lastName')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalCourses = await Course.countDocuments(query);
    const totalPages = Math.ceil(totalCourses / limit);

    res.json({
      success: true,
      data: {
        courses,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalCourses,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/courses
// @desc    Create new course
// @access  Private (Admin)
router.post('/courses', 
  upload.array('courseFiles', 10), 
  validateCourse, 
  handleValidation, 
  async (req, res) => {
  try {
    const courseData = {
      ...req.body,
      instructor: req.user._id
    };

    // Process uploaded files
    if (req.files && req.files.length > 0) {
      const documents = req.files.map(file => ({
        title: file.originalname,
        url: `/uploads/courses/${file.filename}`,
        fileType: file.originalname.split('.').pop().toLowerCase(),
        size: file.size,
        uploadedAt: new Date()
      }));
      
      courseData.content = {
        ...courseData.content,
        documents: documents
      };
    }

    const course = new Course(courseData);
    await course.save();

    await course.populate('instructor', 'profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      data: { course }
    });

  } catch (error) {
    console.error('Create course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/courses/:id
// @desc    Update course
// @access  Private (Admin)
router.put('/courses/:id', validateObjectId('id'), handleValidation, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    Object.keys(req.body).forEach(key => {
      course[key] = req.body[key];
    });

    await course.save();
    await course.populate('instructor', 'profile.firstName profile.lastName');

    res.json({
      success: true,
      message: 'Course updated successfully',
      data: { course }
    });

  } catch (error) {
    console.error('Update course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/admin/courses/:id
// @desc    Delete course
// @access  Private (Admin)
router.delete('/courses/:id', validateObjectId('id'), handleValidation, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    await Course.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Course deleted successfully'
    });

  } catch (error) {
    console.error('Delete course error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/courses/:id/enroll
// @desc    Enroll student in course
// @access  Private (Admin)
router.post('/courses/:courseId/enroll/:studentId', 
  validateObjectId('courseId'),
  validateObjectId('studentId'), 
  handleValidation, 
  async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);
    const student = await User.findById(req.params.studentId);
    
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Enroll student in course
    await course.enrollStudent(req.params.studentId);
    
    // Add course to student's enrolled courses
    const enrollment = {
      course: req.params.courseId,
      enrolledAt: new Date(),
      progress: 0
    };
    
    student.enrolledCourses.push(enrollment);
    await student.save();

    // Create progress tracking
    const progress = new Progress({
      student: req.params.studentId,
      course: req.params.courseId
    });
    await progress.save();

    res.json({
      success: true,
      message: 'Student enrolled successfully'
    });

  } catch (error) {
    console.error('Enroll student error:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Server error'
    });
  }
});

// =====================
// SUBMISSION MANAGEMENT ROUTES
// =====================

// @route   GET /api/admin/submissions
// @desc    Get all submissions with filtering
// @access  Private (Admin)
router.get('/submissions', validatePagination, handleValidation, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'submittedAt', 
      order = 'desc',
      status,
      courseId,
      studentId 
    } = req.query;

    const query = {};
    
    // Add filters
    if (status) query.status = status;
    if (courseId) query.course = courseId;
    if (studentId) query.student = studentId;

    const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
    
    const submissions = await Submission.find(query)
      .populate('student', 'profile.firstName profile.lastName userId')
      .populate('course', 'title')
      .populate('feedback.reviewer', 'profile.firstName profile.lastName')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalSubmissions = await Submission.countDocuments(query);
    const totalPages = Math.ceil(totalSubmissions / limit);

    res.json({
      success: true,
      data: {
        submissions,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalSubmissions,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/submissions/:id/review
// @desc    Review and grade submission
// @access  Private (Admin)
router.put('/submissions/:id/review', validateObjectId('id'), handleValidation, async (req, res) => {
  try {
    const { status, score, comments, rubric } = req.body;
    
    const submission = await Submission.findById(req.params.id);
    
    if (!submission) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    // Update submission with feedback
    await submission.addFeedback(req.user._id, comments, score, rubric);
    await submission.updateStatus(status, req.user._id);

    await submission.populate([
      { path: 'student', select: 'profile.firstName profile.lastName userId' },
      { path: 'course', select: 'title' },
      { path: 'feedback.reviewer', select: 'profile.firstName profile.lastName' }
    ]);

    res.json({
      success: true,
      message: 'Submission reviewed successfully',
      data: { submission }
    });

  } catch (error) {
    console.error('Review submission error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// =====================
// ANNOUNCEMENT ROUTES
// =====================

// @route   GET /api/admin/announcements
// @desc    Get all announcements
// @access  Private (Admin)
router.get('/announcements', validatePagination, handleValidation, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      sortBy = 'createdAt', 
      order = 'desc',
      priority,
      category 
    } = req.query;

    const query = {};
    
    // Add filters
    if (priority) query.priority = priority;
    if (category) query.category = category;

    const sort = { [sortBy]: order === 'desc' ? -1 : 1 };
    
    const announcements = await Announcement.find(query)
      .populate('sender', 'profile.firstName profile.lastName')
      .populate('recipients.users', 'profile.firstName profile.lastName userId')
      .populate('recipients.courses', 'title')
      .sort(sort)
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const totalAnnouncements = await Announcement.countDocuments(query);
    const totalPages = Math.ceil(totalAnnouncements / limit);

    res.json({
      success: true,
      data: {
        announcements,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalAnnouncements,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   POST /api/admin/announcements
// @desc    Create new announcement
// @access  Private (Admin)
router.post('/announcements', 
  upload.array('attachments', 5),
  validateAnnouncement, 
  handleValidation, 
  async (req, res) => {
  try {
    const announcementData = {
      ...req.body,
      sender: req.user._id
    };

    // Process uploaded files
    if (req.files && req.files.length > 0) {
      const attachments = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        url: `/uploads/documents/${file.filename}`,
        fileType: file.originalname.split('.').pop().toLowerCase(),
        size: file.size
      }));
      
      announcementData.attachments = attachments;
    }

    const announcement = new Announcement(announcementData);
    await announcement.save();

    await announcement.populate('sender', 'profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: { announcement }
    });

  } catch (error) {
    console.error('Create announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/admin/announcements/:id
// @desc    Update announcement
// @access  Private (Admin)
router.put('/announcements/:id', validateObjectId('id'), handleValidation, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    Object.keys(req.body).forEach(key => {
      announcement[key] = req.body[key];
    });

    await announcement.save();

    res.json({
      success: true,
      message: 'Announcement updated successfully',
      data: { announcement }
    });

  } catch (error) {
    console.error('Update announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   DELETE /api/admin/announcements/:id
// @desc    Delete announcement
// @access  Private (Admin)
router.delete('/announcements/:id', validateObjectId('id'), handleValidation, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);
    
    if (!announcement) {
      return res.status(404).json({
        success: false,
        message: 'Announcement not found'
      });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Announcement deleted successfully'
    });

  } catch (error) {
    console.error('Delete announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// =====================
// ANALYTICS & REPORTS
// =====================

// @route   GET /api/admin/analytics/dashboard
// @desc    Get dashboard analytics
// @access  Private (Admin)
router.get('/analytics/dashboard', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalStudents = await User.countDocuments({ role: 'student' });
    const activeUsers = await User.countDocuments({ status: 'active' });
    const totalCourses = await Course.countDocuments();
    const activeCourses = await Course.countDocuments({ isActive: true });
    const totalSubmissions = await Submission.countDocuments();
    const pendingSubmissions = await Submission.countDocuments({ status: 'submitted' });

    // Recent activity
    const recentUsers = await User.find()
      .select('profile.firstName profile.lastName createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    const recentSubmissions = await Submission.find()
      .populate('student', 'profile.firstName profile.lastName')
      .populate('course', 'title')
      .sort({ submittedAt: -1 })
      .limit(5);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          totalStudents,
          activeUsers,
          totalCourses,
          activeCourses,
          totalSubmissions,
          pendingSubmissions
        },
        recentActivity: {
          recentUsers,
          recentSubmissions
        }
      }
    });

  } catch (error) {
    console.error('Dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

module.exports = router;