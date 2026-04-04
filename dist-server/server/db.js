import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../shared/schema";
import path from "path";
const dbPath = path.resolve("sqlite_v2.db");
console.log("### DB_CHECKPOINT: Initializing database at", dbPath);
let sqlite;
try {
    sqlite = new Database(dbPath);
    console.log("### DB_CHECKPOINT: Database connection established");
}
catch (err) {
    console.error("### DB_ERROR: Failed to connect to database:", err);
    process.exit(1);
}
export const db = drizzle(sqlite, { schema });
