async function testAI() {
  console.log("### AI_TEST: Starting support chat test using native fetch...");
  try {
    const response = await fetch("http://localhost:3001/api/ai/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        message: "Hi! What's on the menu today at Mr Wu's?" 
      }),
    });

    const data = await response.json() as any;
    if (response.ok) {
      console.log("### AI_TEST_SUCCESS: Received response!");
      console.log("Response Content:", data.reply);
    } else {
      console.error("### AI_TEST_FAILED:", data.error || data);
    }
  } catch (err: any) {
    console.error("### AI_TEST_NETWORK_ERROR:", err.message);
  }
}

testAI();
