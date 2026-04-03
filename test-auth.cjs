const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'mrwus-secret-key-change-in-production';
const dbPath = path.resolve(__dirname, 'sqlite.db');
const db = new sqlite3.Database(dbPath);

console.log("Attempting to read users from:", dbPath);

db.all("SELECT id, email, role FROM users", [], (err, rows) => {
  if (err) { console.error(err); process.exit(1); }
  if (!rows || rows.length === 0) {
    console.log("No users found in database.");
    process.exit(0);
  }
  console.log("Users in DB:");
  rows.forEach(u => {
    const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, JWT_SECRET);
    console.log(`Role: ${u.role.padEnd(10)} | Email: ${u.email.padEnd(20)} | ID: ${u.id} | Token: ${token}`);
  });
  db.close();
});
