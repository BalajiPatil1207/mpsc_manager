require('dotenv').config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

async function testGemini() {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("No API key");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent("Respond with the single word: SUCCESS");
    console.log("SUCCESS! Response from Gemini:", result.response.text());
  } catch (err) {
    console.error("API Error via SDK:", err.message);
  }
}

testGemini();
