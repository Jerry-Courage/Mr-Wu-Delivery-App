import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "./shared/schema";
import bcrypt from "bcryptjs";

const sqlite = new Database("sqlite_v2.db");
const db = drizzle(sqlite, { schema });

async function createTestUsers() {
  const users = [
    { email: "kitchen@test.com", password: "password123", name: "Chef Wu", role: "kitchen" },
    { email: "rider@test.com", password: "password123", name: "Rider Wu", role: "rider" }
  ];

  for (const u of users) {
    const existing = await db.query.users.findFirst({
      where: (user, { eq }) => eq(user.email, u.email),
    });

    if (!existing) {
      const passwordHash = await bcrypt.hash(u.password, 10);
      await db.insert(schema.users).values({
        email: u.email,
        passwordHash,
        name: u.name,
        role: u.role as any,
        createdAt: new Date(),
      });
      console.log(`### Created ${u.role}: ${u.email} / ${u.password}`);
    } else {
      console.log(`### ${u.role} already exists: ${u.email}`);
    }
  }
}

createTestUsers().then(() => process.exit(0));
