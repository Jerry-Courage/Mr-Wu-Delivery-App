const jwt = require('jsonwebtoken');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Manually load .env since we can't rely on dotenv for this quick test if it fails
let JWT_SECRET = 'mrwus-secret-key-change-in-production';
try {
  const envFile = fs.readFileSync(path.resolve(__dirname, '.env'), 'utf8');
  const match = envFile.match(/JWT_SECRET=(.*)/);
  if (match) JWT_SECRET = match[1].trim();
} catch (e) {}

const BASE_URL = 'http://localhost:3001/api';

const users = [
  { role: 'customer', id: 1, email: 'james@example.com' },
  { role: 'kitchen', id: 2, email: 'kitchen@mrwu.com' },
  { role: 'rider', id: 3, email: 'rider1@mrwu.com' },
];

const endpoints = [
  { name: 'AI Recs', method: 'GET', path: '/ai/recommendations' },
  { name: 'Kitchen Summary', method: 'GET', path: '/ai/kitchen-summary' },
  { name: 'My Orders', method: 'GET', path: '/orders/my' },
  { name: 'All Orders (Mgmt)', method: 'GET', path: '/management/orders' },
  { name: 'Rider Orders', method: 'GET', path: '/rider/orders' }
];

function request(options, body) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    });
    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function runTests() {
  console.log("# API Endpoint Test Report\n");
  console.log("| Endpoint | Role | Status | Result |");
  console.log("|----------|------|--------|--------|");

  for (const user of users) {
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    for (const ep of endpoints) {
      try {
        const urlObj = new URL(`${BASE_URL}${ep.path}`);
        const result = await request({
          hostname: urlObj.hostname,
          port: urlObj.port,
          path: urlObj.pathname,
          method: ep.method,
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        let statusStr = result.status === 200 ? '✅ 200' : (result.status === 403 ? '🚫 403' : `❌ ${result.status}`);
        if (result.status === 500) statusStr = '🔥 500';
        
        const preview = result.data.length > 30 ? result.data.substring(0, 30) + '...' : result.data;
        console.log(`| ${ep.name.padEnd(15)} | ${user.role.padEnd(8)} | ${statusStr} | ${preview.replace(/\n/g, ' ')} |`);
      } catch (err) {
        console.log(`| ${ep.name.padEnd(15)} | ${user.role.padEnd(8)} | 💥 FAIL | ${err.message} |`);
      }
    }
  }
}

runTests();
