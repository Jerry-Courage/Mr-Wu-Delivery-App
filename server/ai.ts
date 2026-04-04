const BASE_URL = "https://openrouter.ai/api/v1/chat/completions";

const MODELS = [
  "openrouter/auto",
  "google/gemini-2.0-flash-lite-preview-02-05:free",
  "google/gemma-3-4b-it:free",
  "meta-llama/llama-3.2-11b-vision-instruct:free",
  "deepseek/deepseek-chat:free",
  "qwen/qwen2.5-7b-instruct:free",
  "mistralai/mistral-7b-instruct:free",
];

// Track rate-limited models with a cooldown timestamp
const rateLimitedUntil: Record<string, number> = {};
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

function getKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    console.error("### AI_ERROR: OPENROUTER_API_KEY is not set in the environment!");
    throw new Error("OPENROUTER_API_KEY not set");
  }
  return key;
}

function getAvailableModels(): string[] {
  const now = Date.now();
  return MODELS.filter(m => !rateLimitedUntil[m] || rateLimitedUntil[m] < now);
}

async function chat(messages: Message[]): Promise<string> {
  const key = getKey();

  const sanitizedMessages = messages.map(msg => ({
    ...msg,
    content: msg.content.length > 4000 ? msg.content.substring(0, 4000) + "..." : msg.content,
  }));

  let lastError: any = null;
  const available = getAvailableModels();

  if (available.length === 0) {
    // All models are rate-limited — clear cooldowns and try again from the top
    Object.keys(rateLimitedUntil).forEach(k => delete rateLimitedUntil[k]);
    available.push(...MODELS);
  }

  for (const modelId of available) {
    try {
      console.log(`### AI Request (${modelId})`);
      const res = await fetch(BASE_URL, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "https://mrwus.app",
          "X-Title": "Mr Wu's Delivery App",
        },
        body: JSON.stringify({
          model: modelId,
          messages: sanitizedMessages,
          max_tokens: 150,
          temperature: 0.7,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        const status = res.status;
        console.warn(`### AI ${modelId} failed (${status}): ${errText.slice(0, 200)}`);

        // Rate limited — put this model in cooldown and move to next
        if (status === 429 || status === 402) {
          rateLimitedUntil[modelId] = Date.now() + COOLDOWN_MS;
          console.log(`### Model ${modelId} rate-limited, cooling down for 10min`);
          lastError = new Error(`Rate limited on ${modelId}`);
          continue;
        }

        // For other errors (404, 5xx) just skip this model
        lastError = new Error(`Error ${status} on ${modelId}`);
        continue;
      }

      const data = await res.json() as any;
      const content = data.choices?.[0]?.message?.content;
      if (content) {
        console.log(`### AI success via ${modelId}`);
        return content;
      }

      lastError = new Error(`Empty response from ${modelId}`);
    } catch (err: any) {
      console.warn(`### AI ${modelId} network error:`, err.message);
      lastError = err;
      continue;
    }
  }

  const errorMessage = lastError ? lastError.message : "All AI models failed";
  console.error(`### AI_FATAL: ${errorMessage}`);
  throw lastError || new Error("All AI models failed");
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
    ? recentOrders.slice(0, 3).map(o => o.items.map(i => i.name).join(", ")).join(" | ")
    : "No previous orders";

  const prompt = `Menu:
${menuText}
Orders: ${historyText}
Time: ${timeOfDay}
Respond with 4 best JSON recommendations only: [{"id":"1","name":"Item","reason":"reason","confidence":0.95}]`;

  const response = await chat([
    { role: "system", content: "You are a food recommender. Respond with JSON arrays only." },
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
Order: status="${status}", placed ${minutesSinceOrder} min ago, ${itemCount} items.
Estimate remaining delivery time. Respond with valid JSON only: {"minutes":15,"message":"Your food is being prepared!"}`;

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

  const filtered = orders.filter(o => o && !["delivered", "cancelled"].includes(o.status)).slice(0, 10);
  if (filtered.length === 0) return "No active orders to report. Great time to prep for the next rush!";

  const ordersText = filtered.map(o => {
    const age = Math.floor((Date.now() - new Date(o.createdAt).getTime()) / 60000);
    const items = (o.items || []).map(i => `${i.quantity}× ${i.name}`).join(", ");
    return `Order #${String(o.id).padStart(5, "0")} [${o.status}, ${age}min ago]: ${items}`;
  }).join("\n");

  const prompt = `Kitchen assistant at Mr Wu's. Active orders:\n${ordersText}\nGive a 1-2 sentence briefing. Flag orders waiting >15 min. Be concise.`;

  const response = await chat([
    { role: "system", content: "You are a kitchen operations assistant. Be brief and actionable." },
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

  const prompt = `Menu:\n${menuText}\nQuery: "${query}"\nRespond with best matches as valid JSON only: {"message":"Msg","itemIds":[1,3]}`;

  const response = await chat([
    { role: "system", content: "You are a restaurant assistant. Always respond with valid JSON only." },
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

  const prompt = `Business consultant for Mr Wu's Chinese Delivery.
30-Day: Revenue=$${stats.totalRevenue.toFixed(2)}, Orders=${stats.totalOrders}, Top items: ${popularText}, Last 7 days revenue: ${recentRevenue}.
Give a professional 2-3 sentence strategic insight.`;

  const response = await chat([
    { role: "system", content: "You are a strategic business analyst for a restaurant. Be concise and insightful." },
    { role: "user", content: prompt },
  ]);

  return response.trim() || "Performance is steady. Focus on maintaining quality and speed.";
}

export async function getSupportResponse(
  userQuery: string,
  history: Message[] = []
): Promise<string> {
  const systemPrompt = `You are Mr Wu's AI Support Assistant. Friendly, helpful, professional.
You help with: menu questions (premium Chinese cuisine), delivery (30-45 min), refunds (via Orders screen), technical issues.
Keep responses concise. Unknown issues → contact support@mrwu.com.`;

  const messages: Message[] = [
    { role: "system", content: systemPrompt },
    ...history,
    { role: "user", content: userQuery },
  ];

  return chat(messages);
}
