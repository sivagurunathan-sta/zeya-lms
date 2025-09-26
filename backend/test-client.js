// test-client.js - Test your API endpoints
const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testAPI() {
  console.log('🧪 Testing LMS API...\n');

  try {
    // Test 1: Health Check
    console.log('1. Testing health endpoint...');
    try {
      const healthResponse = await axios.get(`${BASE_URL}/health`);
      console.log('✅ Health check passed:', healthResponse.data.message);
    } catch (error) {
      console.log('❌ Health check failed:', error.message);
      console.log('   Make sure your server is running on port 3000');
      return;
    }

    // Test 2: Admin Login
    console.log('\n2. Testing admin login...');
    try {
      const loginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        userId: 'ADMIN001',
        password: 'admin123'
      });

      if (loginResponse.data.success) {
        console.log('✅ Admin login successful!');
        console.log('   Token received:', loginResponse.data.data.token.substring(0, 20) + '...');
        
        const token = loginResponse.data.data.token;
        
        // Test 3: Protected Route
        console.log('\n3. Testing protected route (admin dashboard)...');
        try {
          const dashboardResponse = await axios.get(`${BASE_URL}/api/admin/dashboard`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('✅ Protected route access successful!');
          console.log('   Dashboard data received:', Object.keys(dashboardResponse.data.data));
        } catch (error) {
          console.log('❌ Protected route failed:', error.response?.data?.message || error.message);
        }

        // Test 4: Get Current User
        console.log('\n4. Testing get current user...');
        try {
          const userResponse = await axios.get(`${BASE_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          console.log('✅ Get user successful!');
          console.log('   User:', userResponse.data.data.user.name, '(' + userResponse.data.data.user.role + ')');
        } catch (error) {
          console.log('❌ Get user failed:', error.response?.data?.message || error.message);
        }

      } else {
        console.log('❌ Admin login failed:', loginResponse.data.message);
      }

    } catch (error) {
      console.log('❌ Admin login failed:', error.response?.data?.message || error.message);
      
      if (error.response?.status === 401) {
        console.log('   This usually means:');
        console.log('   - Admin user doesn\'t exist in database');
        console.log('   - Password is incorrect');
        console.log('   - Run: node test-setup.js to verify');
      }
    }

    // Test 5: Test Intern Login (if exists)
    console.log('\n5. Testing intern login...');
    try {
      const internLoginResponse = await axios.post(`${BASE_URL}/api/auth/login`, {
        userId: 'INT2025001',
        password: 'int2025001'
      });

      if (internLoginResponse.data.success) {
        console.log('✅ Intern login successful!');
        
        const internToken = internLoginResponse.data.data.token;
        
        // Test intern dashboard
        const internDashboard = await axios.get(`${BASE_URL}/api/intern/dashboard`, {
          headers: {
            'Authorization': `Bearer ${internToken}`
          }
        });
        
        console.log('✅ Intern dashboard access successful!');
        console.log('   Enrollments:', internDashboard.data.data.enrollments.length);
      }
    } catch (error) {
      console.log('⚠️  Intern login failed (this is normal if database wasn\'t seeded)');
      console.log('   Run: node prisma/seed.js to create sample interns');
    }

    console.log('\n🎉 API testing complete!');

  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
}

// Test wrong credentials
async function testWrongCredentials() {
  console.log('\n6. Testing wrong credentials...');
  try {
    await axios.post(`${BASE_URL}/api/auth/login`, {
      userId: 'WRONG_ID',
      password: 'wrong_password'
    });
  } catch (error) {
    if (error.response?.status === 401) {
      console.log('✅ Wrong credentials properly rejected');
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
}

// Run tests
async function runAllTests() {
  await testAPI();
  await testWrongCredentials();
  
  console.log('\n📋 Summary:');
  console.log('If all tests passed, your sign-in should work!');
  console.log('If tests failed, check the error messages above.');
  console.log('\n🔧 Next steps if sign-in still doesn\'t work:');
  console.log('1. Check browser console for CORS errors');
  console.log('2. Verify frontend is sending correct request format');
  console.log('3. Check if frontend URL matches BASE_URL');
  console.log('4. Ensure no proxy/firewall blocking requests');
}

runAllTests();