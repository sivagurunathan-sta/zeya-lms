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
        submission: submission ? { ...submission, id: submission._id.toString() } : null,
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

    // Check if already submitted and pending/approved
    const existingSubmission = await db.collection('taskSubmissions').findOne({
      enrollmentId: new ObjectId(enrollmentId),
      taskId: new ObjectId(taskId)
    });

    if (existingSubmission && existingSubmission.status !== 'REJECTED') {
      return res.status(400).json({
        success: false,
        message: existingSubmission.status === 'APPROVED' ? 'Task already completed' : 'Task already submitted and pending review'
      });
    }

    // Create or update submission
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

    let result;
    if (existingSubmission) {
      // Update existing rejected submission
      result = await db.collection('taskSubmissions').updateOne(
        { _id: existingSubmission._id },
        { $set: submissionDoc }
      );
      submissionDoc._id = existingSubmission._id;
    } else {
      // Create new submission
      result = await db.collection('taskSubmissions').insertOne(submissionDoc);
      submissionDoc._id = result.insertedId;
    }

    // Send notification to admin
    const io = req.app.get('io');
    if (io) {
      const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) });
      io.emit('new-submission', {
        submissionId: submissionDoc._id.toString(),
        studentName: `${user.firstName} ${user.lastName}`,
        taskTitle: task.title,
        internshipTitle: enrollmentData.internship.title
      });
    }

    res.status(201).json({
      success: true,
      message: existingSubmission ? 'Task resubmitted successfully' : 'Task submitted successfully',
      data: {
        ...submissionDoc,
        id: submissionDoc._id.toString()
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
      const progressPercentage = Math.round((approvedSubmissions / totalTasks) * 100);

      const enrollmentUpdate = {
        progressPercentage,
        updatedAt: new Date()
      };

      if (progressPercentage >= 75) { // 75% completion required
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
    const { page = 1, limit = 10, taskId } = req.query;
    const db = getDB();
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const matchFilter = { status: 'PENDING' };
    if (taskId) {
      matchFilter.taskId = new ObjectId(taskId);
    }

    const submissions = await db.collection('taskSubmissions').aggregate([
      { $match: matchFilter },
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
      { $sort: { submittedAt: 1 } }, // Oldest first for review queue
      { $skip: skip },
      { $limit: parseInt(limit) }
    ]).toArray();

    const total = await db.collection('taskSubmissions').countDocuments(matchFilter);

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

// Create task (Admin only)
const createTask = async (req, res, next) => {
  try {
    const {
      internshipId,
      title,
      description,
      taskOrder,
      estimatedHours,
      resources,
      guidelines,
      isMandatory
    } = req.body;

    const db = getDB();

    // Verify internship exists
    const internship = await db.collection('internships').findOne({
      _id: new ObjectId(internshipId)
    });

    if (!internship) {
      return res.status(404).json({
        success: false,
        message: 'Internship not found'
      });
    }

    // Check if task order already exists
    const existingTask = await db.collection('tasks').findOne({
      internshipId: new ObjectId(internshipId),
      taskOrder
    });

    if (existingTask) {
      return res.status(400).json({
        success: false,
        message: `Task with order ${taskOrder} already exists`
      });
    }

    const taskDoc = {
      internshipId: new ObjectId(internshipId),
      title,
      description,
      taskOrder,
      estimatedHours: estimatedHours || 8,
      resources: resources || {},
      guidelines: guidelines || '',
      isMandatory: isMandatory !== false,
      createdById: new ObjectId(req.user.id),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await db.collection('tasks').insertOne(taskDoc);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: {
        ...taskDoc,
        id: result.insertedId.toString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Update task (Admin only)
const updateTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = {
      ...req.body,
      updatedAt: new Date()
    };

    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });

    const db = getDB();
    
    const result = await db.collection('tasks').findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!result.value) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task updated successfully',
      data: {
        ...result.value,
        id: result.value._id.toString()
      }
    });
  } catch (error) {
    next(error);
  }
};

// Delete task (Admin only)
const deleteTask = async (req, res, next) => {
  try {
    const { id } = req.params;
    const db = getDB();

    // Check if there are submissions for this task
    const submissionCount = await db.collection('taskSubmissions').countDocuments({
      taskId: new ObjectId(id)
    });

    if (submissionCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete task with existing submissions'
      });
    }

    const result = await db.collection('tasks').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Task not found'
      });
    }

    res.json({
      success: true,
      message: 'Task deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTasksForEnrollment,
  submitTask,
  reviewSubmission,
  getPendingSubmissions,
  createTask,
  updateTask,
  deleteTask
};