import "dotenv/config";
import express from "express";
import cors from "cors";
import { db } from "./db";
import { menuItems } from "../shared/schema";
import routes from "./routes";

const app = express();
const PORT = process.env.SERVER_PORT || 3001;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.use("/api", routes);

app.get("/api/health", (_req, res) => res.json({ ok: true }));

async function seedMenuItems() {
  const existing = await db.select().from(menuItems);
  if (existing.length > 0) return;

  await db.insert(menuItems).values([
    { name: "General Tso's Chicken", description: "Crispy chicken chunks tossed in a sweet and spicy glaze with peppers", price: "16.50", imageUrl: "/assets/general-tsos.jpg", calories: 840, tags: ["Spicy"], category: "Mains", rating: "4.8", reviews: 250, isTop: 1, isAvailable: 1 },
    { name: "Spicy Szechuan Beef", description: "Tender slices of premium beef wok-seared with Szechuan peppercorns and dried chilies", price: "14.50", imageUrl: "/assets/szechuan-beef.jpg", calories: 640, tags: ["Spicy"], category: "Mains", rating: "4.9", reviews: 250, isTop: 0, isAvailable: 1 },
    { name: "Golden Pork Dumplings", description: "Pan-seared dumplings filled with seasoned ground pork and chives", price: "8.95", imageUrl: "/assets/golden-pork.jpg", calories: 420, category: "Appetizers", isTop: 0, isAvailable: 1 },
    { name: "Peking Duck Bao", description: "Fluffy steamed bao buns with crispy duck and hoisin sauce", price: "12.50", imageUrl: "/assets/peking-duck.jpg", calories: 560, category: "Appetizers", isTop: 0, isAvailable: 1 },
    { name: "Sichuan Beef Noodles", description: "Hand-pulled wheat noodles in a rich, numbing beef broth", price: "15.50", imageUrl: "/assets/sichuan-noodles.jpg", calories: 920, tags: ["Spicy"], category: "Mains", isTop: 0, isAvailable: 1 },
    { name: "Mr Wu's Family Combo", description: "2 Mains, 2 Appetizers, and Large Rice. Perfect for 3-4 people.", price: "45.00", imageUrl: "/assets/family-combo.jpg", category: "Combos", isTop: 1, isAvailable: 1 },
    { name: "Mapo Tofu (Silken)", description: "Soft tofu cubes set in a spicy sauce with fermented black beans", price: "12.00", imageUrl: "/assets/mapo-tofu.jpg", calories: 580, tags: ["Spicy", "Veg"], category: "Mains", isTop: 0, isAvailable: 1 },
    { name: "Crispy Spring Rolls", description: "Golden fried spring rolls with vegetable filling", price: "5.95", imageUrl: "/assets/spring-rolls.jpg", calories: 320, category: "Appetizers", isTop: 0, isAvailable: 1 },
    { name: "Pork Soup Dumplings (6pcs)", description: "Traditional ginger vinegar steamed xiaolongbao", price: "19.80", imageUrl: "/assets/soup-dumplings.jpg", calories: 480, category: "Appetizers", isTop: 0, isAvailable: 1 },
    { name: "Whole Peking Duck", description: "Roasted whole duck with crispy skin, pancakes, and condiments", price: "52.00", imageUrl: "/assets/whole-peking-duck.jpg", calories: 1200, category: "Mains", isTop: 1, isAvailable: 1 },
  ]);
  console.log("Menu items seeded");
}

app.listen(PORT, async () => {
  console.log(`Backend running on http://localhost:${PORT}`);
  try {
    await seedMenuItems();
  } catch (err) {
    console.error("Seed error:", err);
  }
});
