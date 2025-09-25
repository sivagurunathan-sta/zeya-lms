const bcrypt = require('bcryptjs');
const { connectDB, getDB } = require('../config/database');
const logger = require('../utils/logger');

const seedUsers = async (db) => {
  const hashedPassword = await bcrypt.hash('admin123', 12);
  
  const users = [
    {
      email: 'admin@studentlms.com',
      passwordHash: hashedPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      email: 'john.doe@example.com',
      passwordHash: await bcrypt.hash('student123', 12),
      firstName: 'John',
      lastName: 'Doe',
      phone: '9876543210',
      role: 'STUDENT',
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      email: 'jane.smith@example.com',
      passwordHash: await bcrypt.hash('student123', 12),
      firstName: 'Jane',
      lastName: 'Smith',
      phone: '9876543211',
      role: 'STUDENT',
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const result = await db.collection('users').insertMany(users);
  logger.info(`Seeded ${result.insertedCount} users`);
  return result;
};

const seedInternships = async (db) => {
  const admin = await db.collection('users').findOne({ role: 'ADMIN' });
  
  const internships = [
    {
      title: 'Full Stack Web Development',
      description: 'Learn modern web development with React, Node.js, and MongoDB. Build real-world projects and deploy them to production.',
      duration: 12,
      price: 4999,
      maxStudents: 50,
      totalTasks: 35,
      category: 'Web Development',
      difficulty: 'INTERMEDIATE',
      requirements: ['Basic HTML/CSS knowledge', 'JavaScript fundamentals'],
      outcomes: ['Build full-stack applications', 'Deploy to cloud platforms', 'Work with databases'],
      isActive: true,
      thumbnail: null,
      createdById: admin._id,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Mobile App Development with React Native',
      description: 'Create cross-platform mobile applications using React Native. Learn navigation, state management, and native features.',
      duration: 10,
      price: 3999,
      maxStudents: 30,
      totalTasks: 25,
      category: 'Mobile Development',
      difficulty: 'INTERMEDIATE',
      requirements: ['React knowledge', 'JavaScript ES6+'],
      outcomes: ['Build mobile apps', 'Publish to app stores', 'Integrate APIs'],
      isActive: true,
      thumbnail: null,
      createdById: admin._id,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      title: 'Data Science with Python',
      description: 'Master data analysis, visualization, and machine learning using Python, pandas, and scikit-learn.',
      duration: 16,
      price: 5999,
      maxStudents: 40,
      totalTasks: 30,
      category: 'Data Science',
      difficulty: 'ADVANCED',
      requirements: ['Python basics', 'Statistics knowledge', 'Mathematics background'],
      outcomes: ['Data analysis skills', 'Machine learning models', 'Data visualization'],
      isActive: true,
      thumbnail: null,
      createdById: admin._id,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  const result = await db.collection('internships').insertMany(internships);
  logger.info(`Seeded ${result.insertedCount} internships`);
  return result;
};

const seedTasks = async (db) => {
  const internships = await db.collection('internships').find({}).toArray();
  
  const tasks = [];
  
  for (const internship of internships) {
    if (internship.title === 'Full Stack Web Development') {
      const webDevTasks = [
        {
          internshipId: internship._id,
          title: 'Setup Development Environment',
          description: 'Install Node.js, VS Code, and Git. Create your first repository and set up a basic project structure.',
          taskOrder: 1,
          estimatedHours: 4,
          resources: {
            videos: ['https://youtube.com/setup-nodejs'],
            articles: ['https://nodejs.org/getting-started'],
            tools: ['Node.js', 'VS Code', 'Git']
          },
          guidelines: 'Follow best practices for folder structure and naming conventions.',
          isMandatory: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          internshipId: internship._id,
          title: 'HTML & CSS Fundamentals',
          description: 'Create a responsive webpage using semantic HTML and modern CSS techniques including Flexbox and Grid.',
          taskOrder: 2,
          estimatedHours: 8,
          resources: {
            videos: ['https://youtube.com/html-css-basics'],
            articles: ['https://developer.mozilla.org/html'],
            tools: ['HTML5', 'CSS3', 'Flexbox', 'Grid']
          },
          guidelines: 'Ensure your webpage is mobile-first and accessible.',
          isMandatory: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          internshipId: internship._id,
          title: 'JavaScript ES6+ Features',
          description: 'Learn and implement modern JavaScript features like arrow functions, destructuring, modules, and async/await.',
          taskOrder: 3,
          estimatedHours: 12,
          resources: {
            videos: ['https://youtube.com/javascript-es6'],
            articles: ['https://javascript.info/modern-features'],
            tools: ['JavaScript ES6+', 'Babel', 'Webpack']
          },
          guidelines: 'Write clean, readable code with proper error handling.',
          isMandatory: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      tasks.push(...webDevTasks);
    }
    
    if (internship.title === 'Mobile App Development with React Native') {
      const mobileTasks = [
        {
          internshipId: internship._id,
          title: 'React Native Setup',
          description: 'Install React Native CLI, set up Android/iOS development environment, and create your first app.',
          taskOrder: 1,
          estimatedHours: 6,
          resources: {
            videos: ['https://youtube.com/react-native-setup'],
            articles: ['https://reactnative.dev/getting-started'],
            tools: ['React Native CLI', 'Android Studio', 'Xcode']
          },
          guidelines: 'Test your setup on both Android and iOS simulators.',
          isMandatory: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          internshipId: internship._id,
          title: 'Navigation and Routing',
          description: 'Implement stack and tab navigation using React Navigation. Create multiple screens with proper navigation flow.',
          taskOrder: 2,
          estimatedHours: 8,
          resources: {
            videos: ['https://youtube.com/react-navigation'],
            articles: ['https://reactnavigation.org/docs'],
            tools: ['React Navigation', 'Stack Navigator', 'Tab Navigator']
          },
          guidelines: 'Follow navigation best practices and maintain consistent UX.',
          isMandatory: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      tasks.push(...mobileTasks);
    }
    
    if (internship.title === 'Data Science with Python') {
      const dataTasks = [
        {
          internshipId: internship._id,
          title: 'Python Data Science Environment',
          description: 'Set up Jupyter Notebook, install pandas, numpy, matplotlib, and scikit-learn. Create your first data analysis notebook.',
          taskOrder: 1,
          estimatedHours: 4,
          resources: {
            videos: ['https://youtube.com/jupyter-setup'],
            articles: ['https://jupyter.org/getting-started'],
            tools: ['Jupyter Notebook', 'Pandas', 'NumPy', 'Matplotlib']
          },
          guidelines: 'Organize your notebooks with clear documentation and comments.',
          isMandatory: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          internshipId: internship._id,
          title: 'Data Cleaning and Preprocessing',
          description: 'Learn to clean messy datasets, handle missing values, and prepare data for analysis using pandas.',
          taskOrder: 2,
          estimatedHours: 10,
          resources: {
            videos: ['https://youtube.com/data-cleaning'],
            articles: ['https://pandas.pydata.org/docs'],
            tools: ['Pandas', 'NumPy', 'Data Cleaning']
          },
          guidelines: 'Document your data cleaning process and explain your decisions.',
          isMandatory: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      tasks.push(...dataTasks);
    }
  }

  const result = await db.collection('tasks').insertMany(tasks);
  logger.info(`Seeded ${result.insertedCount} tasks`);
  return result;
};

const seedEnrollments = async (db) => {
  const students = await db.collection('users').find({ role: 'STUDENT' }).toArray();
  const internships = await db.collection('internships').find({}).toArray();
  
  const enrollments = [
    {
      studentId: students[0]._id,
      internshipId: internships[0]._id,
      status: 'ACTIVE',
      progressPercentage: 25,
      paymentStatus: 'COMPLETED',
      paymentAmount: internships[0].price,
      paymentId: 'pay_mock123',
      certificateIssued: false,
      enrolledAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      completedAt: null
    },
    {
      studentId: students[1]._id,
      internshipId: internships[1]._id,
      status: 'ACTIVE',
      progressPercentage: 60,
      paymentStatus: 'COMPLETED',
      paymentAmount: internships[1].price,
      paymentId: 'pay_mock124',
      certificateIssued: false,
      enrolledAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000), // 20 days ago
      completedAt: null
    }
  ];

  const result = await db.collection('enrollments').insertMany(enrollments);
  logger.info(`Seeded ${result.insertedCount} enrollments`);
  return result;
};

const seedTaskSubmissions = async (db) => {
  const enrollments = await db.collection('enrollments').find({}).toArray();
  const tasks = await db.collection('tasks').find({}).toArray();
  
  const submissions = [];
  
  for (const enrollment of enrollments) {
    const enrollmentTasks = tasks.filter(task => 
      task.internshipId.toString() === enrollment.internshipId.toString()
    );
    
    // Create submissions for first few tasks
    const tasksToSubmit = enrollmentTasks.slice(0, Math.min(3, enrollmentTasks.length));
    
    for (const task of tasksToSubmit) {
      submissions.push({
        enrollmentId: enrollment._id,
        taskId: task._id,
        submissionText: `This is my submission for ${task.title}. I have completed all the requirements and implemented the solution according to the guidelines.`,
        fileUrls: [`https://github.com/student/task-${task.taskOrder}`],
        status: 'APPROVED',
        feedback: 'Good work! Your implementation meets all requirements.',
        grade: 8.5,
        submittedAt: new Date(Date.now() - (10 - task.taskOrder) * 24 * 60 * 60 * 1000),
        reviewedAt: new Date(Date.now() - (9 - task.taskOrder) * 24 * 60 * 60 * 1000),
        reviewedById: await db.collection('users').findOne({ role: 'ADMIN' })._id
      });
    }
  }

  const result = await db.collection('taskSubmissions').insertMany(submissions);
  logger.info(`Seeded ${result.insertedCount} task submissions`);
  return result;
};

const seedPayments = async (db) => {
  const enrollments = await db.collection('enrollments').find({ paymentStatus: 'COMPLETED' }).toArray();
  
  const payments = enrollments.map((enrollment, index) => ({
    enrollmentId: enrollment._id,
    amount: enrollment.paymentAmount,
    currency: 'INR',
    paymentMethod: 'razorpay',
    razorpayOrderId: `order_mock${123 + index}`,
    razorpayPaymentId: enrollment.paymentId,
    status: 'COMPLETED',
    paidAt: enrollment.enrolledAt,
    createdAt: enrollment.enrolledAt
  }));

  const result = await db.collection('payments').insertMany(payments);
  logger.info(`Seeded ${result.insertedCount} payments`);
  return result;
};

const seedNotifications = async (db) => {
  const students = await db.collection('users').find({ role: 'STUDENT' }).toArray();
  
  const notifications = [];
  
  for (const student of students) {
    notifications.push(
      {
        userId: student._id,
        title: 'Welcome to Student LMS!',
        message: 'Thank you for joining our platform. Start your learning journey today!',
        type: 'WELCOME',
        isRead: true,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      },
      {
        userId: student._id,
        title: 'Payment Successful',
        message: 'Your payment has been processed successfully. You can now access course materials.',
        type: 'PAYMENT',
        isRead: true,
        createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000)
      },
      {
        userId: student._id,
        title: 'Task Approved',
        message: 'Your submission has been approved. Great work! Continue to the next task.',
        type: 'TASK_REVIEW',
        isRead: false,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      }
    );
  }

  const result = await db.collection('notifications').insertMany(notifications);
  logger.info(`Seeded ${result.insertedCount} notifications`);
  return result;
};

const main = async () => {
  try {
    logger.info('Starting database seeding...');
    
    await connectDB();
    const db = getDB();
    
    // Clear existing data
    const collections = ['users', 'internships', 'tasks', 'enrollments', 'taskSubmissions', 'payments', 'notifications', 'certificates'];
    for (const collection of collections) {
      await db.collection(collection).deleteMany({});
      logger.info(`Cleared ${collection} collection`);
    }
    
    // Seed data in order
    await seedUsers(db);
    await seedInternships(db);
    await seedTasks(db);
    await seedEnrollments(db);
    await seedTaskSubmissions(db);
    await seedPayments(db);
    await seedNotifications(db);
    
    logger.info('Database seeding completed successfully!');
    process.exit(0);
    
  } catch (error) {
    logger.error('Database seeding failed:', error);
    process.exit(1);
  }
};

if (require.main === module) {
  main();
}

module.exports = {
  seedUsers,
  seedInternships,
  seedTasks,
  seedEnrollments,
  seedTaskSubmissions,
  seedPayments,
  seedNotifications
};