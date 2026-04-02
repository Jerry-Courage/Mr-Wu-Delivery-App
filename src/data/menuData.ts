import generalTsos from "@/assets/general-tsos.jpg";
import szechuanBeef from "@/assets/szechuan-beef.jpg";
import goldenPork from "@/assets/golden-pork.jpg";
import pekingDuck from "@/assets/peking-duck.jpg";
import sichuanNoodles from "@/assets/sichuan-noodles.jpg";
import familyCombo from "@/assets/family-combo.jpg";
import mapoTofu from "@/assets/mapo-tofu.jpg";
import springRolls from "@/assets/spring-rolls.jpg";
import soupDumplings from "@/assets/soup-dumplings.jpg";
import wholePekingDuck from "@/assets/whole-peking-duck.jpg";

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  calories?: number;
  tags?: string[];
  category: string;
  rating?: number;
  reviews?: number;
  isTop?: boolean;
  aiMatch?: number;
}

export const menuItems: MenuItem[] = [
  { id: "1", name: "General Tso's Chicken", description: "Crispy chicken chunks tossed in a sweet and spicy glaze with peppers", price: 16.50, image: generalTsos, calories: 840, tags: ["Spicy"], category: "Mains", rating: 4.8, reviews: 250, isTop: true },
  { id: "2", name: "Spicy Szechuan Beef", description: "Tender slices of premium beef wok-seared with Szechuan peppercorns and dried chilies", price: 14.50, image: szechuanBeef, calories: 640, tags: ["Spicy"], category: "Mains", rating: 4.9, reviews: 250 },
  { id: "3", name: "Golden Pork Dumplings", description: "Pan-seared dumplings filled with seasoned ground pork and chives", price: 8.95, image: goldenPork, calories: 420, category: "Appetizers" },
  { id: "4", name: "Peking Duck Bao", description: "Fluffy steamed bao buns with crispy duck and hoisin sauce", price: 12.50, image: pekingDuck, calories: 560, category: "Appetizers", aiMatch: 98 },
  { id: "5", name: "Sichuan Beef Noodles", description: "Hand-pulled wheat noodles in a rich, numbing beef broth", price: 15.50, image: sichuanNoodles, calories: 920, tags: ["Spicy"], category: "Mains" },
  { id: "6", name: "Mr Wu's Family Combo", description: "2 Mains, 2 Appetizers, and Large Rice. Perfect for 3-4 people.", price: 45.00, image: familyCombo, category: "Combos", isTop: true },
  { id: "7", name: "Mapo Tofu (Silken)", description: "Soft tofu cubes set in a spicy sauce with fermented black beans", price: 12.00, image: mapoTofu, calories: 580, tags: ["Spicy", "Veg"], category: "Mains" },
  { id: "8", name: "Crispy Spring Rolls", description: "Golden fried spring rolls with vegetable filling", price: 5.95, image: springRolls, calories: 320, category: "Appetizers" },
  { id: "9", name: "Pork Soup Dumplings (6pcs)", description: "Traditional ginger vinegar steamed xiaolongbao", price: 19.80, image: soupDumplings, calories: 480, category: "Appetizers" },
  { id: "10", name: "Whole Peking Duck", description: "Roasted whole duck with crispy skin, pancakes, and condiments", price: 52.00, image: wholePekingDuck, calories: 1200, category: "Mains", isTop: true },
];

export const categories = ["All", "Combos", "Appetizers", "Mains", "Sides", "Drinks"];
