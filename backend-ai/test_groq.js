require("dotenv").config();
const Groq = require("groq-sdk");

const key = process.env.GROQ_API_KEY;
console.log("Key:", JSON.stringify(key));
console.log("Key length:", key ? key.length : 0);
if (key) {
  console.log("Key char codes:", [...key].map(c => c.charCodeAt(0)));
}

const groq = new Groq({ apiKey: key });

async function testGroq() {
  try {
    const response = await groq.chat.completions.create({
      messages: [
        { role: "user", content: "Say hello briefly." }
      ],
      model: "llama-3.3-70b-versatile"
    });
    console.log("Response:", response.choices[0].message.content);
  } catch (err) {
    console.error("Groq Error:");
    if (err.status) console.error("Status:", err.status);
    console.error(err.message || err);
  }
}

testGroq();
