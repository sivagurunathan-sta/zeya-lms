const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Clear existing data (one by one to avoid transactions)
  try {
    await prisma.auditLog.deleteMany().catch(() => {});
    await prisma.notification.deleteMany().catch(() => {});
    await prisma.privateTask.deleteMany().catch(() => {});
    await prisma.chatMessage.deleteMany().catch(() => {});
    await prisma.chatRoom.deleteMany().catch(() => {});
    await prisma.chatPermission.deleteMany().catch(() => {});
    await prisma.payment.deleteMany().catch(() => {});
    await prisma.submission.deleteMany().catch(() => {});
    await prisma.enrollment.deleteMany().catch(() => {});
    await prisma.task.deleteMany().catch(() => {});
    await prisma.courseMaterial.deleteMany().catch(() => {});
    await prisma.internship.deleteMany().catch(() => {});
    await prisma.paidTask.deleteMany().catch(() => {});
    await prisma.user.deleteMany().catch(() => {});
    
    console.log('✅ Cleared existing data');
  } catch (error) {
    console.log('⚠️  Some cleanup errors (this is normal on first run)');
  }

  // Create Admin User
  const admin = await prisma.user.create({
    data: {
      userId: 'ADMIN001',
      name: 'System Administrator',
      email: 'admin@lms.com',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'ADMIN',
      isActive: true
    }
  });
  console.log('✅ Created admin user');

  // Create Sample Interns
  const interns = [];
  for (let i = 1; i <= 10; i++) {
    const userId = `INT2025${String(i).padStart(3, '0')}`;
    const intern = await prisma.user.create({
      data: {
        userId,
        name: `Intern ${i}`,
        email: `intern${i}@lms.com`,
        passwordHash: await bcrypt.hash(userId.toLowerCase(), 10),
        role: 'INTERN',
        isActive: true
      }
    });
    interns.push(intern);
  }
  console.log(`✅ Created ${interns.length} intern users`);

  // Create Sample Internship
  const internship = await prisma.internship.create({
    data: {
      title: 'Full Stack Web Development Internship',
      description: 'Complete 35-day intensive web development program covering React, Node.js, and databases.',
      durationDays: 35,
      isActive: true,
      price: 0,
      certificatePrice: 499
    }
  });
  console.log('✅ Created sample internship');

  // Create Course Materials
  const materials = [
    { title: 'Introduction to Web Development', materialType: 'VIDEO', fileUrl: '/materials/intro.mp4' },
    { title: 'HTML & CSS Basics', materialType: 'PDF', fileUrl: '/materials/html-css.pdf' },
    { title: 'JavaScript Fundamentals', materialType: 'VIDEO', fileUrl: '/materials/js-basics.mp4' }
  ];

  for (const material of materials) {
    await prisma.courseMaterial.create({
      data: {
        ...material,
        internshipId: internship.id,
        fileSize: 1024000
      }
    });
  }
  console.log('✅ Created course materials');

  // Create 35 Tasks
  const taskTitles = [
    'Setup Development Environment', 'HTML Basics', 'CSS Styling', 'JavaScript Fundamentals',
    'DOM Manipulation', 'ES6 Features', 'Async JavaScript', 'Fetch API', 'React Basics',
    'React Components', 'React Hooks', 'State Management', 'React Router', 'Form Handling',
    'API Integration', 'Node.js Basics', 'Express Server', 'RESTful APIs', 'MongoDB Setup',
    'CRUD Operations', 'Authentication', 'JWT Implementation', 'File Upload', 'Error Handling',
    'Testing Basics', 'Unit Testing', 'Integration Testing', 'Deployment Basics', 'Docker Introduction',
    'CI/CD Pipeline', 'Git Workflow', 'Code Review', 'Performance Optimization', 'Security Best Practices',
    'Final Project'
  ];

  const tasks = [];
  for (let i = 0; i < 35; i++) {
    const task = await prisma.task.create({
      data: {
        internshipId: internship.id,
        taskNumber: i + 1,
        title: taskTitles[i],
        description: `Complete ${taskTitles[i]} and submit your work via GitHub repository.`,
        points: 10,
        submissionType: 'GITHUB',
        isActive: true
      }
    });
    tasks.push(task);
  }
  console.log('✅ Created 35 tasks');

  // Create Paid Tasks
  const paidTasks = [
    { title: 'Advanced React Patterns', description: 'Deep dive into advanced React patterns and architecture.' },
    { title: 'Microservices Architecture', description: 'Build and deploy microservices with Docker and Kubernetes.' },
    { title: 'AWS Deployment', description: 'Deploy full-stack applications on AWS cloud platform.' }
  ];

  for (const task of paidTasks) {
    await prisma.paidTask.create({
      data: {
        ...task,
        price: 1000,
        isActive: true
      }
    });
  }
  console.log('✅ Created paid tasks');

  // Enroll first 3 interns in the internship
  for (let i = 0; i < 3; i++) {
    const enrollment = await prisma.enrollment.create({
      data: {
        userId: interns[i].id,
        internshipId: internship.id,
      }
    });

    // Create sample submissions for first 5 tasks
    for (let j = 0; j < 5; j++) {
      await prisma.submission.create({
        data: {
          enrollmentId: enrollment.id,
          taskId: tasks[j].id,
          userId: interns[i].id,
          submissionType: 'GITHUB',
          githubUrl: `https://github.com/intern${i + 1}/task-${j + 1}`,
          status: i === 0 ? 'APPROVED' : 'PENDING',
          score: i === 0 ? 10 : null,
          nextTaskUnlocked: i === 0
        }
      });
    }

    // Create notification
    await prisma.notification.create({
      data: {
        userId: interns[i].id,
        title: 'Welcome to LMS!',
        message: 'You have been enrolled in the Full Stack Web Development Internship.',
        type: 'SUCCESS'
      }
    });
  }
  console.log('✅ Created sample enrollments and submissions');

  console.log('\n🎉 Database seeding completed successfully!');
  console.log('\n📝 Login Credentials:');
  console.log('   Admin: admin@lms.com / admin123');
  console.log('   Interns: intern1@lms.com to intern10@lms.com');
  console.log('   Password format: int2025001 to int2025010');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });