import jwt from "jsonwebtoken";
import { storage } from "./server/storage";
import dotenv from "dotenv";
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || "mrwus-secret-key-change-in-production";

async function testRoles() {
  const users = await storage.db.select().from(require("./shared/schema").users);
  console.log("Users in DB:");
  users.forEach(u => {
    const token = jwt.sign({ id: u.id, email: u.email, role: u.role }, JWT_SECRET);
    console.log(`Role: ${u.role.padEnd(10)} | Email: ${u.email.padEnd(20)} | ID: ${u.id} | Token: ${token}`);
  });
  process.exit(0);
}

testRoles();
