// prisma/seed.js - MongoDB Version (Upsert - keeps existing data)
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting MongoDB database seed...');

  try {
    // Create/Update Admin User
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
    console.log('✅ Admin user created/verified:', admin.email);

    // Check if internship already exists
    let sampleInternship = await prisma.internship.findFirst({
      where: { title: 'Full Stack Web Development Internship' }
    });

    if (!sampleInternship) {
      sampleInternship = await prisma.internship.create({
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
    } else {
      console.log('✅ Sample internship already exists:', sampleInternship.title);
    }

    // Create Sample Tasks for the Internship (only if they don't exist)
    const existingTaskCount = await prisma.task.count({
      where: { internshipId: sampleInternship.id }
    });

    if (existingTaskCount === 0) {
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

      for (const taskData of sampleTasks) {
        const task = await prisma.task.create({
          data: {
            ...taskData,
            internshipId: sampleInternship.id
          }
        });
        console.log(`✅ Task ${task.taskNumber} created: ${task.title}`);
      }
    } else {
      console.log(`✅ Tasks already exist (${existingTaskCount} tasks found)`);
    }

    // Create Sample Interns (using upsert)
    const sampleInterns = [
      {
        userId: 'INT2025001',
        name: 'John Doe',
        email: 'john.doe@example.com'
      },
      {
        userId: 'INT2025002',
        name: 'Jane Smith',
        email: 'jane.smith@example.com'
      },
      {
        userId: 'INT2025003',
        name: 'Raj Patel',
        email: 'raj.patel@example.com'
      },
      {
        userId: 'INT2025004',
        name: 'Priya Sharma',
        email: 'priya.sharma@example.com'
      },
      {
        userId: 'INT2025005',
        name: 'Alex Johnson',
        email: 'alex.johnson@example.com'
      }
    ];

    const createdInterns = [];
    
    for (const internData of sampleInterns) {
      const tempPassword = internData.userId.toLowerCase();
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const intern = await prisma.user.upsert({
        where: { email: internData.email },
        update: {},
        create: {
          userId: internData.userId,
          name: internData.name,
          email: internData.email,
          role: 'INTERN',
          passwordHash: hashedPassword,
          isActive: true
        }
      });

      createdInterns.push(intern);
      console.log(`✅ Intern created/verified: ${intern.name} (ID: ${intern.userId})`);
    }

    // Enroll first 3 interns (if not already enrolled)
    for (let i = 0; i < Math.min(3, createdInterns.length); i++) {
      const intern = createdInterns[i];
      
      const existingEnrollment = await prisma.enrollment.findUnique({
        where: {
          internId_internshipId: {
            internId: intern.id,
            internshipId: sampleInternship.id
          }
        }
      });

      if (!existingEnrollment) {
        const enrollment = await prisma.enrollment.create({
          data: {
            internId: intern.id,
            internshipId: sampleInternship.id,
            enrollmentDate: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000)
          }
        });
        console.log(`✅ Enrolled ${intern.name} in ${sampleInternship.title}`);
      } else {
        console.log(`✅ ${intern.name} already enrolled in ${sampleInternship.title}`);
      }
    }

    // Create Sample Paid Tasks (if they don't exist)
    const existingPaidTasks = await prisma.paidTask.count();
    
    if (existingPaidTasks === 0) {
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
    } else {
      console.log(`✅ Paid tasks already exist (${existingPaidTasks} tasks found)`);
    }

    console.log('🎉 MongoDB database seed completed successfully!');
    console.log('\n📋 Summary:');
    console.log('- Admin user: admin@lms.com (password: admin123)');
    console.log('- Sample internship verified/created');
    console.log('- Sample interns verified/created:');
    console.log('  * INT2025001 - john.doe@example.com (password: int2025001)');
    console.log('  * INT2025002 - jane.smith@example.com (password: int2025002)');
    console.log('  * INT2025003 - raj.patel@example.com (password: int2025003)');
    console.log('  * INT2025004 - priya.sharma@example.com (password: int2025004)');
    console.log('  * INT2025005 - alex.johnson@example.com (password: int2025005)');
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