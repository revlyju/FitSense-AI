require("dotenv").config();
const axios = require("axios");

async function checkKey() {
    const key = process.env.GEMINI_API_KEY;
    console.log("Checking Gemini API Key:", key ? (key.slice(0, 5) + "..." + key.slice(-5)) : "MISSING");

    if (!key) {
        console.error("❌ GEMINI_API_KEY is not set in .env!");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${key}`;
    const payload = {
        contents: [{ parts: [{ text: "Hello, are you active?" }] }]
    };

    try {
        console.log("Sending test request to gemini-1.5-flash...");
        const response = await axios.post(url, payload);
        console.log("✅ API Success! Response:", response.data.candidates[0].content.parts[0].text);
    } catch (error) {
        console.error("❌ API Error:");
        if (error.response) {
            console.error("Status:", error.response.status);
            console.error("Message:", error.response.data.error?.message || error.response.statusText);
            console.error("Reason:", error.response.data.error?.status || "Unknown");

            if (error.response.status === 429) {
                console.error("\n💡 QUOTA HIT: You have exceeded your free tier limits. Please wait or use a different key.");
            } else if (error.response.status === 403) {
                console.error("\n💡 PERMISSION ERROR: This key might not have the Gemini API enabled, or it's restricted.");
            }
        } else {
            console.error(error.message);
        }
    }
}

checkKey();
