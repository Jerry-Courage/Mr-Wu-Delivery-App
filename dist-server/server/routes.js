import { Router } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { storage } from "./storage";
import { z } from "zod";
import { getRecommendations, getOrderETA, getKitchenSummary, getAdminInsights, searchMenu, getSupportResponse } from "./ai";
import { io } from "./index";
import multer from "multer";
import path from "path";
const storageConfig = multer.diskStorage({
    destination: "public/uploads",
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
    },
});
const upload = multer({
    storage: storageConfig,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (_req, file, cb) => {
        const allowed = ["image/jpeg", "image/png", "image/webp"];
        if (allowed.includes(file.mimetype))
            cb(null, true);
        else
            cb(new Error("Invalid file type. Only JPEG, PNG and WEBP are allowed."));
    }
});
const aiLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: "Too many AI requests, please try again in a minute." },
});
const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "mrwus-secret-key-change-in-production";
function auth(req, res, next) {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
        return res.status(401).json({ error: "Unauthorized" });
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch {
        res.status(401).json({ error: "Invalid token" });
    }
}
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        next();
    };
}
// ─── Auth ────────────────────────────────────────────────────────────────────
const registerSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    phone: z.string().optional(),
    role: z.enum(["customer", "kitchen", "rider", "admin"]).optional(),
    address: z.string().optional(),
    adminSecret: z.string().optional(),
});
router.post("/auth/register", async (req, res) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ error: result.error.flatten() });
    const { role, adminSecret, email } = result.data;
    const lowerEmail = email.toLowerCase();
    // Role-based protection: Only Customers and Riders can register publicly
    if (role === "admin" || role === "kitchen") {
        return res.status(403).json({ error: "Administrative accounts must be created by the Super Admin" });
    }
    // Prevent hijacking the Super Admin email
    if (lowerEmail === "admin@mrwu.com") {
        return res.status(403).json({ error: "Unauthorized email address" });
    }
    // Riders and Customers are public (No secret required)
    const existing = await storage.getUserByEmail(email);
    if (existing)
        return res.status(409).json({ error: "Email already in use" });
    const user = await storage.createUser(result.data);
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, address: user.address } });
});
router.post("/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password)
        return res.status(400).json({ error: "Email and password required" });
    const user = await storage.getUserByEmail(email);
    if (!user)
        return res.status(401).json({ error: "Invalid credentials" });
    const valid = await storage.validatePassword(user, password);
    if (!valid)
        return res.status(401).json({ error: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, address: user.address } });
});
router.get("/auth/me", auth, async (req, res) => {
    const user = await storage.getUserById(req.user.id);
    if (!user)
        return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, address: user.address });
});
router.patch("/auth/profile", auth, async (req, res) => {
    const { name, phone, address } = req.body;
    const user = await storage.updateUserProfile(req.user.id, { name, phone, address });
    if (!user)
        return res.status(404).json({ error: "User not found" });
    res.json({ id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, address: user.address });
});
// ─── Menu ────────────────────────────────────────────────────────────────────
router.get("/menu", async (_req, res) => {
    const items = await storage.getMenuItems();
    res.json(items);
});
router.get("/menu/:id", async (req, res) => {
    const item = await storage.getMenuItem(Number(req.params.id));
    if (!item)
        return res.status(404).json({ error: "Not found" });
    res.json(item);
});
router.patch("/admin/menu-items/:id/image", auth, requireRole("kitchen"), async (req, res) => {
    const { imageUrl } = req.body;
    if (!imageUrl)
        return res.status(400).json({ error: "imageUrl required" });
    const item = await storage.updateMenuItemImage(Number(req.params.id), imageUrl);
    res.json(item);
});
router.post("/upload", auth, requireRole("admin", "kitchen"), upload.single("image"), (req, res) => {
    if (!req.file)
        return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: `/uploads/${req.file.filename}` });
});
// ─── Orders (Customer) ───────────────────────────────────────────────────────
const createOrderSchema = z.object({
    deliveryAddress: z.string().min(1),
    subtotal: z.string(),
    deliveryFee: z.string(),
    tax: z.string(),
    tip: z.string(),
    total: z.string(),
    paymentMethod: z.string(),
    notes: z.string().optional(),
    items: z.array(z.object({
        menuItemId: z.number().optional(),
        name: z.string(),
        price: z.string(),
        quantity: z.number().min(1),
        extras: z.array(z.string()).optional(),
        specialInstructions: z.string().optional(),
    })).min(1),
});
router.post("/orders", auth, requireRole("customer"), async (req, res) => {
    const result = createOrderSchema.safeParse(req.body);
    if (!result.success)
        return res.status(400).json({ error: result.error.flatten() });
    const order = await storage.createOrder({ userId: req.user.id, ...result.data });
    // Notify kitchen of new order
    io.to("kitchen").emit("new_order", { orderId: order.id, customerName: req.user.email });
    res.status(201).json(order);
});
router.get("/orders/my", auth, requireRole("customer"), async (req, res) => {
    const userOrders = await storage.getOrdersByUser(req.user.id);
    res.json(userOrders);
});
router.get("/orders/:id", auth, async (req, res) => {
    const order = await storage.getOrderById(Number(req.params.id));
    if (!order)
        return res.status(404).json({ error: "Not found" });
    if (req.user.role === "customer" && order.userId !== req.user.id) {
        return res.status(403).json({ error: "Forbidden" });
    }
    res.json(order);
});
router.patch("/orders/:id/location", auth, requireRole("rider", "admin"), async (req, res) => {
    const { lat, lng } = req.body;
    if (typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ error: "Invalid coordinates" });
    }
    const order = await storage.updateRiderLocation(Number(req.params.id), lat, lng);
    // Broadcast location to anyone tracking this order
    io.to(`order:${order.id}`).emit("rider:location_updated", { lat, lng });
    res.json(order);
});
router.patch("/orders/:id/customer-location", auth, async (req, res) => {
    const { lat, lng } = req.body;
    if (typeof lat !== "number" || typeof lng !== "number") {
        return res.status(400).json({ error: "Invalid coordinates" });
    }
    const order = await storage.updateCustomerLocation(Number(req.params.id), lat, lng);
    res.json(order);
});
// ─── Payments (Paystack) ─────────────────────────────────────────────────────
router.get("/payments/config", (_req, res) => {
    res.json({ publicKey: process.env.PAYSTACK_PUBLIC_KEY || "" });
});
router.post("/payments/initialize", auth, async (req, res) => {
    const { orderId, email, amount } = req.body;
    if (!orderId || !email || !amount) {
        return res.status(400).json({ error: "orderId, email, and amount required" });
    }
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
        return res.status(500).json({ error: "Paystack not configured" });
    }
    // Amount in pesewas (GHS) — multiply by 100
    const amountInPesewas = Math.round(parseFloat(amount) * 100);
    try {
        const response = await fetch("https://api.paystack.co/transaction/initialize", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email,
                amount: amountInPesewas,
                currency: "GHS",
                metadata: { orderId, custom_fields: [{ display_name: "Order ID", variable_name: "order_id", value: String(orderId) }] },
            }),
        });
        if (!response.ok) {
            // Fallback for development if Paystack API is unreachable or keys are invalid
            console.warn("Paystack API error - using development fallback");
            return res.json({ accessCode: "dev_access_code", reference: `dev_ref_${Date.now()}` });
        }
        const data = await response.json();
        if (!data.status || !data.data) {
            return res.status(400).json({ error: "Paystack initialization failed" });
        }
        res.json({ accessCode: data.data.access_code, reference: data.data.reference });
    }
    catch (err) {
        console.warn("Paystack init fetch failed - using development fallback:", err);
        // Fallback for development to allow testing without real internet/keys
        res.json({ accessCode: "dev_access_code", reference: `dev_ref_${Date.now()}` });
    }
});
router.post("/payments/verify", auth, async (req, res) => {
    const { reference, orderId } = req.body;
    if (!reference || !orderId) {
        return res.status(400).json({ error: "reference and orderId required" });
    }
    const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
    if (!PAYSTACK_SECRET_KEY) {
        return res.status(500).json({ error: "Paystack not configured" });
    }
    try {
        const response = await fetch(`https://api.paystack.co/transaction/verify/${reference}`, {
            headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` },
        });
        const data = await response.json();
        if (!data.status || data.data?.status !== "success") {
            return res.status(400).json({ error: "Payment verification failed" });
        }
        const order = await storage.updatePaymentStatus(Number(orderId), "completed", reference);
        res.json({ success: true, reference, order });
    }
    catch (err) {
        console.error("Paystack verify error:", err);
        res.status(500).json({ error: "Payment verification failed" });
    }
});
// ─── Orders (Kitchen / Management) ──────────────────────────────────────────
router.get("/management/orders", auth, requireRole("kitchen"), async (_req, res) => {
    const allOrders = await storage.getAllOrders();
    res.json(allOrders);
});
router.patch("/management/orders/:id/status", auth, requireRole("kitchen"), async (req, res) => {
    const { status } = req.body;
    const validStatuses = ["pending", "confirmed", "preparing", "ready", "assigned", "picked_up", "delivered", "cancelled"];
    if (!validStatuses.includes(status))
        return res.status(400).json({ error: "Invalid status" });
    const order = await storage.updateOrderStatus(Number(req.params.id), status);
    // Notify customer of status update
    io.to(`user:${order.userId}`).emit("order_status", { orderId: order.id, status });
    res.json(order);
});
router.patch("/management/orders/:id/assign", auth, requireRole("kitchen"), async (req, res) => {
    const { riderId } = req.body;
    if (!riderId)
        return res.status(400).json({ error: "riderId required" });
    const order = await storage.assignRider(Number(req.params.id), Number(riderId));
    // Notify rider
    io.to(`rider:${riderId}`).emit("order_assigned", { orderId: order.id });
    // Notify customer
    io.to(`user:${order.userId}`).emit("order_status", { orderId: order.id, status: "assigned" });
    res.json(order);
});
router.get("/management/riders", auth, requireRole("kitchen"), async (_req, res) => {
    const riders = await storage.getAllRiders();
    res.json(riders.map(r => ({ id: r.id, name: r.name, email: r.email, phone: r.phone })));
});
// ─── Orders (Rider) ──────────────────────────────────────────────────────────
router.get("/rider/orders", auth, requireRole("rider"), async (req, res) => {
    const riderOrders = await storage.getRiderOrders(req.user.id);
    res.json(riderOrders);
});
router.patch("/rider/orders/:id/status", auth, requireRole("rider"), async (req, res) => {
    const { status } = req.body;
    const allowedStatuses = ["picked_up", "delivered"];
    if (!allowedStatuses.includes(status))
        return res.status(400).json({ error: "Invalid status for rider" });
    const order = await storage.getOrderById(Number(req.params.id));
    if (!order)
        return res.status(404).json({ error: "Order not found" });
    if (order.riderId !== req.user.id)
        return res.status(403).json({ error: "Not your order" });
    const updated = await storage.updateOrderStatus(Number(req.params.id), status);
    // Notify customer
    io.to(`user:${updated.userId}`).emit("order_status", { orderId: updated.id, status });
    res.json(updated);
});
// ─── AI ──────────────────────────────────────────────────────────────────────
router.get("/ai/recommendations", aiLimiter, async (req, res) => {
    try {
        const menuItems = await storage.getMenuItems();
        const recentOrders = req.headers.authorization
            ? await (async () => {
                const token = req.headers.authorization?.split(" ")[1];
                if (!token)
                    return [];
                try {
                    const decoded = jwt.verify(token, JWT_SECRET);
                    return await storage.getOrdersByUser(decoded.id);
                }
                catch {
                    return [];
                }
            })()
            : [];
        const hour = new Date().getHours();
        const timeOfDay = hour < 11 ? "morning" : hour < 15 ? "afternoon" : hour < 21 ? "evening" : "night";
        const simplified = menuItems.map(m => ({
            id: m.id,
            name: m.name,
            category: m.category,
            price: m.price,
            tags: m.tags ? JSON.parse(m.tags) : [],
        }));
        const recs = await getRecommendations(simplified, recentOrders, timeOfDay);
        res.json(recs);
    }
    catch (err) {
        console.error("AI recommendations error:", err);
        // Return empty array instead of 500
        res.json([]);
    }
});
router.get("/ai/eta/:orderId", aiLimiter, auth, async (req, res) => {
    try {
        const order = await storage.getOrderById(Number(req.params.orderId));
        if (!order)
            return res.status(404).json({ error: "Order not found" });
        if (req.user.role === "customer" && order.userId !== req.user.id) {
            return res.status(403).json({ error: "Forbidden" });
        }
        const eta = await getOrderETA(order.status, new Date(order.createdAt), order.items.length);
        res.json(eta);
    }
    catch (err) {
        console.error("AI ETA error:", err);
        res.json({ eta: "Usually ready in 15-20 min", details: "AI service temporarily unavailable" });
    }
});
router.get("/ai/kitchen-summary", aiLimiter, auth, requireRole("kitchen"), async (_req, res) => {
    try {
        const allOrders = await storage.getAllOrders();
        const simplified = allOrders.map(o => ({
            id: o.id,
            status: o.status,
            createdAt: new Date(o.createdAt),
            items: o.items.map(i => ({ name: i.name, quantity: i.quantity })),
        }));
        const summary = await getKitchenSummary(simplified);
        res.json({ summary });
    }
    catch (err) {
        console.error("AI kitchen summary error:", err);
        res.json({ summary: "Kitchen is busy, but running smoothly. Check new orders frequently." });
    }
});
// ─── Admin Management ────────────────────────────────────────────────────────
router.get("/admin/stats", auth, requireRole("admin"), async (req, res) => {
    const days = Number(req.query.days) || 30;
    const stats = await storage.getAdminStats(days);
    res.json(stats);
});
router.get("/admin/menu-items", auth, requireRole("admin", "kitchen"), async (_req, res) => {
    const items = await storage.getMenuItems(true); // Include unavailable
    res.json(items);
});
router.post("/admin/menu-items", auth, requireRole("admin"), async (req, res) => {
    const item = await storage.createMenuItem(req.body);
    res.status(201).json(item);
});
router.patch("/admin/menu-items/:id", auth, requireRole("admin", "kitchen"), async (req, res) => {
    const item = await storage.updateMenuItem(Number(req.params.id), req.body);
    res.json(item);
});
router.delete("/admin/menu-items/:id", auth, requireRole("admin"), async (req, res) => {
    await storage.deleteMenuItem(Number(req.params.id));
    res.sendStatus(204);
});
router.post("/ai/search", aiLimiter, async (req, res) => {
    try {
        const { query } = req.body;
        if (!query || typeof query !== "string" || query.trim().length === 0) {
            return res.status(400).json({ error: "query is required" });
        }
        const items = await storage.getMenuItems();
        const simplified = items.map(m => ({
            id: m.id,
            name: m.name,
            category: m.category,
            price: m.price,
            description: m.description,
            tags: m.tags ? JSON.parse(m.tags) : [],
        }));
        try {
            const result = await searchMenu(query.trim(), simplified);
            const matchedItems = items.filter(i => result.itemIds.includes(i.id));
            res.json({ message: result.message, items: matchedItems });
        }
        catch {
            // Fallback: simple text search when AI is unavailable
            const q = query.trim().toLowerCase();
            const matchedItems = items.filter(i => {
                const tagsStr = i.tags ? i.tags.toLowerCase() : "";
                return (i.name.toLowerCase().includes(q) ||
                    (i.description && i.description.toLowerCase().includes(q)) ||
                    (i.category && i.category.toLowerCase().includes(q)) ||
                    tagsStr.includes(q));
            });
            res.json({
                message: matchedItems.length > 0
                    ? `Found ${matchedItems.length} item(s) matching "${query}".`
                    : `No items found for "${query}". Try browsing the full menu!`,
                items: matchedItems,
            });
        }
    }
    catch (err) {
        console.error("AI search error:", err);
        res.status(500).json({ error: "Search unavailable, please try again." });
    }
});
router.post("/ai/support", aiLimiter, async (req, res) => {
    try {
        const { message, history } = req.body;
        if (!message || typeof message !== "string") {
            return res.status(400).json({ error: "message is required" });
        }
        const reply = await getSupportResponse(message, history || []);
        res.json({ reply });
    }
    catch (err) {
        console.error("AI support error:", err);
        res.json({ reply: "I'm here to help! Please contact us at support@mrwu.com or call our hotline for urgent issues." });
    }
});
router.post("/ai/admin-insights", aiLimiter, auth, requireRole("admin"), async (req, res) => {
    try {
        const days = Number(req.body.days) || 30;
        const stats = await storage.getAdminStats(days);
        try {
            const insights = await getAdminInsights(stats);
            res.json({ insights });
        }
        catch {
            res.json({
                insights: `Over the past ${days} days, the restaurant recorded ${stats.totalOrders} orders totalling $${stats.totalRevenue.toFixed(2)}. ${stats.popularItems.length > 0 ? `Top seller: ${stats.popularItems[0].name} (${stats.popularItems[0].count} sold).` : ""} Focus on maintaining quality and delivery speed to sustain growth.`
            });
        }
    }
    catch (err) {
        console.error("Admin insights error:", err);
        res.status(500).json({ error: "Unable to load insights" });
    }
});
// ─── Staff Management (Admin Only) ──────────────────────────────────────────
router.get("/admin/staff", auth, requireRole("admin"), async (_req, res) => {
    const staff = await storage.getUsersByRole("kitchen");
    res.json(staff.map(s => ({ id: s.id, email: s.email, name: s.name, createdAt: s.createdAt })));
});
router.get("/admin/users", auth, requireRole("admin"), async (_req, res) => {
    const users = await storage.getAdminUsers();
    res.json(users);
});
router.post("/admin/staff", auth, requireRole("admin"), async (req, res) => {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
        return res.status(400).json({ error: "Email, password and name are required" });
    }
    const existing = await storage.getUserByEmail(email);
    if (existing)
        return res.status(409).json({ error: "Email already in use" });
    const user = await storage.createUser({ email, password, name, role: "kitchen" });
    res.status(201).json({ id: user.id, email: user.email, name: user.name, role: user.role });
});
router.delete("/admin/staff/:id", auth, requireRole("admin"), async (req, res) => {
    const idParams = req.params.id;
    const id = Number(idParams);
    console.log(`### ATTEMPTING DELETE STAFF: id=${id}, params=${idParams}`);
    if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid staff ID" });
    }
    const user = await storage.getUserById(id);
    if (!user) {
        console.log(`### DELETE STAFF FAILED: User ${id} not found in database`);
        return res.status(404).json({ error: "Staff member not found" });
    }
    if (user.role !== "kitchen") {
        console.log(`### DELETE STAFF FAILED: User ${id} is not kitchen staff (role=${user.role})`);
        return res.status(400).json({ error: "Can only remove kitchen staff" });
    }
    await storage.deleteUser(id);
    console.log(`### DELETE STAFF SUCCESS: User ${id} removed`);
    res.sendStatus(204);
});
// ─── Help & Support ──────────────────────────────────────────────────────────
router.post("/support/email", auth, async (req, res) => {
    const { subject, message } = req.body;
    if (!subject || !message)
        return res.status(400).json({ error: "subject and message are required" });
    // In a real app, we'd save this to a tickets table
    console.log(`### SUPPORT TICKET from ${req.user.email}: [${subject}] ${message}`);
    res.json({ success: true, message: "Support ticket received. We'll get back to you soon!" });
});
export default router;
