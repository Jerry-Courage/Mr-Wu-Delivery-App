import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../shared/schema";
import path from "path";
const dbPath = path.resolve("sqlite_v2.db");
console.log("### DB_PATH:", dbPath);
const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });
