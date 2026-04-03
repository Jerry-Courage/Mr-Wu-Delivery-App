const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";
const MODEL = "openrouter/auto";

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

async function chat(messages: Message[]): Promise<string> {
  if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY not set");

  const res = await fetch(BASE_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://mrwus.delivery",
      "X-Title": "Mr Wu's Delivery",
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenRouter error: ${err}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export interface RecommendationItem {
  id: string;
  name: string;
  reason: string;
  confidence: number;
}

export async function getRecommendations(
  menuItems: { id: number; name: string; category: string; price: string; tags: string[] | null }[],
  recentOrders: { items: { name: string }[] }[],
  timeOfDay: "morning" | "afternoon" | "evening" | "night"
): Promise<RecommendationItem[]> {
  const menuText = menuItems
    .map(i => `ID:${i.id} "${i.name}" (${i.category}, $${i.price}${i.tags?.length ? ", " + i.tags.join("/") : ""})`)
    .join("\n");

  const historyText = recentOrders.length > 0
    ? recentOrders
        .slice(0, 3)
        .map(o => o.items.map(i => i.name).join(", "))
        .join(" | ")
    : "No previous orders";

  const prompt = `You are an AI food recommender for Mr Wu's Chinese delivery restaurant.

Menu:
${menuText}

Customer's recent orders: ${historyText}
Time of day: ${timeOfDay}

Based on the menu, order history, and time of day, pick the 4 best items to recommend. 
Respond with valid JSON only, no markdown, no explanation:
[{"id":"1","name":"General Tso's Chicken","reason":"Your top rated pick","confidence":0.95},...]`;

  const response = await chat([
    { role: "system", content: "You are a food recommendation AI. Always respond with valid JSON arrays only." },
    { role: "user", content: prompt },
  ]);

  try {
    const cleaned = response.trim().replace(/^```json\n?|```$/g, "");
    return JSON.parse(cleaned);
  } catch {
    return menuItems.slice(0, 4).map(i => ({
      id: String(i.id),
      name: i.name,
      reason: "Popular choice",
      confidence: 0.8,
    }));
  }
}

export async function getOrderETA(
  status: string,
  createdAt: Date,
  itemCount: number
): Promise<{ minutes: number; message: string }> {
  const minutesSinceOrder = Math.floor((Date.now() - createdAt.getTime()) / 60000);

  const prompt = `You are an AI delivery time estimator for a Chinese restaurant.

Order details:
- Current status: ${status}
- Minutes since order was placed: ${minutesSinceOrder}
- Number of items: ${itemCount}

Based on the status and elapsed time, estimate the remaining delivery time in minutes and give a short friendly message.
Respond with valid JSON only: {"minutes":15,"message":"Your food is being prepared! Almost there."}`;

  const response = await chat([
    { role: "system", content: "You are a delivery ETA AI. Respond with valid JSON only." },
    { role: "user", content: prompt },
  ]);

  try {
    const cleaned = response.trim().replace(/^```json\n?|```$/g, "");
    return JSON.parse(cleaned);
  } catch {
    const fallbacks: Record<string, { minutes: number; message: string }> = {
      pending: { minutes: 35, message: "Order received! Kitchen will start soon." },
      confirmed: { minutes: 28, message: "Kitchen confirmed your order!" },
      preparing: { minutes: 20, message: "Your food is being cooked fresh!" },
      ready: { minutes: 12, message: "Food is ready, waiting for pickup!" },
      assigned: { minutes: 10, message: "Rider is on the way to the restaurant!" },
      picked_up: { minutes: 8, message: "Your food is out for delivery!" },
      delivered: { minutes: 0, message: "Order delivered. Enjoy your meal!" },
    };
    return fallbacks[status] ?? { minutes: 20, message: "On the way!" };
  }
}

export async function getKitchenSummary(
  orders: { id: number; status: string; createdAt: Date; items: { name: string; quantity: number }[] }[]
): Promise<string> {
  if (orders.length === 0) return "No active orders right now. Enjoy the quiet!";

  const filteredOrders = orders.filter(o => o && !["delivered", "cancelled"].includes(o.status)).slice(0, 10);
  if (filteredOrders.length === 0) return "No active orders to report. Great time to prep for the next rush!";

  const ordersText = filteredOrders
    .map(o => {
      const createdDate = o.createdAt ? new Date(o.createdAt) : new Date();
      const age = Math.floor((Date.now() - createdDate.getTime()) / 60000);
      const items = (o.items || []).map(i => `${i.quantity || 1}× ${i.name || "Item"}`).join(", ");
      return `Order #${String(o.id || 0).padStart(5,"0")} [${o.status || "pending"}, ${age}min ago]: ${items || "No items listed"}`;
    })
    .join("\n");

  const prompt = `You are a smart kitchen assistant at Mr Wu's restaurant.

Active orders:
${ordersText}

Give a short, helpful 1-2 sentence kitchen briefing. Flag anything urgent (orders waiting >15 min), mention what to prioritize. Be concise and direct.`;

  const response = await chat([
    { role: "system", content: "You are a helpful kitchen operations assistant. Be brief and actionable." },
    { role: "user", content: prompt },
  ]);

  return response.trim() || "All orders looking good. Keep up the great work!";
}
export async function searchMenu(
  query: string,
  menuItems: { id: number; name: string; category: string; price: string; description: string; tags: string[] | null }[]
): Promise<{ message: string; itemIds: number[] }> {
  const menuText = menuItems
    .map(i => `ID:${i.id} "${i.name}" (${i.category}, $${i.price}) - ${i.description}${i.tags?.length ? " [" + i.tags.join(", ") + "]" : ""}`)
    .join("\n");

  const prompt = `You are a smart food assistant at Mr Wu's Chinese restaurant.

Available menu:
${menuText}

Customer query: "${query}"

Find the best matching items and write a short, friendly 1-2 sentence response. Return valid JSON only:
{"message":"Here are some great options for you!","itemIds":[1,3]}`;

  const response = await chat([
    { role: "system", content: "You are a helpful restaurant food assistant. Always respond with valid JSON only." },
    { role: "user", content: prompt },
  ]);

  try {
    const cleaned = response.trim().replace(/^```json\n?|```$/g, "");
    return JSON.parse(cleaned);
  } catch {
    return { message: "Here are some items you might enjoy!", itemIds: menuItems.slice(0, 3).map(i => i.id) };
  }
}

export async function getAdminInsights(
  stats: {
    revenue: { date: string; amount: number }[];
    orders: { date: string; count: number }[];
    popularItems: { name: string; count: number }[];
    totalRevenue: number;
    totalOrders: number;
  }
): Promise<string> {
  const popularText = stats.popularItems.map(i => `${i.name} (${i.count} sold)`).join(", ");
  const recentRevenue = stats.revenue.slice(-7).map(r => `$${r.amount}`).join(", ");

  const prompt = `You are a high-level business consultant for Mr Wu's Chinese Delivery.
  
  30-Day Performance Summary:
  - Total Revenue: $${stats.totalRevenue.toFixed(2)}
  - Total Orders: ${stats.totalOrders}
  - Popular Items: ${popularText}
  - Last 7 days revenue trend: ${recentRevenue}

  Provide a professional, actionable 2-3 sentence strategic insight. Focus on what's working, where to push (e.g. upsell popular items, address slow days), or potential menu adjustments. Be encouraging but data-driven.`;

  const response = await chat([
    { role: "system", content: "You are a strategic business analyst for a restaurant. Be concise and insightful." },
    { role: "user", content: prompt },
  ]);

  return response.trim() || "Performance is steady. Focus on maintaining quality and speed.";
}
