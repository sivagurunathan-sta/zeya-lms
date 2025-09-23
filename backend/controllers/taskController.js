const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const { sendEmail } = require('../utils/email');
const logger = require('../utils/logger');

// Get tasks for an enrollment
const getTasksForEnrollment = async (req, res, next) => {
  try {
    const { enrollmentId } = req.params;
    const db = getDB();

    // Verify enrollment belongs to user
    const enrollment = await db.collection('enrollments').aggregate([
      { $match: { _id: new ObjectId(enrollmentId) } },
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
      }
    ]).toArray();

    if (!enrollment.length) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }

    const enrollmentData = enrollment[0];

    if (enrollmentData.studentId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    // Check if payment is completed for task access
    const paymentCompleted = enrollmentData.paymentStatus === 'COMPLETED';

    // Get submissions map
    const submissionsMap = new Map();
    enrollmentData.taskSubmissions.forEach(sub => {
      submissionsMap.set(sub.taskId.toString(), sub);
    });

    // Determine which tasks are unlocked
    const tasksWithStatus = enrollmentData.internship.tasks.map((task, index) => {
      const submission = submissionsMap.get(task._id.toString());
      const isCompleted = submission?.status === 'APPROVED';
      
      // First task is always unlocked if payment is completed
      // Subsequent tasks unlock when previous task is completed
      let isUnlocked = false;
      if (paymentCompleted) {
        if (index === 0) {
          isUnlocked = true;
        } else {
          const prevTask = enrollmentData.internship.tasks[index - 1];
          const prevSubmission = submissionsMap.get(prevTask._id.toString());
          isUnlocked = prevSubmission?.status === 'APPROVED';
        }
      }

      return {
        ...task,
        id: task._id.toString(),
        isUnlocked,
        isCompleted,
        submission: submission || null,
        canSubmit: isUnlocked && !isCompleted && paymentCompleted
      };
    });

    res.json({
      success: true,
      data: {
        enrollment: {
          id: enrollmentData._id.toString(),
          paymentStatus: enrollmentData.paymentStatus,
          progressPercentage: enrollmentData.progressPercentage
        },
        tasks: tasksWithStatus
      }
    });
  } catch (error) {
    next(error);
  }
};

// Submit task
const submitTask = async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { enrollmentId, submissionText, fileUrls } = req.body;
    const db = getDB();

    // Verify enrollment and task
    const enrollment = await db.collection('enrollments').aggregate([
      { $match: { _id: new ObjectId(enrollmentId) } },
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
      }
    ]).toArray();

    if (!enrollment.length || enrollment[0].studentId.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Unauthorized'
      });
    }

    const enrollmentData = enrollment[0];

    if (enrollmentData.paymentStatus !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Payment required to submit tasks'
      });
    }

    const task = enrollmentData.tasks.find(t => t._id.toString() === taskId);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    // Check if task is unlocked
    const taskIndex = enrollmentData.tasks.findIndex(t => t._id.toString() === taskId);
    if (taskIndex > 0) {
      const prevTask = enrollmentData.tasks[taskIndex - 1];
      const prevSubmission = await db.collection('taskSubmissions').findOne({
        enrollmentId: new ObjectId(enrollmentId),
        taskId: prevTask._id
      });

      if (!prevSubmission || prevSubmission.status !== 'APPROVED') {
        return res.status(400).json({
          success: false,
          message: 'Previous task must be completed first'
        });
      }
    }

    // Check if already submitted
    const existingSubmission = await db.collection('taskSubmissions').findOne({
      enrollmentId: new ObjectId(enrollmentId),
      taskId: new ObjectId(taskId)
    });

    if (existingSubmission) {
      return res.status(400).json({
        success: false,
        message: 'Task already submitted'
      });
    }

    // Create submission
    const submissionDoc = {
      enrollmentId: new ObjectId(enrollmentId),
      taskId: new ObjectId(taskId),
      submissionText: submissionText || '',
      fileUrls: fileUrls || [],
      status: 'PENDING',
      feedback: null,
      grade: null,
      submittedAt: new Date(),
      reviewedAt: null,
      reviewedById: null
    };

    const result = await db.collection('taskSubmissions').insertOne(submissionDoc);

    // Send notification to admin
    const io = req.app.get('io');
    if (io) {
      const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
      io.emit('new-submission', {
        submissionId: result.insertedId.toString(),
        studentName: `${user.firstName} ${user.lastName}`,
        taskTitle: task.title,
        internshipTitle: enrollmentData.internship.title
      });
    }

    res.status(201).json({
      success: true,
      message: 'Task submitted successfully',
      data: {
        ...submissionDoc,
        id: result.insertedId.toString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Review task submission (Admin only)
const reviewSubmission = async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { status, feedback, grade } = req.body;
    const db = getDB();

    const updateData = {
      status,
      feedback,
      grade: grade ? parseFloat(grade) : null,
      reviewedAt: new Date(),
      reviewedById: new ObjectId(req.user.id)
    };

    const result = await db.collection('taskSubmissions').findOneAndUpdate(
      { _id: new ObjectId(submissionId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    const submission = result.value;

    // Update enrollment progress if task approved
    if (status === 'APPROVED') {
      const approvedSubmissions = await db.collection('taskSubmissions').countDocuments({
        enrollmentId: submission.enrollmentId,
        status: 'APPROVED'
      });

      const enrollment = await db.collection('enrollments').findOne({
        _id: submission.enrollmentId
      });

      const internship = await db.collection('internships').findOne({
        _id: enrollment.internshipId
      });

      const totalTasks = internship.totalTasks;
      const progressPercentage = (approvedSubmissions / totalTasks) * 100;

      const enrollmentUpdate = {
        progressPercentage,
        updatedAt: new Date()
      };

      if (progressPercentage === 100) {
        enrollmentUpdate.status = 'COMPLETED';
        enrollmentUpdate.completedAt = new Date();
      }

      await db.collection('enrollments').updateOne(
        { _id: submission.enrollmentId },
        { $set: enrollmentUpdate }
      );
    }

    // Get additional data for notifications
    const submissionData = await db.collection('taskSubmissions').aggregate([
      { $match: { _id: new ObjectId(submissionId) } },
      {
        $lookup: {
          from: 'tasks',
          localField: 'taskId',
          foreignField: '_id',
          as: 'task'
        }
      },
      { $unwind: '$task' },
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
          as: 'student'
        }
      },
      { $unwind: '$student' }
    ]).toArray();

    const data = submissionData[0];

    // Send notification to student
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${data.student._id.toString()}`).emit('task-reviewed', {
        taskTitle: data.task.title,
        status,
        feedback
      });
    }

    // Send email notification
    try {
      await sendEmail(
        data.student.email,
        `Task ${status.toLowerCase()} - ${data.task.title}`,
        `Dear ${data.student.firstName},

Your submission for "${data.task.title}" has been ${status.toLowerCase()}.

${feedback ? `Feedback: ${feedback}` : ''}
${grade ? `Grade: ${grade}/10` : ''}

${status === 'APPROVED' ? 'Congratulations! You can now proceed to the next task.' : 
  status === 'NEEDS_REVISION' ? 'Please review the feedback and resubmit.' : 
  'Please review the feedback and try again.'}

Best regards,
Student LMS Team`
      );
    } catch (emailError) {
      logger.error('Failed to send review notification email:', emailError);
    }

    res.json({
      success: true,
      message: 'Task reviewed successfully',
      data: {
        ...submission,
        id: submission._id.toString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Get pending submissions (Admin only)
const getPendingSubmissions = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const db = getDB();
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const submissions = await db.collection('taskSubmissions').aggregate([
      { $match: { status: 'PENDING' } },
      {
        $lookup: {
          from: 'tasks',
          localField: 'taskId',
          foreignField: '_id',
          as: 'task'
        }
      },
      { $unwind: '$task' },
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
          pipeline: [
            { $project: { firstName: 1, lastName: 1, email: 1 } }
          ]
        }
      },
      { $unwind: '$student' },
      {
        $lookup: {
          from: 'internships',
          localField: 'enrollment.internshipId',
          foreignField: '_id',
          as: 'internship',
          pipeline: [
            { $project: { title: 1 } }
          ]
        }
      },
      { $unwind: '$internship' },
      { $sort: { submittedAt: 1 } },
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    const total = await db.collection('taskSubmissions').countDocuments({
      status: 'PENDING'
    });

    res.json({
      success: true,
      data: {
        submissions: submissions.map(submission => ({
          ...submission,
          id: submission._id.toString()
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

module.exports = {
  getTasksForEnrollment,
  submitTask,
  reviewSubmission,
  getPendingSubmissions
};