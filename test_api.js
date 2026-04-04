async function test() {
  try {
    // AI Search Test
    console.log("Testing AI Search...");
    const searchRes = await fetch("http://localhost:3001/api/ai/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: "spicy chicken" })
    });
    const searchResult = await searchRes.json();
    console.log(`Search Result: ${JSON.stringify(searchResult, null, 2)}`);

    // AI Insights Test (Admin)
    console.log("Logging in as Admin for insights...");
    const loginRes = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "admin@mrwu.com", password: "mrwu-admin-2025" })
    });
    const { token } = await loginRes.json();

    console.log("Getting Admin Insights...");
    const insightsRes = await fetch("http://localhost:3001/api/ai/admin-insights", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ days: 30 })
    });
    const insights = await insightsRes.json();
    console.log(`Admin Insights: ${JSON.stringify(insights, null, 2)}`);

  } catch (err) {
    console.error("Test Error:", err);
  }
}
test();
