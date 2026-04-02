import { eq, desc, and } from "drizzle-orm";
import { db } from "./db";
import {
  users, orders, orderItems, menuItems,
  User, Order, OrderItem, MenuItem,
} from "../shared/schema";
import bcrypt from "bcryptjs";

export interface IStorage {
  // Auth
  createUser(data: { email: string; password: string; name: string; phone?: string; role?: "customer" | "kitchen" | "rider"; address?: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  validatePassword(user: User, password: string): Promise<boolean>;
  getAllRiders(): Promise<User[]>;

  // Menu
  getMenuItems(): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | null>;

  // Orders
  createOrder(data: {
    userId: number;
    deliveryAddress: string;
    subtotal: string;
    deliveryFee: string;
    tax: string;
    tip: string;
    total: string;
    paymentMethod: string;
    notes?: string;
    items: { menuItemId?: number; name: string; price: string; quantity: number; extras?: string[]; specialInstructions?: string }[];
  }): Promise<Order>;
  getOrderById(id: number): Promise<(Order & { items: OrderItem[] }) | null>;
  getOrdersByUser(userId: number): Promise<(Order & { items: OrderItem[] })[]>;
  getAllOrders(): Promise<(Order & { items: OrderItem[]; customer: User; rider?: User | null })[]>;
  getRiderOrders(riderId: number): Promise<(Order & { items: OrderItem[]; customer: User })[]>;
  updateOrderStatus(id: number, status: Order["status"]): Promise<Order>;
  assignRider(orderId: number, riderId: number): Promise<Order>;
}

export class Storage implements IStorage {
  async createUser(data: { email: string; password: string; name: string; phone?: string; role?: "customer" | "kitchen" | "rider"; address?: string }): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const [user] = await db.insert(users).values({
      email: data.email,
      passwordHash,
      name: data.name,
      phone: data.phone,
      role: data.role ?? "customer",
      address: data.address,
    }).returning();
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async getUserById(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async validatePassword(user: User, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.passwordHash);
  }

  async getAllRiders(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, "rider"));
  }

  async getMenuItems(): Promise<MenuItem[]> {
    return db.select().from(menuItems).where(eq(menuItems.isAvailable, 1));
  }

  async getMenuItem(id: number): Promise<MenuItem | null> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item ?? null;
  }

  async createOrder(data: {
    userId: number;
    deliveryAddress: string;
    subtotal: string;
    deliveryFee: string;
    tax: string;
    tip: string;
    total: string;
    paymentMethod: string;
    notes?: string;
    items: { menuItemId?: number; name: string; price: string; quantity: number; extras?: string[]; specialInstructions?: string }[];
  }): Promise<Order> {
    const [order] = await db.insert(orders).values({
      userId: data.userId,
      deliveryAddress: data.deliveryAddress,
      subtotal: data.subtotal,
      deliveryFee: data.deliveryFee,
      tax: data.tax,
      tip: data.tip,
      total: data.total,
      paymentMethod: data.paymentMethod,
      notes: data.notes,
      status: "pending",
    }).returning();

    if (data.items.length > 0) {
      await db.insert(orderItems).values(
        data.items.map(item => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          extras: item.extras,
          specialInstructions: item.specialInstructions,
        }))
      );
    }

    return order;
  }

  async getOrderById(id: number): Promise<(Order & { items: OrderItem[] }) | null> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return null;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    return { ...order, items };
  }

  async getOrdersByUser(userId: number): Promise<(Order & { items: OrderItem[] })[]> {
    const userOrders = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
    const result = await Promise.all(
      userOrders.map(async order => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        return { ...order, items };
      })
    );
    return result;
  }

  async getAllOrders(): Promise<(Order & { items: OrderItem[]; customer: User; rider?: User | null })[]> {
    const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
    const result = await Promise.all(
      allOrders.map(async order => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        const [customer] = await db.select().from(users).where(eq(users.id, order.userId));
        let rider: User | null = null;
        if (order.riderId) {
          const [r] = await db.select().from(users).where(eq(users.id, order.riderId));
          rider = r ?? null;
        }
        return { ...order, items, customer, rider };
      })
    );
    return result;
  }

  async getRiderOrders(riderId: number): Promise<(Order & { items: OrderItem[]; customer: User })[]> {
    const riderOrders = await db.select().from(orders).where(
      and(eq(orders.riderId, riderId))
    ).orderBy(desc(orders.createdAt));
    const result = await Promise.all(
      riderOrders.map(async order => {
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
        const [customer] = await db.select().from(users).where(eq(users.id, order.userId));
        return { ...order, items, customer };
      })
    );
    return result;
  }

  async updateOrderStatus(id: number, status: Order["status"]): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ status, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async assignRider(orderId: number, riderId: number): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ riderId, status: "assigned", updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }
}

export const storage = new Storage();
