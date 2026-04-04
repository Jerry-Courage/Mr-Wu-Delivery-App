async function test() {
  try {
    console.log("Testing AI Support Chat...");
    const res = await fetch("http://localhost:3001/api/ai/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: "How long does delivery take?",
        history: [] 
      })
    });
    const data = await res.json();
    console.log("AI Response Status:", res.status);
    console.log("AI Response Body:", JSON.stringify(data, null, 2));

    console.log("\nTesting Email Support Ticket...");
    // Need a token for this one
    const loginRes = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "test@example.com", password: "password123" })
    });
    const { token } = await loginRes.json();

    const emailRes = await fetch("http://localhost:3001/api/support/email", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ 
        subject: "Missing Chopsticks", 
        message: "My order #5 arrived but I have no chopsticks!" 
      })
    });
    const emailData = await emailRes.json();
    console.log("Email Support Status:", emailRes.status);
    console.log("Email Support Body:", JSON.stringify(emailData, null, 2));

  } catch (err) {
    console.error("Test Error:", err);
  }
}
test();
