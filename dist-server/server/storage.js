import { eq, desc } from "drizzle-orm";
import { db } from "./db";
import { users, orders, orderItems, menuItems } from "../shared/schema";
import bcrypt from "bcryptjs";
// Helper to handle JSON parsing for SQLite "arrays"
function parseTags(tags) {
    if (!tags)
        return [];
    try {
        return JSON.parse(tags);
    }
    catch {
        return [];
    }
}
function parseExtras(extras) {
    if (!extras)
        return [];
    try {
        return JSON.parse(extras);
    }
    catch {
        return [];
    }
}
export class Storage {
    async createUser(data) {
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
    async getUserByEmail(email) {
        const [user] = await db.select().from(users).where(eq(users.email, email));
        return user ?? null;
    }
    async getUserById(id) {
        const [user] = await db.select().from(users).where(eq(users.id, id));
        return user ?? null;
    }
    async validatePassword(user, password) {
        return bcrypt.compare(password, user.passwordHash);
    }
    async getUsersByRole(role) {
        return db.select().from(users).where(eq(users.role, role));
    }
    async deleteUser(id) {
        await db.delete(users).where(eq(users.id, id));
    }
    async getAllRiders() {
        return db.select().from(users).where(eq(users.role, "rider"));
    }
    async getMenuItems(includeUnavailable) {
        if (includeUnavailable) {
            return db.select().from(menuItems).orderBy(desc(menuItems.createdAt));
        }
        return db.select().from(menuItems).where(eq(menuItems.isAvailable, 1)).orderBy(desc(menuItems.createdAt));
    }
    async getMenuItem(id) {
        const [item] = await db.select().from(menuItems).where(eq(menuItems.id, id));
        return item ?? null;
    }
    async createMenuItem(data) {
        const [item] = await db.insert(menuItems).values({
            ...data,
            isTop: data.isTop ? 1 : 0,
            isAvailable: data.isAvailable ? 1 : 0,
        }).returning();
        return item;
    }
    async updateMenuItem(id, data) {
        const [item] = await db.update(menuItems)
            .set({
            ...data,
            isTop: data.isTop !== undefined ? (data.isTop ? 1 : 0) : undefined,
            isAvailable: data.isAvailable !== undefined ? (data.isAvailable ? 1 : 0) : undefined,
            updatedAt: new Date()
        })
            .where(eq(menuItems.id, id))
            .returning();
        if (!item)
            throw new Error("Menu item not found");
        return item;
    }
    async deleteMenuItem(id) {
        await db.delete(menuItems).where(eq(menuItems.id, id));
    }
    async createOrder(data) {
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
            await db.insert(orderItems).values(data.items.map(item => ({
                orderId: order.id,
                menuItemId: item.menuItemId,
                name: item.name,
                price: item.price,
                quantity: item.quantity,
                extras: item.extras ? JSON.stringify(item.extras) : null,
                specialInstructions: item.specialInstructions,
            })));
        }
        return order;
    }
    async getOrderById(id) {
        const [order] = await db.select().from(orders).where(eq(orders.id, id));
        if (!order)
            return null;
        const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
        let rider = null;
        if (order.riderId) {
            const [r] = await db.select({ id: users.id, name: users.name }).from(users).where(eq(users.id, order.riderId));
            rider = r ?? null;
        }
        return { ...order, items, rider };
    }
    async getOrdersByUser(userId) {
        const userOrders = await db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
        const result = await Promise.all(userOrders.map(async (order) => {
            const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
            return { ...order, items };
        }));
        return result;
    }
    async getAllOrders() {
        const allOrders = await db.select().from(orders).orderBy(desc(orders.createdAt));
        const result = await Promise.all(allOrders.map(async (order) => {
            const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
            const [customer] = await db.select().from(users).where(eq(users.id, order.userId));
            let rider = null;
            if (order.riderId) {
                const [r] = await db.select().from(users).where(eq(users.id, order.riderId));
                rider = r ?? null;
            }
            return { ...order, items, customer, rider };
        }));
        return result;
    }
    async getRiderOrders(riderId) {
        const riderOrders = await db.select().from(orders).where(eq(orders.riderId, riderId)).orderBy(desc(orders.createdAt));
        const result = await Promise.all(riderOrders.map(async (order) => {
            const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
            const [customer] = await db.select().from(users).where(eq(users.id, order.userId));
            return { ...order, items, customer };
        }));
        return result;
    }
    async updateOrderStatus(id, status) {
        const [order] = await db.update(orders)
            .set({ status, updatedAt: new Date() })
            .where(eq(orders.id, id))
            .returning();
        return order;
    }
    async updatePaymentStatus(id, status, transactionId) {
        const [order] = await db.update(orders)
            .set({ paymentStatus: status, transactionId: transactionId ?? null, updatedAt: new Date() })
            .where(eq(orders.id, id))
            .returning();
        return order;
    }
    async updateMenuItemImage(id, imageUrl) {
        const [item] = await db.update(menuItems)
            .set({ imageUrl, updatedAt: new Date() })
            .where(eq(menuItems.id, id))
            .returning();
        return item;
    }
    async updateUserProfile(id, data) {
        const updates = {};
        if (data.name !== undefined)
            updates.name = data.name;
        if (data.phone !== undefined)
            updates.phone = data.phone;
        if (data.address !== undefined)
            updates.address = data.address;
        if (Object.keys(updates).length === 0) {
            return this.getUserById(id);
        }
        const [user] = await db.update(users).set(updates).where(eq(users.id, id)).returning();
        return user ?? null;
    }
    async assignRider(orderId, riderId) {
        const [order] = await db.update(orders)
            .set({ riderId, status: "assigned", updatedAt: new Date() })
            .where(eq(orders.id, orderId))
            .returning();
        return order;
    }
    async updateRiderLocation(orderId, lat, lng) {
        const [order] = await db.update(orders)
            .set({ riderLat: lat, riderLng: lng, updatedAt: new Date() })
            .where(eq(orders.id, orderId))
            .returning();
        return order;
    }
    async updateCustomerLocation(orderId, lat, lng) {
        const [order] = await db.update(orders)
            .set({ customerLat: lat, customerLng: lng, updatedAt: new Date() })
            .where(eq(orders.id, orderId))
            .returning();
        return order;
    }
    async getAdminStats(days) {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffMs = cutoff.getTime();
        const allOrders = await db.select().from(orders);
        const recentOrders = allOrders.filter(o => {
            if (!o.createdAt || isNaN(o.createdAt.getTime()))
                return true; // include legacy orders with bad timestamps
            return o.createdAt.getTime() >= cutoffMs;
        });
        // Aggregate by date
        const dailyStats = {};
        let totalRevenue = 0;
        recentOrders.forEach(order => {
            const ts = (order.createdAt && !isNaN(order.createdAt.getTime())) ? order.createdAt : new Date();
            const date = ts.toISOString().split('T')[0];
            const amount = parseFloat(order.total);
            totalRevenue += amount;
            if (!dailyStats[date])
                dailyStats[date] = { revenue: 0, orders: 0 };
            dailyStats[date].revenue += amount;
            dailyStats[date].orders += 1;
        });
        const revenue = Object.entries(dailyStats).map(([date, stats]) => ({ date, amount: stats.revenue }));
        const orderData = Object.entries(dailyStats).map(([date, stats]) => ({ date, count: stats.orders }));
        // Popular items
        const allOrderItems = await db.select().from(orderItems);
        const itemCounts = {};
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
    calculatePeakHours(allOrders) {
        const hours = {};
        for (let i = 0; i < 24; i++)
            hours[i] = 0;
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
    calculateUserSegments(allOrders, allCustomers) {
        const segments = {
            "New Customers": 0,
            "Returning Customers": 0,
            "VIP Customers": 0
        };
        const userStats = {};
        allOrders.forEach(o => {
            userStats[o.userId] = (userStats[o.userId] || 0) + 1;
        });
        allCustomers.forEach(u => {
            const count = userStats[u.id] || 0;
            if (count === 0)
                return;
            if (count === 1)
                segments["New Customers"]++;
            else if (count < 5)
                segments["Returning Customers"]++;
            else
                segments["VIP Customers"]++;
        });
        return Object.entries(segments).map(([name, value]) => ({ name, value }));
    }
    async getAdminUsers() {
        const fetchedUsers = await db.select().from(users);
        const filteredUsers = fetchedUsers.filter(u => u.role === "customer" || u.role === "rider");
        const result = await Promise.all(filteredUsers.map(async (user) => {
            const userOrders = await db.select().from(orders).where(eq(orders.userId, user.id));
            const totalSpend = userOrders.reduce((sum, o) => sum + parseFloat(o.total), 0);
            return {
                ...user,
                totalSpend,
                orderCount: userOrders.length,
            };
        }));
        return result.sort((a, b) => b.totalSpend - a.totalSpend);
    }
}
export const storage = new Storage();
