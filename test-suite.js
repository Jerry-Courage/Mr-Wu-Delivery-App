const jwt = require('jsonwebtoken');
const axios = require('axios');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'mrwus-secret-key-change-in-production';
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

async function runTests() {
  console.log("# API Endpoint Test Report\n");
  console.log("| Endpoint | Role | Status | Result |");
  console.log("|----------|------|--------|--------|");

  for (const user of users) {
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    for (const ep of endpoints) {
      try {
        const res = await axios({
          method: ep.method,
          url: `${BASE_URL}${ep.path}`,
          headers: { Authorization: `Bearer ${token}` },
          validateStatus: () => true, // Don't throw on non-2xx
        });
        const statusStr = res.status === 200 ? '✅ 200' : (res.status === 403 ? '🚫 403' : `❌ ${res.status}`);
        console.log(`| ${ep.name.padEnd(15)} | ${user.role.padEnd(8)} | ${statusStr} | ${JSON.stringify(res.data).slice(0, 30)}... |`);
      } catch (err) {
        console.log(`| ${ep.name.padEnd(15)} | ${user.role.padEnd(8)} | 💥 FAIL | ${err.message} |`);
      }
    }
  }
}

runTests();
