const joi = require('joi');

// User validation schemas
const registerSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().min(6).required(),
  firstName: joi.string().min(2).max(50).required(),
  lastName: joi.string().min(2).max(50).required(),
  phone: joi.string().pattern(/^[0-9]{10}$/).optional()
});

const loginSchema = joi.object({
  email: joi.string().email().required(),
  password: joi.string().required()
});

// Internship validation schemas
const internshipSchema = joi.object({
  title: joi.string().min(3).max(200).required(),
  description: joi.string().min(10).max(2000).required(),
  duration: joi.number().integer().min(1).max(52).default(12),
  price: joi.number().positive().required(),
  maxStudents: joi.number().integer().min(1).max(1000).default(50),
  totalTasks: joi.number().integer().min(1).max(50).default(10),
  category: joi.string().min(2).max(100).required(),
  difficulty: joi.string().valid('BEGINNER', 'INTERMEDIATE', 'ADVANCED').default('BEGINNER'),
  requirements: joi.array().items(joi.string()).default([]),
  outcomes: joi.array().items(joi.string()).default([])
});

// Task validation schemas
const taskSchema = joi.object({
  internshipId: joi.string().required(),
  title: joi.string().min(3).max(200).required(),
  description: joi.string().min(10).max(2000).required(),
  taskOrder: joi.number().integer().min(1).required(),
  estimatedHours: joi.number().integer().min(1).max(100).default(8),
  resources: joi.object().optional(),
  guidelines: joi.string().optional(),
  isMandatory: joi.boolean().default(true)
});

// Task submission validation schemas
const taskSubmissionSchema = joi.object({
  enrollmentId: joi.string().required(),
  submissionText: joi.string().max(5000).optional(),
  fileUrls: joi.array().items(joi.string().uri()).default([])
});

// Task review validation schemas
const taskReviewSchema = joi.object({
  status: joi.string().valid('APPROVED', 'REJECTED', 'NEEDS_REVISION').required(),
  feedback: joi.string().max(1000).optional(),
  grade: joi.number().min(0).max(10).optional()
});

// Payment validation schemas
const paymentOrderSchema = joi.object({
  enrollmentId: joi.string().required()
});

const paymentVerificationSchema = joi.object({
  razorpay_order_id: joi.string().required(),
  razorpay_payment_id: joi.string().required(),
  razorpay_signature: joi.string().required(),
  enrollmentId: joi.string().required()
});

// Validation middleware
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.details.map(detail => detail.message)
      });
    }
    next();
  };
};

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  internshipSchema,
  taskSchema,
  taskSubmissionSchema,
  taskReviewSchema,
  paymentOrderSchema,
  paymentVerificationSchema
};