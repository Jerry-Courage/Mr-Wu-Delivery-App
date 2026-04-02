import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { z } from "zod";
import { getRecommendations, getOrderETA, getKitchenSummary } from "./ai";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "mrwus-secret-key-change-in-production";

interface AuthRequest extends Request {
  user?: { id: number; email: string; role: string };
}

function auth(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string; role: string };
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

function requireRole(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
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
  role: z.enum(["customer", "kitchen", "rider"]).optional(),
  address: z.string().optional(),
});

router.post("/auth/register", async (req, res) => {
  const result = registerSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const existing = await storage.getUserByEmail(result.data.email);
  if (existing) return res.status(409).json({ error: "Email already in use" });

  const user = await storage.createUser(result.data);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, address: user.address } });
});

router.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });

  const user = await storage.getUserByEmail(email);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = await storage.validatePassword(user, password);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, address: user.address } });
});

router.get("/auth/me", auth, async (req: AuthRequest, res) => {
  const user = await storage.getUserById(req.user!.id);
  if (!user) return res.status(404).json({ error: "User not found" });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, phone: user.phone, address: user.address });
});

// ─── Menu ────────────────────────────────────────────────────────────────────

router.get("/menu", async (_req, res) => {
  const items = await storage.getMenuItems();
  res.json(items);
});

router.get("/menu/:id", async (req, res) => {
  const item = await storage.getMenuItem(Number(req.params.id));
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
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

router.post("/orders", auth, requireRole("customer"), async (req: AuthRequest, res) => {
  const result = createOrderSchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const order = await storage.createOrder({ userId: req.user!.id, ...result.data });
  res.status(201).json(order);
});

router.get("/orders/my", auth, requireRole("customer"), async (req: AuthRequest, res) => {
  const userOrders = await storage.getOrdersByUser(req.user!.id);
  res.json(userOrders);
});

router.get("/orders/:id", auth, async (req: AuthRequest, res) => {
  const order = await storage.getOrderById(Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Not found" });

  if (req.user!.role === "customer" && order.userId !== req.user!.id) {
    return res.status(403).json({ error: "Forbidden" });
  }
  res.json(order);
});

// ─── Orders (Kitchen / Management) ──────────────────────────────────────────

router.get("/management/orders", auth, requireRole("kitchen"), async (_req, res) => {
  const allOrders = await storage.getAllOrders();
  res.json(allOrders);
});

router.patch("/management/orders/:id/status", auth, requireRole("kitchen"), async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["pending", "confirmed", "preparing", "ready", "assigned", "picked_up", "delivered", "cancelled"] as const;
  if (!validStatuses.includes(status)) return res.status(400).json({ error: "Invalid status" });
  const order = await storage.updateOrderStatus(Number(req.params.id), status);
  res.json(order);
});

router.patch("/management/orders/:id/assign", auth, requireRole("kitchen"), async (req, res) => {
  const { riderId } = req.body;
  if (!riderId) return res.status(400).json({ error: "riderId required" });
  const order = await storage.assignRider(Number(req.params.id), Number(riderId));
  res.json(order);
});

router.get("/management/riders", auth, requireRole("kitchen"), async (_req, res) => {
  const riders = await storage.getAllRiders();
  res.json(riders.map(r => ({ id: r.id, name: r.name, email: r.email, phone: r.phone })));
});

// ─── Orders (Rider) ──────────────────────────────────────────────────────────

router.get("/rider/orders", auth, requireRole("rider"), async (req: AuthRequest, res) => {
  const riderOrders = await storage.getRiderOrders(req.user!.id);
  res.json(riderOrders);
});

router.patch("/rider/orders/:id/status", auth, requireRole("rider"), async (req: AuthRequest, res) => {
  const { status } = req.body;
  const allowedStatuses = ["picked_up", "delivered"] as const;
  if (!allowedStatuses.includes(status)) return res.status(400).json({ error: "Invalid status for rider" });

  const order = await storage.getOrderById(Number(req.params.id));
  if (!order) return res.status(404).json({ error: "Order not found" });
  if (order.riderId !== req.user!.id) return res.status(403).json({ error: "Not your order" });

  const updated = await storage.updateOrderStatus(Number(req.params.id), status);
  res.json(updated);
});

// ─── AI ──────────────────────────────────────────────────────────────────────

router.get("/ai/recommendations", async (req: AuthRequest, res) => {
  try {
    const menuItems = await storage.getMenuItems();
    const recentOrders = req.headers.authorization
      ? await (async () => {
          const token = req.headers.authorization?.split(" ")[1];
          if (!token) return [];
          try {
            const decoded = jwt.verify(token, JWT_SECRET) as { id: number };
            return await storage.getOrdersByUser(decoded.id);
          } catch { return []; }
        })()
      : [];

    const hour = new Date().getHours();
    const timeOfDay =
      hour < 11 ? "morning" : hour < 15 ? "afternoon" : hour < 21 ? "evening" : "night";

    const simplified = menuItems.map(m => ({
      id: m.id,
      name: m.name,
      category: m.category,
      price: m.price,
      tags: m.tags,
    }));

    const recs = await getRecommendations(simplified, recentOrders, timeOfDay);
    res.json(recs);
  } catch (err) {
    console.error("AI recommendations error:", err);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

router.get("/ai/eta/:orderId", auth, async (req: AuthRequest, res) => {
  try {
    const order = await storage.getOrderById(Number(req.params.orderId));
    if (!order) return res.status(404).json({ error: "Order not found" });
    if (req.user!.role === "customer" && order.userId !== req.user!.id) {
      return res.status(403).json({ error: "Forbidden" });
    }
    const eta = await getOrderETA(order.status, new Date(order.createdAt), order.items.length);
    res.json(eta);
  } catch (err) {
    console.error("AI ETA error:", err);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

router.get("/ai/kitchen-summary", auth, requireRole("kitchen"), async (_req, res) => {
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
  } catch (err) {
    console.error("AI kitchen summary error:", err);
    res.status(500).json({ error: "AI service unavailable" });
  }
});

export default router;
