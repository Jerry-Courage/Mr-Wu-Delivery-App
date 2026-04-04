import { eq, desc, and, sql } from "drizzle-orm";
import { db } from "./db";
import {
  users, orders, orderItems, menuItems,
  User, Order, OrderItem, MenuItem,
} from "../shared/schema";
import bcrypt from "bcryptjs";

// Helper to handle JSON parsing for SQLite "arrays"
function parseTags(tags: string | null): string[] {
  if (!tags) return [];
  try {
    return JSON.parse(tags);
  } catch {
    return [];
  }
}

function parseExtras(extras: string | null): string[] {
  if (!extras) return [];
  try {
    return JSON.parse(extras);
  } catch {
    return [];
  }
}

export interface IStorage {
  // Auth
  createUser(data: { email: string; password: string; name: string; phone?: string; role?: "customer" | "kitchen" | "rider" | "admin"; address?: string }): Promise<User>;
  getUserByEmail(email: string): Promise<User | null>;
  getUserById(id: number): Promise<User | null>;
  validatePassword(user: User, password: string): Promise<boolean>;
  getUsersByRole(role: string): Promise<User[]>;
  deleteUser(id: number): Promise<void>;
  getAllRiders(): Promise<User[]>;

  // Menu
  getMenuItems(includeUnavailable?: boolean): Promise<MenuItem[]>;
  getMenuItem(id: number): Promise<MenuItem | null>;
  createMenuItem(data: any): Promise<MenuItem>;
  updateMenuItem(id: number, data: any): Promise<MenuItem>;
  deleteMenuItem(id: number): Promise<void>;

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
  updatePaymentStatus(id: number, status: string, transactionId?: string): Promise<Order>;
  updateMenuItemImage(id: number, imageUrl: string): Promise<MenuItem>;
  assignRider(orderId: number, riderId: number): Promise<Order>;
  updateRiderLocation(orderId: number, lat: number, lng: number): Promise<Order>;
  updateCustomerLocation(orderId: number, lat: number, lng: number): Promise<Order>;

  updateUserProfile(id: number, data: { name?: string; phone?: string; address?: string }): Promise<User | null>;

  // Admin Stats
  getAdminStats(days: number): Promise<{
    revenue: { date: string; amount: number }[];
    orders: { date: string; count: number }[];
    popularItems: { name: string; count: number }[];
    totalRevenue: number;
    totalOrders: number;
    activeUsers: number;
    peakHours: { hour: string; count: number }[];
    userSegments: { name: string; value: number }[];
  }>;
  getAdminUsers(): Promise<(User & { totalSpend: number; orderCount: number })[]>;
}

export class Storage implements IStorage {
  async createUser(data: { email: string; password: string; name: string; phone?: string; role?: "customer" | "kitchen" | "rider" | "admin"; address?: string }): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    const [user] = await db.insert(users).values({
      email: data.email,
      passwordHash,
      name: data.name,
      phone: data.phone,
      role: data.role ?? "customer",
      address: data.address,
      createdAt: new Date(),
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

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role as any));
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  async getAllRiders(): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, "rider"));
  }

  async getMenuItems(includeUnavailable?: boolean): Promise<MenuItem[]> {
    if (includeUnavailable) {
      return db.select().from(menuItems).orderBy(desc(menuItems.createdAt));
    }
    return db.select().from(menuItems).where(eq(menuItems.isAvailable, 1)).orderBy(desc(menuItems.createdAt));
  }

  async getMenuItem(id: number): Promise<MenuItem | null> {
    const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
    return item ?? null;
  }

  async createMenuItem(data: any): Promise<MenuItem> {
    const [item] = await db.insert(menuItems).values({
      ...data,
      isTop: data.isTop ? 1 : 0,
      isAvailable: data.isAvailable ? 1 : 0,
    }).returning();
    return item;
  }

  async updateMenuItem(id: number, data: any): Promise<MenuItem> {
    const [item] = await db.update(menuItems)
      .set({
        ...data,
        isTop: data.isTop !== undefined ? (data.isTop ? 1 : 0) : undefined,
        isAvailable: data.isAvailable !== undefined ? (data.isAvailable ? 1 : 0) : undefined,
        updatedAt: new Date()
      })
      .where(eq(menuItems.id, id))
      .returning();
    if (!item) throw new Error("Menu item not found");
    return item;
  }

  async deleteMenuItem(id: number): Promise<void> {
    await db.delete(menuItems).where(eq(menuItems.id, id));
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
    const now = new Date();
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
      createdAt: now,
      updatedAt: now,
    }).returning();

    if (data.items.length > 0) {
      await db.insert(orderItems).values(
        data.items.map(item => ({
          orderId: order.id,
          menuItemId: item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          extras: item.extras ? JSON.stringify(item.extras) : null,
          specialInstructions: item.specialInstructions,
        }))
      );
    }

    return order;
  }

  async getOrderById(id: number): Promise<(Order & { items: OrderItem[]; rider?: { id: number; name: string } | null }) | null> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return null;
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
    let rider: { id: number; name: string } | null = null;
    if (order.riderId) {
      const [r] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, order.riderId));
      rider = r ?? null;
    }
    return { ...order, items, rider };
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
      eq(orders.riderId, riderId)
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

  async updatePaymentStatus(id: number, status: string, transactionId?: string): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ paymentStatus: status, transactionId: transactionId ?? null, updatedAt: new Date() })
      .where(eq(orders.id, id))
      .returning();
    return order;
  }

  async updateMenuItemImage(id: number, imageUrl: string): Promise<MenuItem> {
    const [item] = await db.update(menuItems)
      .set({ imageUrl, updatedAt: new Date() })
      .where(eq(menuItems.id, id))
      .returning();
    return item;
  }

  async updateUserProfile(id: number, data: { name?: string; phone?: string; address?: string }): Promise<User | null> {
    const updates: Partial<typeof users.$inferInsert> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.phone !== undefined) updates.phone = data.phone;
    if (data.address !== undefined) updates.address = data.address;
    if (Object.keys(updates).length === 0) {
      return this.getUserById(id);
    }
    const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
    return user ?? null;
  }

  async assignRider(orderId: number, riderId: number): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ riderId, status: "assigned", updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async updateRiderLocation(orderId: number, lat: number, lng: number): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ riderLat: lat, riderLng: lng, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async updateCustomerLocation(orderId: number, lat: number, lng: number): Promise<Order> {
    const [order] = await db.update(orders)
      .set({ customerLat: lat, customerLng: lng, updatedAt: new Date() })
      .where(eq(orders.id, orderId))
      .returning();
    return order;
  }

  async getAdminStats(days: number): Promise<{
    revenue: { date: string; amount: number }[];
    orders: { date: string; count: number }[];
    popularItems: { name: string; count: number }[];
    totalRevenue: number;
    totalOrders: number;
    activeUsers: number;
    peakHours: { hour: string; count: number }[];
    userSegments: { name: string; value: number }[];
  }> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    const cutoffMs = cutoff.getTime();

    const allOrders = await db.select().from(orders);
    const recentOrders = allOrders.filter(o => {
      if (!o.createdAt || isNaN(o.createdAt.getTime())) return true; // include legacy orders with bad timestamps
      return o.createdAt.getTime() >= cutoffMs;
    });
    
    // Aggregate by date
    const dailyStats: Record<string, { revenue: number, orders: number }> = {};
    let totalRevenue = 0;

    recentOrders.forEach(order => {
      const ts = (order.createdAt && !isNaN(order.createdAt.getTime())) ? order.createdAt : new Date();
      const date = ts.toISOString().split('T')[0];
      const amount = parseFloat(order.total);
      totalRevenue += amount;

      if (!dailyStats[date]) dailyStats[date] = { revenue: 0, orders: 0 };
      dailyStats[date].revenue += amount;
      dailyStats[date].orders += 1;
    });

    const revenue = Object.entries(dailyStats).map(([date, stats]) => ({ date, amount: stats.revenue }));
    const orderData = Object.entries(dailyStats).map(([date, stats]) => ({ date, count: stats.orders }));

    // Popular items
    const allOrderItems = await db.select().from(orderItems);
    const itemCounts: Record<string, number> = {};
    
    // Filter items belonging to recent orders
    const recentOrderIds = new Set(recentOrders.map(o => o.id));
    allOrderItems.filter(item => recentOrderIds.has(item.orderId)).forEach(item => {
      itemCounts[item.name] = (itemCounts[item.name] || 0) + item.quantity;
    });

    const popularItems = Object.entries(itemCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const allCustomers = await db.select().from(users).where(eq(users.role, "customer"));

    return {
      revenue,
      orders: orderData,
      popularItems,
      totalRevenue,
      totalOrders: recentOrders.length,
      activeUsers: allCustomers.length,
      peakHours: this.calculatePeakHours(allOrders),
      userSegments: this.calculateUserSegments(allOrders, allCustomers),
    };
  }

  private calculatePeakHours(allOrders: Order[]): { hour: string; count: number }[] {
    const hours: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hours[i] = 0;

    allOrders.forEach(o => {
      const ts = (o.createdAt && !isNaN(o.createdAt.getTime())) ? o.createdAt : new Date();
      const hour = ts.getHours();
      hours[hour] = (hours[hour] || 0) + 1;
    });

    return Object.entries(hours).map(([hour, count]) => ({
      hour: `${hour.padStart(2, '0')}:00`,
      count
    }));
  }

  private calculateUserSegments(allOrders: Order[], allCustomers: User[]): { name: string; value: number }[] {
    const segments = {
      "New Customers": 0,
      "Returning Customers": 0,
      "VIP Customers": 0
    };

    const userStats: Record<number, number> = {};
    allOrders.forEach(o => {
      userStats[o.userId] = (userStats[o.userId] || 0) + 1;
    });

    allCustomers.forEach(u => {
      const count = userStats[u.id] || 0;
      if (count === 0) return;
      if (count === 1) segments["New Customers"]++;
      else if (count < 5) segments["Returning Customers"]++;
      else segments["VIP Customers"]++;
    });

    return Object.entries(segments).map(([name, value]) => ({ name, value }));
  }

  async getAdminUsers(): Promise<(User & { totalSpend: number; orderCount: number })[]> {
    const fetchedUsers = await db.select().from(users);
    const filteredUsers = fetchedUsers.filter(u => u.role === "customer" || u.role === "rider");

    const result = await Promise.all(
      filteredUsers.map(async user => {
        const userOrders = await db.select().from(orders).where(eq(orders.userId, user.id));
        const totalSpend = userOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
        return {
          ...user,
          totalSpend,
          orderCount: userOrders.length,
        };
      })
    );

    return result.sort((a, b) => b.totalSpend - a.totalSpend);
  }
}

export const storage = new Storage();
