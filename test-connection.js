const http = require('http');

const testURLs = [
  'http://localhost:5000',
  'http://192.168.0.105:5000',
  'http://127.0.0.1:5000'
];

console.log('🔍 Testing backend connections...\n');

function testURL(url) {
  return new Promise((resolve) => {
    const options = {
      method: 'GET',
      timeout: 3000
    };

    const req = http.get(url, options, (res) => {
      console.log(`✅ ${url} - Connected! (Status: ${res.statusCode})`);
      resolve(true);
    });

    req.on('error', (err) => {
      console.log(`❌ ${url} - Failed: ${err.message}`);
      resolve(false);
    });

    req.on('timeout', () => {
      console.log(`⏱️  ${url} - Timeout`);
      req.destroy();
      resolve(false);
    });
  });
}

async function testAll() {
  for (const url of testURLs) {
    await testURL(url);
  }
  
  console.log('\n📝 Notes:');
  console.log('1. Make sure backend is running: cd backend && npm run dev');
  console.log('2. Check Windows Firewall isn\'t blocking port 5000');
  console.log('3. For physical device, use your computer\'s IP (192.168.0.105)');
  console.log('4. For Android emulator, use 10.0.2.2');
  console.log('5. For iOS simulator, use localhost');
}

testAll();
