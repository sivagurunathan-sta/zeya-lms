const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const connectDB = require('../config/database');
const User = require('../models/User');
const Task = require('../models/Task');
const Submission = require('../models/Submission');
const Progress = require('../models/Progress');
const Announcement = require('../models/Announcement');
const { logger } = require('../utils/logger');

const seedUsers = async () => {
  logger.info('Seeding users...');
  
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const users = [
    // Admin user
    {
      userId: 'admin',
      password: hashedPassword,
      role: 'admin',
      profile: {
        firstName: 'Admin',
        lastName: 'User',
        email: 'admin@studentlms.com',
        phone: '9876543210'
      },
      status: 'active'
    },
    // Sample students
    {
      userId: 'john_doe',
      password: hashedPassword,
      role: 'student',
      profile: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '9876543211'
      },
      status: 'active',
      internshipProgress: {
        currentDay: 5,
        enrollmentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        overallScore: 85
      }
    },
    {
      userId: 'jane_smith',
      password: hashedPassword,
      role: 'student',
      profile: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '9876543212'
      },
      status: 'active',
      internshipProgress: {
        currentDay: 12,
        enrollmentDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago
        overallScore: 92
      }
    },
    {
      userId: 'alex_johnson',
      password: hashedPassword,
      role: 'student',
      profile: {
        firstName: 'Alex',
        lastName: 'Johnson',
        email: 'alex.johnson@example.com',
        phone: '9876543213'
      },
      status: 'active',
      internshipProgress: {
        currentDay: 35,
        enrollmentDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000), // 40 days ago
        completionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        overallScore: 78,
        certificateEligible: true,
        certificateIssued: true
      }
    }
  ];

  await User.deleteMany({});
  const createdUsers = await User.insertMany(users);
  logger.info(`Created ${createdUsers.length} users`);
  return createdUsers;
};

const seedTasks = async (adminUser) => {
  logger.info('Seeding tasks for 35-day program...');
  
  const tasks = [
    // Week 1: Foundation (Days 1-7)
    {
      taskNumber: 1,
      title: 'Development Environment Setup',
      description: 'Set up your complete development environment including Node.js, VS Code, Git, and essential extensions.',
      instructions: `
        1. Install Node.js (LTS version) from official website
        2. Install VS Code with recommended extensions
        3. Set up Git with proper configuration
        4. Create a GitHub account if you don't have one
        5. Install Postman for API testing
        6. Create a simple Hello World project and push to GitHub
      `,
      category: 'backend',
      difficulty: 'easy',
      estimatedTime: 3,
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresDocumentation: true
      },
      scoringCriteria: [
        { criterion: 'Environment Setup', weight: 40, description: 'All tools installed correctly' },
        { criterion: 'Git Configuration', weight: 30, description: 'Proper Git setup and first commit' },
        { criterion: 'Documentation', weight: 30, description: 'Clear README with setup instructions' }
      ],
      createdBy: adminUser._id
    },
    {
      taskNumber: 2,
      title: 'HTML5 & CSS3 Fundamentals',
      description: 'Create a responsive personal portfolio webpage using semantic HTML5 and modern CSS3 features.',
      instructions: `
        1. Create a semantic HTML structure for a personal portfolio
        2. Use CSS Grid and Flexbox for layout
        3. Implement responsive design for mobile, tablet, and desktop
        4. Add CSS animations and transitions
        5. Include proper meta tags and accessibility features
        6. Deploy to GitHub Pages
      `,
      category: 'frontend',
      difficulty: 'easy',
      estimatedTime: 6,
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresLiveDemo: true
      },
      scoringCriteria: [
        { criterion: 'HTML Structure', weight: 25, description: 'Semantic HTML and proper structure' },
        { criterion: 'CSS Styling', weight: 25, description: 'Modern CSS techniques and responsiveness' },
        { criterion: 'Responsiveness', weight: 25, description: 'Works well on all devices' },
        { criterion: 'Live Demo', weight: 25, description: 'Successfully deployed and accessible' }
      ],
      createdBy: adminUser._id
    },
    {
      taskNumber: 3,
      title: 'JavaScript ES6+ Fundamentals',
      description: 'Master modern JavaScript features including arrow functions, destructuring, modules, and async/await.',
      instructions: `
        1. Create examples of all ES6+ features
        2. Build interactive web components
        3. Implement proper error handling
        4. Use modules for code organization
        5. Create a small interactive application (calculator, todo, etc.)
        6. Include comprehensive comments explaining concepts
      `,
      category: 'frontend',
      difficulty: 'medium',
      estimatedTime: 8,
      prerequisites: [2],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresLiveDemo: true
      },
      createdBy: adminUser._id
    },
    {
      taskNumber: 4,
      title: 'Version Control with Git & GitHub',
      description: 'Master Git workflows, branching strategies, and collaborative development practices.',
      instructions: `
        1. Create a repository with proper branching strategy
        2. Demonstrate different types of merges
        3. Use Git hooks for automation
        4. Create meaningful commit messages following conventions
        5. Set up GitHub Actions for basic CI/CD
        6. Collaborate on a project (create issues, PRs, etc.)
      `,
      category: 'devops',
      difficulty: 'medium',
      estimatedTime: 5,
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresDocumentation: true
      },
      createdBy: adminUser._id
    },
    {
      taskNumber: 5,
      title: 'Responsive Web Design with Bootstrap',
      description: 'Create a fully responsive multi-page website using Bootstrap framework.',
      instructions: `
        1. Set up Bootstrap in your project
        2. Create a multi-page responsive website
        3. Use Bootstrap components effectively
        4. Customize Bootstrap themes
        5. Implement proper navigation and layout
        6. Optimize for performance
      `,
      category: 'frontend',
      difficulty: 'easy',
      estimatedTime: 6,
      prerequisites: [2, 3],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresLiveDemo: true
      },
      createdBy: adminUser._id
    },
    {
      taskNumber: 6,
      title: 'Introduction to Node.js',
      description: 'Build your first Node.js application with file system operations and basic server setup.',
      instructions: `
        1. Create a Node.js application from scratch
        2. Implement file system operations
        3. Build a basic HTTP server
        4. Handle different request methods
        5. Implement basic routing
        6. Add error handling and logging
      `,
      category: 'backend',
      difficulty: 'medium',
      estimatedTime: 7,
      prerequisites: [1, 3],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresDocumentation: true
      },
      createdBy: adminUser._id
    },
    {
      taskNumber: 7,
      title: 'Week 1 Project: Static Website Deployment',
      description: 'Deploy a complete static website with multiple pages, responsive design, and modern features.',
      instructions: `
        1. Combine all week's learning into one project
        2. Create a multi-page business/portfolio website
        3. Implement all responsive design principles
        4. Add interactive JavaScript features
        5. Deploy to multiple platforms (GitHub Pages, Netlify)
        6. Set up custom domain (optional)
      `,
      category: 'fullstack',
      difficulty: 'medium',
      estimatedTime: 10,
      prerequisites: [1, 2, 3, 4, 5],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresLiveDemo: true,
        requiresDocumentation: true
      },
      createdBy: adminUser._id
    },
    // Week 2: Backend Development (Days 8-14)
    {
      taskNumber: 8,
      title: 'Express.js Server Setup',
      description: 'Build a robust Express.js server with middleware, routing, and error handling.',
      instructions: `
        1. Set up Express.js with proper project structure
        2. Implement various middleware (cors, helmet, morgan)
        3. Create RESTful API endpoints
        4. Add input validation and sanitization
        5. Implement proper error handling
        6. Add API documentation
      `,
      category: 'backend',
      difficulty: 'medium',
      estimatedTime: 8,
      prerequisites: [6],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresDocumentation: true
      },
      createdBy: adminUser._id
    },
    {
      taskNumber: 9,
      title: 'MongoDB & Database Design',
      description: 'Design and implement a MongoDB database with proper schemas and relationships.',
      instructions: `
        1. Set up MongoDB Atlas or local MongoDB
        2. Design database schema for a blog/e-commerce system
        3. Implement CRUD operations with Mongoose
        4. Create data relationships and populate queries
        5. Add data validation and indexing
        6. Implement database seeding scripts
      `,
      category: 'database',
      difficulty: 'medium',
      estimatedTime: 9,
      prerequisites: [8],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresDocumentation: true
      },
      createdBy: adminUser._id
    },
    {
      taskNumber: 10,
      title: 'RESTful API Development',
      description: 'Create a complete RESTful API with authentication, authorization, and proper HTTP status codes.',
      instructions: `
        1. Design RESTful API endpoints following conventions
        2. Implement JWT-based authentication
        3. Add role-based authorization
        4. Use proper HTTP status codes and responses
        5. Add API rate limiting and security headers
        6. Create comprehensive API testing with Postman
      `,
      category: 'backend',
      difficulty: 'medium',
      estimatedTime: 10,
      prerequisites: [8, 9],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresDocumentation: true
      },
      createdBy: adminUser._id
    },
    // Continue with more tasks...
    {
      taskNumber: 11,
      title: 'User Authentication System',
      description: 'Build a complete user authentication system with registration, login, password reset, and email verification.',
      instructions: `
        1. Implement user registration with email verification
        2. Create secure login with password hashing
        3. Add password reset functionality
        4. Implement JWT token refresh mechanism
        5. Add social login (Google OAuth)
        6. Create user profile management
      `,
      category: 'backend',
      difficulty: 'hard',
      estimatedTime: 12,
      prerequisites: [10],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresDocumentation: true
      },
      createdBy: adminUser._id
    },
    {
      taskNumber: 12,
      title: 'File Upload & Storage',
      description: 'Implement secure file upload with cloud storage and image processing.',
      instructions: `
        1. Set up multer for file uploads
        2. Integrate with AWS S3 or Cloudinary
        3. Add image resizing and optimization
        4. Implement file validation and security
        5. Create file management API endpoints
        6. Add progress tracking for large uploads
      `,
      category: 'backend',
      difficulty: 'medium',
      estimatedTime: 8,
      prerequisites: [10],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresDocumentation: true
      },
      createdBy: adminUser._id
    },
    {
      taskNumber: 13,
      title: 'Email Service Integration',
      description: 'Set up email services for transactional emails, notifications, and marketing.',
      instructions: `
        1. Integrate with email service (SendGrid, Nodemailer)
        2. Create HTML email templates
        3. Implement transactional emails
        4. Add email queue for better performance
        5. Create email analytics and tracking
        6. Implement unsubscribe functionality
      `,
      category: 'backend',
      difficulty: 'medium',
      estimatedTime: 7,
      prerequisites: [11],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresDocumentation: true
      },
      createdBy: adminUser._id
    },
    {
      taskNumber: 14,
      title: 'Week 2 Project: Complete Backend API',
      description: 'Build a complete backend API for a social media or e-commerce platform.',
      instructions: `
        1. Combine all backend concepts into one project
        2. Create a scalable API architecture
        3. Implement all CRUD operations
        4. Add comprehensive authentication and authorization
        5. Include file uploads and email functionality
        6. Write API documentation and tests
      `,
      category: 'backend',
      difficulty: 'hard',
      estimatedTime: 15,
      prerequisites: [8, 9, 10, 11, 12, 13],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresDocumentation: true
      },
      createdBy: adminUser._id
    },
    // Week 3: Frontend Frameworks (Days 15-21)
    {
      taskNumber: 15,
      title: 'React.js Fundamentals',
      description: 'Learn React.js basics including components, state, props, and hooks.',
      instructions: `
        1. Set up React development environment
        2. Create functional and class components
        3. Understand state and props
        4. Implement React hooks (useState, useEffect, etc.)
        5. Build a multi-component application
        6. Add component lifecycle management
      `,
      category: 'frontend',
      difficulty: 'medium',
      estimatedTime: 10,
      prerequisites: [3],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresLiveDemo: true
      },
      createdBy: adminUser._id
    },
    {
      taskNumber: 16,
      title: 'React Router & Navigation',
      description: 'Implement client-side routing and navigation in React applications.',
      instructions: `
        1. Set up React Router for navigation
        2. Create nested routes and layouts
        3. Implement protected routes
        4. Add dynamic routing with parameters
        5. Handle 404 errors and redirects
        6. Implement breadcrumb navigation
      `,
      category: 'frontend',
      difficulty: 'medium',
      estimatedTime: 6,
      prerequisites: [15],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresLiveDemo: true
      },
      createdBy: adminUser._id
    },
    {
      taskNumber: 17,
      title: 'State Management with Redux',
      description: 'Implement global state management using Redux and Redux Toolkit.',
      instructions: `
        1. Set up Redux with Redux Toolkit
        2. Create actions and reducers
        3. Implement async actions with Thunk
        4. Connect React components to Redux store
        5. Add Redux DevTools for debugging
        6. Implement local storage persistence
      `,
      category: 'frontend',
      difficulty: 'hard',
      estimatedTime: 12,
      prerequisites: [15],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresLiveDemo: true
      },
      createdBy: adminUser._id
    },
    // Continue with remaining tasks up to 35...
    {
      taskNumber: 18,
      title: 'API Integration in React',
      description: 'Connect React frontend with backend APIs using Axios and handle loading states.',
      instructions: `
        1. Set up Axios for API calls
        2. Create custom hooks for API operations
        3. Implement loading and error states
        4. Add data caching and optimization
        5. Handle authentication in API calls
        6. Create reusable API service modules
      `,
      category: 'frontend',
      difficulty: 'medium',
      estimatedTime: 8,
      prerequisites: [15, 14],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresLiveDemo: true
      },
      createdBy: adminUser._id
    },
    // Add more tasks to reach 35...
    // For brevity, I'll add a few more key tasks and then create the rest programmatically
    
    {
      taskNumber: 35,
      title: 'Final Capstone Project',
      description: 'Build a complete full-stack application demonstrating all learned concepts.',
      instructions: `
        1. Plan and design a full-stack application
        2. Implement backend API with all features
        3. Create responsive React frontend
        4. Add user authentication and authorization
        5. Implement real-time features with Socket.io
        6. Deploy to production with CI/CD pipeline
        7. Write comprehensive documentation
        8. Create video demonstration
      `,
      category: 'fullstack',
      difficulty: 'hard',
      estimatedTime: 20,
      prerequisites: [30, 31, 32, 33, 34], // Assuming previous tasks exist
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresLiveDemo: true,
        requiresDocumentation: true
      },
      isPaid: false, // This is the final free task
      createdBy: adminUser._id
    }
  ];

  // Add intermediate tasks (19-34) programmatically
  const intermediateTopics = [
    'Form Handling & Validation',
    'CSS-in-JS with Styled Components',
    'Week 3 Project: React Dashboard',
    'Advanced React Patterns',
    'Testing with Jest & React Testing Library',
    'Performance Optimization',
    'Progressive Web Apps (PWA)',
    'GraphQL Basics',
    'Real-time Features with Socket.io',
    'Week 4 Project: Real-time Chat App',
    'Docker Containerization',
    'CI/CD with GitHub Actions',
    'AWS Deployment',
    'Monitoring & Logging',
    'Security Best Practices',
    'Week 5 Project: Production Deployment'
  ];

  intermediateTopics.forEach((topic, index) => {
    const taskNumber = 19 + index;
    tasks.splice(taskNumber - 1, 0, {
      taskNumber,
      title: topic,
      description: `Learn and implement ${topic} in your development workflow.`,
      instructions: `Detailed instructions for ${topic} implementation.`,
      category: taskNumber <= 21 ? 'frontend' : taskNumber <= 28 ? 'fullstack' : 'devops',
      difficulty: taskNumber <= 21 ? 'medium' : 'hard',
      estimatedTime: taskNumber % 7 === 0 ? 12 : 8, // Project tasks take longer
      prerequisites: taskNumber > 15 ? [taskNumber - 1] : [],
      submissionRequirements: {
        requiresGithubRepo: true,
        requiresLiveDemo: taskNumber <= 28,
        requiresDocumentation: true
      },
      createdBy: adminUser._id
    });
  });

  await Task.deleteMany({});
  const createdTasks = await Task.insertMany(tasks);
  logger.info(`Created ${createdTasks.length} tasks`);
  return createdTasks;
};

const seedProgress = async (users, tasks) => {
  logger.info('Seeding user progress...');
  
  const progressData = [];
  
  // Create progress for students only
  const students = users.filter(user => user.role === 'student');
  
  students.forEach((student, index) => {
    const currentDay = student.internshipProgress.currentDay;
    const tasksToComplete = Math.min(currentDay, tasks.length);
    
    const taskProgress = [];
    
    for (let i = 0; i < tasksToComplete; i++) {
      const task = tasks[i];
      const isCompleted = i < currentDay - 1;
      const score = isCompleted ? Math.floor(Math.random() * 30) + 70 : 0; // Random score 70-100
      
      taskProgress.push({
        taskId: task._id,
        taskNumber: task.taskNumber,
        status: isCompleted ? 'completed' : 'in_progress',
        startedAt: new Date(Date.now() - (currentDay - i) * 24 * 60 * 60 * 1000),
        completedAt: isCompleted ? new Date(Date.now() - (currentDay - i - 1) * 24 * 60 * 60 * 1000) : null,
        score,
        timeSpent: Math.floor(Math.random() * 300) + 180, // 3-8 hours in minutes
        attempts: 1
      });
    }
    
    progressData.push({
      student: student._id,
      overall: {
        currentDay,
        percentageComplete: Math.round((currentDay / 35) * 100),
        startedAt: student.internshipProgress.enrollmentDate,
        completedAt: student.internshipProgress.completionDate,
        totalTimeSpent: taskProgress.reduce((sum, task) => sum + task.timeSpent, 0),
        isActive: !student.internshipProgress.completionDate
      },
      tasks: taskProgress,
      performance: {
        averageScore: student.internshipProgress.overallScore,
        tasksCompleted: taskProgress.filter(t => t.status === 'completed').length,
        tasksSkipped: 0,
        onTimeSubmissions: taskProgress.filter(t => t.status === 'completed').length,
        lateSubmissions: 0,
        consistencyScore: 95
      },
      streaks: {
        current: index * 3, // Varied streak data
        longest: index * 5,
        lastActivityDate: new Date()
      },
      certificate: {
        isEligible: student.internshipProgress.certificateEligible,
        finalScore: student.internshipProgress.overallScore,
        issued: student.internshipProgress.certificateIssued,
        issuedAt: student.internshipProgress.certificateIssued ? new Date() : null
      }
    });
  });

  await Progress.deleteMany({});
  const createdProgress = await Progress.insertMany(progressData);
  logger.info(`Created progress for ${createdProgress.length} students`);
  return createdProgress;
};

const seedSubmissions = async (users, tasks) => {
  logger.info('Seeding submissions...');
  
  const submissions = [];
  const students = users.filter(user => user.role === 'student');
  
  // Create submissions for completed tasks
  students.forEach(student => {
    const completedTasks = Math.floor(student.internshipProgress.currentDay * 0.8); // 80% of current day tasks have submissions
    
    for (let i = 0; i < completedTasks; i++) {
      const task = tasks[i];
      if (!task) continue;
      
      submissions.push({
        student: student._id,
        task: task._id,
        githubRepo: `https://github.com/${student.userId}/task-${task.taskNumber}-solution`,
        submissionText: `My solution for ${task.title}. I've implemented all the requirements and followed best practices.`,
        completionTime: Math.floor(Math.random() * 5) + 3, // 3-8 hours
        status: Math.random() > 0.1 ? 'approved' : 'under_review', // 90% approved
        score: {
          points: Math.floor(Math.random() * 30) + 70 // 70-100 points
        },
        submittedAt: new Date(Date.now() - (completedTasks - i) * 24 * 60 * 60 * 1000)
      });
    }
  });

  await Submission.deleteMany({});
  const createdSubmissions = await Submission.insertMany(submissions);
  logger.info(`Created ${createdSubmissions.length} submissions`);
  return createdSubmissions;
};

const seedAnnouncements = async (adminUser) => {
  logger.info('Seeding announcements...');
  
  const announcements = [
    {
      title: 'Welcome to the 35-Day Internship Program!',
      message: 'Welcome to our comprehensive full-stack development internship! Over the next 35 days, you\'ll learn everything from HTML/CSS basics to advanced full-stack deployment. Make sure to submit your tasks on time and don\'t hesitate to ask for help in our community Discord.',
      sender: adminUser._id,
      recipients: { type: 'all' },
      priority: 'high',
      category: 'general',
      settings: {
        pinned: true,
        sendEmail: true,
        showOnDashboard: true
      }
    },
    {
      title: 'Week 1 Checkpoint: Foundation Complete',
      message: 'Congratulations to everyone who completed Week 1! You\'ve built a solid foundation in HTML, CSS, JavaScript, and basic backend concepts. Week 2 will focus on advanced backend development with Express.js and MongoDB.',
      sender: adminUser._id,
      recipients: { 
        type: 'progress_based',
        progressCriteria: { minDay: 7 }
      },
      priority: 'medium',
      category: 'academic'
    },
    {
      title: 'Certificate Eligibility Requirements',
      message: 'To be eligible for your completion certificate, you need:\n• Complete all 35 tasks\n• Maintain a score of 75% or higher\n• Submit tasks within 24 hours of deadline\n\nCertificates cost ₹499 and unlock access to paid advanced tasks.',
      sender: adminUser._id,
      recipients: { type: 'all' },
      priority: 'medium',
      category: 'academic',
      settings: {
        showOnDashboard: true
      }
    },
    {
      title: 'New Paid Tasks Available!',
      message: 'Exciting news! We\'ve added advanced paid tasks for certificate holders:\n• Advanced System Design\n• Microservices Architecture\n• DevOps & Cloud Deployment\n• Performance Optimization\n\nEach task costs ₹1000 and includes 1-on-1 mentoring.',
      sender: adminUser._id,
      recipients: { 
        type: 'progress_based',
        progressCriteria: { certificateStatus: 'issued' }
      },
      priority: 'medium',
      category: 'event'
    }
  ];

  await Announcement.deleteMany({});
  const createdAnnouncements = await Announcement.insertMany(announcements);
  logger.info(`Created ${createdAnnouncements.length} announcements`);
  return createdAnnouncements;
};

const main = async () => {
  try {
    logger.info('🌱 Starting database seeding...');
    
    // Connect to database
    await connectDB();
    
    // Seed in correct order due to dependencies
    const users = await seedUsers();
    const adminUser = users.find(user => user.role === 'admin');
    
    const tasks = await seedTasks(adminUser);
    const progress = await seedProgress(users, tasks);
    const submissions = await seedSubmissions(users, tasks);
    const announcements = await seedAnnouncements(adminUser);
    
    logger.info('✅ Database seeding completed successfully!');
    logger.info(`📊 Summary:`);
    logger.info(`   Users: ${users.length}`);
    logger.info(`   Tasks: ${tasks.length}`);
    logger.info(`   Progress Records: ${progress.length}`);
    logger.info(`   Submissions: ${submissions.length}`);
    logger.info(`   Announcements: ${announcements.length}`);
    
    process.exit(0);
    
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  seedUsers,
  seedTasks,
  seedProgress,
  seedSubmissions,
  seedAnnouncements,
  main
};
