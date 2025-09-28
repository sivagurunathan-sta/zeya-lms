// prisma/seed.js - MongoDB Version
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MongoDB database seed...');

  try {
    // Create Admin User
    const adminPassword = await bcrypt.hash('admin123', 10);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@lms.com' },
      update: {},
      create: {
        userId: 'ADMIN001',
        name: 'System Administrator',
        email: 'admin@lms.com',
        role: 'ADMIN',
        passwordHash: adminPassword,
        isActive: true
      }
    });
    console.log('✅ Admin user created:', admin.email);

    // Create Sample Internship
    const sampleInternship = await prisma.internship.create({
      data: {
        title: 'Full Stack Web Development Internship',
        description: 'Complete 35-day internship program covering React.js, Node.js, databases, and deployment. Build real-world projects and gain industry experience.',
        coverImage: 'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=800',
        durationDays: 35,
        passPercentage: 75.0,
        certificatePrice: 499,
        isActive: true
      }
    });
    console.log('✅ Sample internship created:', sampleInternship.title);

    // Create Sample Tasks for the Internship
    const sampleTasks = [
      {
        taskNumber: 1,
        title: 'Setup Development Environment',
        description: 'Install Node.js, VS Code, Git, and create your first repository. Set up your development workspace and learn basic Git commands.',
        videoUrl: 'https://www.youtube.com/watch?v=example1',
        files: [
          {
            name: 'Setup Guide.pdf',
            url: 'https://example.com/setup-guide.pdf',
            type: 'pdf'
          }
        ],
        isRequired: true,
        points: 100
      },
      {
        taskNumber: 2,
        title: 'HTML & CSS Fundamentals',
        description: 'Create a responsive portfolio website using HTML5 and CSS3. Implement modern CSS features like Flexbox and Grid.',
        videoUrl: 'https://www.youtube.com/watch?v=example2',
        files: [
          {
            name: 'HTML CSS Reference.pdf',
            url: 'https://example.com/html-css-ref.pdf',
            type: 'pdf'
          },
          {
            name: 'Sample Portfolio.zip',
            url: 'https://example.com/sample-portfolio.zip',
            type: 'zip'
          }
        ],
        isRequired: true,
        points: 100
      },
      {
        taskNumber: 3,
        title: 'JavaScript Basics',
        description: 'Learn JavaScript fundamentals including variables, functions, arrays, objects, and DOM manipulation.',
        videoUrl: 'https://www.youtube.com/watch?v=example3',
        files: [
          {
            name: 'JavaScript Exercises.js',
            url: 'https://example.com/js-exercises.js',
            type: 'javascript'
          }
        ],
        isRequired: true,
        points: 100
      },
      {
        taskNumber: 4,
        title: 'React.js Introduction',
        description: 'Build your first React application. Learn about components, props, state, and event handling.',
        videoUrl: 'https://www.youtube.com/watch?v=example4',
        files: [
          {
            name: 'React Starter Template.zip',
            url: 'https://example.com/react-starter.zip',
            type: 'zip'
          }
        ],
        isRequired: true,
        points: 100
      },
      {
        taskNumber: 5,
        title: 'React Hooks & State Management',
        description: 'Master React hooks including useState, useEffect, useContext. Build a todo application with local storage.',
        videoUrl: 'https://www.youtube.com/watch?v=example5',
        files: [
          {
            name: 'Hooks Guide.pdf',
            url: 'https://example.com/hooks-guide.pdf',
            type: 'pdf'
          }
        ],
        isRequired: true,
        points: 100
      }
    ];

    // Create tasks
    for (const taskData of sampleTasks) {
      const task = await prisma.task.create({
        data: {
          ...taskData,
          internshipId: sampleInternship.id
        }
      });
      console.log(`✅ Task ${task.taskNumber} created: ${task.title}`);
    }

    // Create Sample Interns
    const sampleInterns = [
      {
        name: 'John Doe',
        email: 'john.doe@example.com'
      },
      {
        name: 'Jane Smith',
        email: 'jane.smith@example.com'
      },
      {
        name: 'Raj Patel',
        email: 'raj.patel@example.com'
      },
      {
        name: 'Priya Sharma',
        email: 'priya.sharma@example.com'
      },
      {
        name: 'Alex Johnson',
        email: 'alex.johnson@example.com'
      }
    ];

    const createdInterns = [];
    let internCounter = 1;
    
    for (const internData of sampleInterns) {
      const userId = `INT2025${internCounter.toString().padStart(3, '0')}`;
      const tempPassword = userId.toLowerCase();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const intern = await prisma.user.create({
        data: {
          userId,
          name: internData.name,
          email: internData.email,
          role: 'INTERN',
          passwordHash: hashedPassword,
          isActive: true
        }
      });

      createdInterns.push(intern);
      console.log(`✅ Intern created: ${intern.name} (ID: ${userId}, Password: ${tempPassword})`);
      internCounter++;
    }

    // Enroll first 3 interns in the sample internship
    for (let i = 0; i < Math.min(3, createdInterns.length); i++) {
      const intern = createdInterns[i];
      const enrollment = await prisma.enrollment.create({
        data: {
          internId: intern.id,
          internshipId: sampleInternship.id,
          enrollmentDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000) // Random date within last week
        }
      });
      console.log(`✅ Enrolled ${intern.name} in ${sampleInternship.title}`);
    }

    // Create Sample Paid Tasks
    const paidTasks = [
      {
        title: 'Advanced React Performance Optimization',
        description: 'Learn advanced React optimization techniques including memo, useMemo, useCallback, code splitting, and lazy loading.',
        price: 1000,
        files: [
          {
            name: 'Performance Guide.pdf',
            url: 'https://example.com/performance-guide.pdf',
            type: 'pdf'
          },
          {
            name: 'Optimization Examples.zip',
            url: 'https://example.com/optimization-examples.zip',
            type: 'zip'
          }
        ]
      },
      {
        title: 'Microservices Architecture with Node.js',
        description: 'Build scalable microservices using Node.js, Docker, and Kubernetes. Learn service discovery, load balancing, and monitoring.',
        price: 1000,
        files: [
          {
            name: 'Microservices Blueprint.pdf',
            url: 'https://example.com/microservices-blueprint.pdf',
            type: 'pdf'
          },
          {
            name: 'Docker Templates.zip',
            url: 'https://example.com/docker-templates.zip',
            type: 'zip'
          }
        ]
      },
      {
        title: 'Advanced Database Design & Optimization',
        description: 'Master database indexing, query optimization, replication, sharding, and performance tuning for high-traffic applications.',
        price: 1000,
        files: [
          {
            name: 'Database Optimization Guide.pdf',
            url: 'https://example.com/db-optimization.pdf',
            type: 'pdf'
          }
        ]
      }
    ];

    for (const taskData of paidTasks) {
      const paidTask = await prisma.paidTask.create({
        data: taskData
      });
      console.log(`✅ Paid task created: ${paidTask.title}`);
    }

    // Create Sample Notifications for interns
    const notifications = [
      {
        title: 'Welcome to LMS!',
        message: 'Welcome to our Learning Management System. Start your journey by enrolling in an internship.',
        type: 'SUCCESS'
      },
      {
        title: 'Task Deadline Reminder',
        message: 'Your task submission deadline is approaching. Please submit your work within 24 hours.',
        type: 'WARNING'
      },
      {
        title: 'New Features Available',
        message: 'Check out the new paid tasks section for advanced learning opportunities.',
        type: 'INFO'
      }
    ];

    for (const intern of createdInterns.slice(0, 3)) {
      for (const notifData of notifications) {
        await prisma.notification.create({
          data: {
            userId: intern.id,
            ...notifData
          }
        });
      }
      console.log(`✅ Notifications created for ${intern.name}`);
    }

    // Create Sample Submissions (for demo purposes)
    const enrollments = await prisma.enrollment.findMany({
      include: {
        intern: { select: { name: true } },
        internship: {
          include: {
            tasks: { orderBy: { taskNumber: 'asc' }, take: 3 }
          }
        }
      }
    });

    for (const enrollment of enrollments) {
      // Create submissions for first 2 tasks
      for (let i = 0; i < Math.min(2, enrollment.internship.tasks.length); i++) {
        const task = enrollment.internship.tasks[i];
        const submissionDate = new Date(enrollment.enrollmentDate.getTime() + (i + 1) * 24 * 60 * 60 * 1000);
        
        const submission = await prisma.submission.create({
          data: {
            enrollmentId: enrollment.id,
            taskId: task.id,
            internId: enrollment.internId,
            githubRepoUrl: `https://github.com/sample-user/task-${task.taskNumber}-submission`,
            submissionDate: submissionDate,
            isLate: false,
            score: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
            status: Math.random() > 0.3 ? 'APPROVED' : 'PENDING', // 70% approved
            adminFeedback: Math.random() > 0.5 ? 'Good work! Keep it up.' : null
          }
        });
        console.log(`✅ Submission created for ${enrollment.intern.name} - Task ${task.taskNumber}`);
      }
    }

    console.log('🎉 MongoDB database seed completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Admin user: admin@lms.com (password: admin123)');
    console.log('- Sample internship with 5 tasks created');
    console.log('- 5 sample interns created (password = userId in lowercase)');
    console.log('- 3 paid tasks created');
    console.log('- Sample enrollments and submissions created');
    console.log('\n🚀 You can now start the server and begin testing!');

  } catch (error) {
    console.error('❌ Error during seed:', error);
    throw error;
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });