import Database from "better-sqlite3";
import path from "path";
const dbPath = path.resolve("sqlite_v2.db");
const sqlite = new Database(dbPath);
try {
  sqlite.exec("ALTER TABLE orders ADD COLUMN rider_lat REAL;");
} catch (e) { console.log("rider_lat failed:", e.message); }
try {
  sqlite.exec("ALTER TABLE orders ADD COLUMN rider_lng REAL;");
} catch (e) { console.log("rider_lng failed:", e.message); }
try {
  sqlite.exec("ALTER TABLE orders ADD COLUMN customer_lat REAL;");
} catch (e) { console.log("customer_lat failed:", e.message); }
try {
  sqlite.exec("ALTER TABLE orders ADD COLUMN customer_lng REAL;");
} catch (e) { console.log("customer_lng failed:", e.message); }
console.log("Migration check complete");
