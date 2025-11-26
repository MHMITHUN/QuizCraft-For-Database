const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test user credentials
let authToken = '';
let userId = '';
let quizId = '';

// Helper function for API calls
async function testEndpoint(name, method, url, data = null, headers = {}) {
  try {
    console.log(`\n🔍 Testing: ${name}`);
    
    const config = {
      method,
      url: `${BASE_URL}${url}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    console.log(`✅ ${name} - SUCCESS`);
    console.log('Response:', JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log(`❌ ${name} - FAILED`);
    console.log('Error:', error.response?.data || error.message);
    return null;
  }
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('🚀 QUIZCRAFT API TEST SUITE');
  console.log('='.repeat(60));

  // Test 1: Health Check
  await testEndpoint('Health Check', 'GET', '/../health');

  // Test 2: Register
  const registerResult = await testEndpoint(
    'Register User',
    'POST',
    '/auth/register',
    {
      name: 'Test User',
      email: `test_${Date.now()}@example.com`,
      password: 'password123',
      role: 'student'
    }
  );

  if (registerResult?.data?.token) {
    authToken = registerResult.data.token;
    userId = registerResult.data.user.id;
    console.log(`\n🔑 Auth Token: ${authToken.substring(0, 20)}...`);
  }

  // Test 3: Login
  const loginResult = await testEndpoint(
    'Login',
    'POST',
    '/auth/login',
    {
      email: 'sumyasoma@gmail.com',
      password: 'sumya1234'
    }
  );

  if (loginResult?.data?.token) {
    authToken = loginResult.data.token;
    userId = loginResult.data.user.id;
  }

  // Test 4: Get Profile
  if (authToken) {
    await testEndpoint(
      'Get Profile',
      'GET',
      '/auth/me',
      null,
      { Authorization: `Bearer ${authToken}` }
    );
  }

  // Test 5: Guest Access
  await testEndpoint('Guest Access', 'POST', '/auth/guest-access');

  // Test 6: Generate Quiz from Text
  if (authToken) {
    const quizResult = await testEndpoint(
      'Generate Quiz from Text',
      'POST',
      '/quiz/generate-from-text',
      {
        text: 'JavaScript is a programming language that is one of the core technologies of the World Wide Web. It enables interactive web pages and is an essential part of web applications. JavaScript is a high-level, often just-in-time compiled language that conforms to the ECMAScript standard. It has dynamic typing, prototype-based object-orientation, and first-class functions.',
        numQuestions: 3,
        quizType: 'mcq',
        difficulty: 'medium',
        language: 'en'
      },
      { Authorization: `Bearer ${authToken}` }
    );

    if (quizResult?.data?.quiz?.id) {
      quizId = quizResult.data.quiz.id;
    }
  }

  // Test 7: Get All Quizzes
  if (authToken) {
    await testEndpoint(
      'Get All Quizzes',
      'GET',
      '/quiz',
      null,
      { Authorization: `Bearer ${authToken}` }
    );
  }

  // Test 8: Search Categories
  await testEndpoint('Get Categories', 'GET', '/search/categories');

  // Test 9: Search Tags
  await testEndpoint('Get Tags', 'GET', '/search/tags');

  // Test 10: Search Similar Quizzes
  await testEndpoint(
    'Search Similar Quizzes',
    'GET',
    '/search/similar?query=javascript&limit=5'
  );

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('✨ TEST SUITE COMPLETED');
  console.log('='.repeat(60));
}

// Run tests
runTests().catch(console.error);
