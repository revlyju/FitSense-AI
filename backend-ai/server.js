require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");

const app = express();
app.use(cors());
app.use(express.json());

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.post("/analyze-style", async (req, res) => {
  try {
    const { gender, skinTone, hairColor, eyeColor, stylePreference, occasion, bodyType, contrastLevel, undertone } = req.body;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are a professional colour analyst and fashion stylist.
Analyze the user's profile and provide a strict JSON response.
Do not include any conversational text or markdown formatting outside the JSON.

The JSON structure must be exactly:
{
  "undertone": "String (e.g., Warm, Cool, Neutral)",
  "contrastLevel": "String (e.g., Low, Medium, High)",
  "colorSeason": "String (e.g., Autumn, Winter, Spring, Summer)",
  "summaryExplanation": "String (2-3 sentences explaining the analysis)",
  "bestNeutrals": [{ "name": "String", "hex": "String" } (3 items)],
  "bestAccentColors": [{ "name": "String", "hex": "String" } (4 items)],
  "avoidColors": [{ "name": "String", "hex": "String" } (3 items)],
  "jewelry": {
    "recommended": "String",
    "avoid": "String",
    "reason": "String"
  },
  "necklines": {
    "recommended": ["String", "String", "String"],
    "avoid": ["String", "String"],
    "reason": "String"
  }
}

Consider the user's explicit inputs for undertone or contrast level if provided, otherwise deduce them.
Gender: ${gender}
Body Type: ${bodyType}
`
        },
        {
          role: "user",
          content: `
User Profile:
Gender: ${gender}
Skin Tone: ${skinTone}
Hair Color: ${hairColor}
Eye Color: ${eyeColor}
Style Preference: ${stylePreference}
Occasion: ${occasion}
Body Type: ${bodyType}
Undertone (User Input): ${undertone || "Not specified"}
Contrast Level (User Input): ${contrastLevel || "Not specified"}
`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_completion_tokens: 1024,
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(chatCompletion.choices[0].message.content);

    // Static outfits placeholder as requested
    analysis.outfits = [
      {
        id: '1',
        title: 'Classic Analysis Outfit 1',
        price: '$--',
        image: 'https://via.placeholder.com/300x400?text=Outfit+1',
        link: 'https://example.com',
        reason: 'Matches your color season.',
      },
      {
        id: '2',
        title: 'Classic Analysis Outfit 2',
        price: '$--',
        image: 'https://via.placeholder.com/300x400?text=Outfit+2',
        link: 'https://example.com',
        reason: 'Matches your body type.',
      }
    ];

    res.json(analysis);

  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to analyze style" });
  }
});

app.listen(5000, () => {
  console.log("Server running on http://localhost:5000");
});
