const jwt = require('jsonwebtoken');
const sqlite3 = require('sqlite3').verbose();
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'mrwus-secret-key-change-in-production';
const db = new sqlite3.Database('sqlite.db');

db.all("SELECT id, email, role FROM users", [], (err, rows) => {
  if (err) { console.error(err); process.exit(1); }
  console.log("Users in DB:");
  rows.forEach(u => {
    const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, JWT_SECRET);
    console.log(`Role: ${u.role.padEnd(10)} | Email: ${u.email.padEnd(20)} | ID: ${u.id} | Token: ${token}`);
  });
  db.close();
});
