import dotenv from "dotenv";
dotenv.config();

import { getSupportResponse } from "./server/ai";

async function testAI() {
  console.log("### TESTING AI MODELS LOCALLY...");
  console.log("### API KEY detected:", process.env.OPENROUTER_API_KEY ? "YES" : "NO");
  
  try {
    const start = Date.now();
    const reply = await getSupportResponse("Hello, who are you?");
    const duration = ((Date.now() - start) / 1000).toFixed(2);
    
    console.log("\n--- AI RESPONSE ---");
    console.log(reply);
    console.log("-------------------\n");
    console.log(`### SUCCESS: AI responded in ${duration}s`);
    process.exit(0);
  } catch (err: any) {
    console.error("\n### AI TEST FAILED!");
    console.error(err.message || err);
    process.exit(1);
  }
}

testAI();
