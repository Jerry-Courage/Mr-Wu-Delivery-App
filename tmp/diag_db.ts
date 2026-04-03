
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function diag() {
  console.log("Database diagnostic starting...");
  try {
    const result = await db.run(sql`PRAGMA table_info(orders)`);
    console.log("Orders table columns:", JSON.stringify(result, null, 2));
    
    // Check if the file exists and its path
    const fs = require('fs');
    const path = require('path');
    const dbPath = path.resolve('sqlite.db');
    console.log("Absolute path for sqlite.db:", dbPath);
    if (fs.existsSync(dbPath)) {
      const stats = fs.statSync(dbPath);
      console.log("File size:", stats.size, "bytes");
      console.log("Last modified:", stats.mtime);
    } else {
      console.log("File NOT found at", dbPath);
    }
  } catch (err) {
    console.error("Diagnostic error:", err);
  }
}

diag();
