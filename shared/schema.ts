import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

// SQLite doesn't have native enums, so we'll use text with Zod validation
export const roles = ["customer", "kitchen", "rider", "admin"] as const;
export const orderStatuses = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "assigned",
  "picked_up",
  "delivered",
  "cancelled",
] as const;

export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  role: text("role", { enum: roles }).notNull().default("customer"),
  address: text("address"),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const menuItems = sqliteTable("menu_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: text("price").notNull(), // Switched to text for decimal precision
  imageUrl: text("image_url"),
  category: text("category").notNull(),
  calories: integer("calories"),
  tags: text("tags"), // Stored as JSON string
  rating: text("rating"),
  reviews: integer("reviews"),
  isTop: integer("is_top").default(0),
  isAvailable: integer("is_available").default(1),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const orders = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  userId: integer("user_id").notNull().references(() => users.id),
  status: text("status", { enum: orderStatuses }).notNull().default("pending"),
  deliveryAddress: text("delivery_address").notNull(),
  subtotal: text("subtotal").notNull(),
  deliveryFee: text("delivery_fee").notNull(),
  tax: text("tax").notNull(),
  tip: text("tip").notNull(),
  total: text("total").notNull(),
  paymentMethod: text("payment_method").notNull().default("card"),
  paymentStatus: text("payment_status").notNull().default("pending"),
  transactionId: text("transaction_id"),
  riderId: integer("rider_id").references(() => users.id),
  notes: text("notes"),
  createdAt: integer("created_at", { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const orderItems = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => orders.id),
  menuItemId: integer("menu_item_id"),
  name: text("name").notNull(),
  price: text("price").notNull(),
  quantity: integer("quantity").notNull(),
  extras: text("extras"), // Stored as JSON string
  specialInstructions: text("special_instructions"),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, passwordHash: true }).extend({
  password: z.string().min(6),
});
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true, status: true, riderId: true });
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type OrderItem = typeof orderItems.$inferSelect;
export type MenuItem = typeof menuItems.$inferSelect;
