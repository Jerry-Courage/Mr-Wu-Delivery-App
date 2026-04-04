import "dotenv/config";
console.log("### SERVER_CHECKPOINT: Starting Mr. Wu Delivery App...");
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import { db } from "./db";
import { menuItems, users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import routes from "./routes";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// In-memory chat history keyed by orderId (max 100 messages per order)
const chatHistory = new Map<number, { id: string; senderRole: string; senderName: string; text: string; timestamp: number }[]>();

const PORT = Number(process.env.PORT) || Number(process.env.SERVER_PORT) || 3001;

app.set("trust proxy", 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use("/uploads", express.static("public/uploads"));

// Simple health check endpoint for the container orchestration
app.get("/api/health", (_req, res) => res.json({ status: "healthy", timestamp: new Date().toISOString() }));

import fs from "fs";
import path from "path";
const uploadDir = path.join(process.cwd(), "public", "uploads");
if (!fs.existsSync(uploadDir)) {
  console.log("### SERVER_CHECKPOINT: Creating uploads directory...");
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Setup Socket.io rooms and basic events
io.on("connection", (socket) => {
  socket.on("join", (room: string) => {
    socket.join(room);
    console.log(`Socket ${socket.id} joined room: ${room}`);
  });

  socket.on("join_order_tracking", ({ orderId }) => {
    const room = `order:${orderId}`;
    socket.join(room);
    console.log(`Socket ${socket.id} joined tracking room: ${room}`);
  });

  // Chat: join a chat room and receive message history
  socket.on("chat:join", ({ orderId }: { orderId: number }) => {
    const room = `order_chat:${orderId}`;
    socket.join(room);
    const history = chatHistory.get(orderId) || [];
    socket.emit("chat:history", history);
  });

  // Chat: receive a message and broadcast to the chat room
  socket.on("chat:send", ({ orderId, text, senderRole, senderName }: { orderId: number; text: string; senderRole: string; senderName: string }) => {
    if (!text || !text.trim()) return;
    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      senderRole,
      senderName,
      text: text.trim(),
      timestamp: Date.now(),
    };
    if (!chatHistory.has(orderId)) chatHistory.set(orderId, []);
    const msgs = chatHistory.get(orderId)!;
    msgs.push(message);
    if (msgs.length > 100) msgs.splice(0, msgs.length - 100);
    io.to(`order_chat:${orderId}`).emit("chat:message", message);
  });

  socket.on("disconnect", () => {
    console.log(`Socket ${socket.id} disconnected`);
  });
});

app.use("/api", routes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Serve frontend in production
if (process.env.NODE_ENV === "production" || process.env.RENDER) {
  const distPath = path.resolve(process.cwd(), "dist");
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.resolve(distPath, "index.html"));
    }
  });
}

// Global Error Handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("### GLOBAL ERROR ###", err);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: err.message || "Internal Server Error",
    status
  });
});

async function seedSuperAdmin() {
  const email = "admin@mrwu.com";
  const existing = await db.select().from(users).where(eq(users.email, email));
  
  if (existing.length > 0) {
    const user = existing[0];
    const passwordHash = await bcrypt.hash("mrwu-admin-2025", 10);
    console.log(`### Updating existing admin account: ${email}`);
    await db.update(users).set({ 
      role: "admin",
      passwordHash: passwordHash
    }).where(eq(users.id, user.id));
    return;
  }

  const passwordHash = await bcrypt.hash("mrwu-admin-2025", 10);
  await db.insert(users).values({
    email,
    passwordHash,
    name: "Super Admin",
    role: "admin",
    createdAt: new Date(),
  });
  console.log("Super Admin seeded: admin@mrwu.com / mrwu-admin-2025");
}

async function seedMenuItems() {
  const existing = await db.select().from(menuItems);
  if (existing.length > 0) return;

  await db.insert(menuItems).values([
    { name: "General Tso's Chicken", description: "Crispy chicken chunks tossed in a sweet and spicy glaze with peppers", price: "16.50", imageUrl: "/assets/general-tsos.jpg", calories: 840, tags: JSON.stringify(["Spicy"]), category: "Mains", rating: "4.8", reviews: 250, isTop: 1, isAvailable: 1 },
    { name: "Spicy Szechuan Beef", description: "Tender slices of premium beef wok-seared with Szechuan peppercorns and dried chilies", price: "14.50", imageUrl: "/assets/szechuan-beef.jpg", calories: 640, tags: JSON.stringify(["Spicy"]), category: "Mains", rating: "4.9", reviews: 250, isTop: 0, isAvailable: 1 },
    { name: "Golden Pork Dumplings", description: "Pan-seared dumplings filled with seasoned ground pork and chives", price: "8.95", imageUrl: "/assets/golden-pork.jpg", calories: 420, category: "Appetizers", isTop: 0, isAvailable: 1 },
    { name: "Peking Duck Bao", description: "Fluffy steamed bao buns with crispy duck and hoisin sauce", price: "12.50", imageUrl: "/assets/peking-duck.jpg", calories: 560, category: "Appetizers", isTop: 0, isAvailable: 1 },
    { name: "Sichuan Beef Noodles", description: "Hand-pulled wheat noodles in a rich, numbing beef broth", price: "15.50", imageUrl: "/assets/sichuan-noodles.jpg", calories: 920, tags: JSON.stringify(["Spicy"]), category: "Mains", isTop: 0, isAvailable: 1 },
    { name: "Mr Wu's Family Combo", description: "2 Mains, 2 Appetizers, and Large Rice. Perfect for 3-4 people.", price: "45.00", imageUrl: "/assets/family-combo.jpg", category: "Combos", isTop: 1, isAvailable: 1 },
    { name: "Mapo Tofu (Silken)", description: "Soft tofu cubes set in a spicy sauce with fermented black beans", price: "12.00", imageUrl: "/assets/mapo-tofu.jpg", calories: 580, tags: JSON.stringify(["Spicy", "Veg"]), category: "Mains", isTop: 0, isAvailable: 1 },
    { name: "Crispy Spring Rolls", description: "Golden fried spring rolls with vegetable filling", price: "5.95", imageUrl: "/assets/spring-rolls.jpg", calories: 320, category: "Appetizers", isTop: 0, isAvailable: 1 },
    { name: "Pork Soup Dumplings (6pcs)", description: "Traditional ginger vinegar steamed xiaolongbao", price: "19.80", imageUrl: "/assets/soup-dumplings.jpg", calories: 480, category: "Appetizers", isTop: 0, isAvailable: 1 },
    { name: "Whole Peking Duck", description: "Roasted whole duck with crispy skin, pancakes, and condiments", price: "52.00", imageUrl: "/assets/whole-peking-duck.jpg", calories: 1200, category: "Mains", isTop: 1, isAvailable: 1 },
  ]);
  console.log("Menu items seeded");
}

console.log("### SERVER_CHECKPOINT: Attempting to listen on PORT:", PORT);

httpServer.listen(PORT, "0.0.0.0", async () => {
  console.log(`### SERVER_SUCCESS: Backend running on 0.0.0.0:${PORT}`);
  try {
    console.log("### SERVER_CHECKPOINT: Running initialization seeds...");
    await seedSuperAdmin();
    await seedMenuItems();
    console.log("### SERVER_CHECKPOINT: Startup complete");
  } catch (err) {
    console.error("### SERVER_ERROR: Seed error:", err);
  }
});

// Global error handler for uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("### CRITICAL_ERROR: Uncaught Exception:", err);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("### CRITICAL_ERROR: Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

export { io };
