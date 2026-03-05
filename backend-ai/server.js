console.log("🔥 THIS SERVER.JS IS RUNNING 🔥");

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json({ limit: "75mb" }));

const GEMINI_MODELS_TO_TRY = [
  process.env.GEMINI_MODEL,
  "gemini-2.5-flash",
  "gemini-1.5-flash",
  "gemini-2.0-flash",
].filter(Boolean);
const GROQ_MODEL = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseImageBase64(input) {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();

  const dataUriMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
  if (dataUriMatch) {
    const mimeType = dataUriMatch[1];
    const data = (dataUriMatch[2] || "").replace(/\s+/g, "");
    return { mimeType, data };
  }

  const data = trimmed.replace(/\s+/g, "");
  return { mimeType: "image/jpeg", data };
}

function tryParseJsonFromText(text) {
  if (typeof text !== "string") return { ok: false, value: null, error: "Non-string model output" };

  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (_) { }

  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  const start =
    firstBrace === -1 ? firstBracket :
      firstBracket === -1 ? firstBrace :
        Math.min(firstBrace, firstBracket);

  if (start === -1) {
    return { ok: false, value: null, error: "No JSON object found in model output" };
  }

  const slice = text.slice(start).trim();
  try {
    return { ok: true, value: JSON.parse(slice) };
  } catch (e) {
    return { ok: false, value: null, error: `JSON parse failed: ${e.message}` };
  }
}

async function callGemini(url, payload) {

  for (let attempt = 1; attempt <= 2; attempt++) {

    const response = await axios.post(url, payload, {
      timeout: 90000,
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true,
      maxBodyLength: Infinity,
      maxContentLength: Infinity
    });

    if (response.status === 429 || response.status >= 500) {
      console.warn(`Gemini rate limit or server error hit (Status ${response.status}). Retry attempt ${attempt}`);
      await sleep(2000);
      continue;
    }

    return response;
  }

  // Return the last response even if it's an error so the caller can log it and try the next model
  const lastResponse = await axios.post(url, payload, {
    timeout: 90000,
    headers: { "Content-Type": "application/json" },
    validateStatus: () => true,
    maxBodyLength: Infinity,
    maxContentLength: Infinity
  });
  return lastResponse;
}

app.post("/analyze-style", async (req, res) => {

  try {

    console.log("[/analyze-style] body keys:", Object.keys(req.body || {}));

    let {
      gender,
      skinTone,
      hairColor,
      stylePreference,
      eyeColor,
      occasion,
      bodyType,
      contrastLevel,
      undertone,
      image,
    } = req.body || {};

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY missing in .env"
      });
    }

    const parsedImage = parseImageBase64(image);

    if (!parsedImage || !parsedImage.data) {
      return res.status(400).json({
        error: "No image provided"
      });
    }

    const safeSkinTone = skinTone === "Let AI Detect" ? "Detect from image" : (skinTone ?? "Not specified");
    const safeUndertone = undertone === "Let AI Detect" ? "Detect from image" : (undertone ?? "Not specified");
    const safeContrast = contrastLevel === "Let AI Detect" ? "Detect from image" : (contrastLevel ?? "Not specified");
    const safeBodyType = bodyType === "Let AI Detect" ? "Detect from image" : (bodyType ?? "Not specified");
    const safeStyle = stylePreference ?? "Not specified";

    const prompt = `
You are a professional colour analyst and fashion stylist. Analyze the provided image and user profile to determine their seasonal color palette and styling recommendations.

Return ONLY a valid JSON object with the exact following structure. Do not include markdown formatting like \`\`\`json.
{
  "skinTone": "string (Detected skin tone)",
  "undertone": "string (Detected undertone, e.g., Warm, Cool, Neutral)",
  "contrastLevel": "string (e.g. High, Medium, Low)",
  "colorSeason": "string (e.g., True Autumn, Clear Winter)",
  "colorSeasonConfidence": "number (0-100 representing confidence score)",
  "summaryExplanation": "string (A short paragraph explaining why this season and these colors work for them)",
  "bestNeutrals": ["string (hex code or color name)", "string", "string"],
  "bestAccentColors": ["string (hex code or color name)", "string", "string"],
  "avoidColors": ["string (hex code or color name)", "string", "string"],
  "jewelry": {
    "recommended": "string (e.g., Gold, Silver, Rose Gold)",
    "avoid": "string",
    "reason": "string (Why this metal works best for their undertone)"
  },
  "necklines": {
    "recommended": ["string", "string"],
    "avoid": ["string", "string"],
    "reason": "string (Why these necklines suit their body type)"
  },
  "outfits": [
    {
      "id": "string (unique id)",
      "description": "string (e.g., Navy shirt + camel trousers)",
      "occasion": "string",
      "style": "string",
      "link": "string (A placeholder realistic URL for buying this or similar outfit)"
    }
  ]
}

User Profile:
Gender: ${gender ?? "Not specified"}
Skin Tone: ${safeSkinTone}
Hair Color: ${hairColor ?? "Not specified"}
Eye Color: ${eyeColor ?? "Not specified"}
Style Preference: ${safeStyle}
Occasion: ${occasion ?? "Not specified"}
Body Type: ${safeBodyType}
Undertone: ${safeUndertone}
Contrast Level: ${safeContrast}
`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: parsedImage.mimeType,
                data: parsedImage.data
              }
            }
          ]
        }
      ]
    };

    let geminiResponse;
    let successfulModel = null;
    let lastErrorData = null;
    let lastStatus = 500;

    for (const modelName of GEMINI_MODELS_TO_TRY) {
      console.log("Calling Gemini model:", modelName);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`;

      geminiResponse = await callGemini(url, geminiPayload);

      if (geminiResponse.status < 400) {
        successfulModel = modelName;
        break;
      } else {
        console.warn(`Model ${modelName} failed with status ${geminiResponse.status}`);
        lastErrorData = geminiResponse.data;
        lastStatus = geminiResponse.status;
      }
    }

    if (!successfulModel) {
      console.error("Gemini error:", lastErrorData);

      return res.status(502).json({
        error: "Gemini API error",
        upstreamStatus: lastStatus,
        upstreamBody: lastErrorData
      });
    }

    const modelText =
      geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!modelText) {
      return res.status(502).json({
        error: "Gemini returned empty response"
      });
    }

    const parsed = tryParseJsonFromText(modelText);

    if (!parsed.ok) {
      return res.status(502).json({
        error: "Gemini output not valid JSON",
        rawText: modelText
      });
    }

    const analysis = parsed.value;

    if (process.env.GROQ_API_KEY) {

      try {

        const groqResponse = await axios.post(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            model: GROQ_MODEL,
            messages: [
              {
                role: "system",
                content: "You are a professional fashion stylist. Based on the user's color analysis JSON, generate 3 specific, highly tailored outfit improvement recommendations.\nReturn ONLY a valid JSON object with the following structure. Do not include markdown formatting:\n{\n  \"recommendations\": [\n    \"string (recommendation 1)\",\n    \"string (recommendation 2)\",\n    \"string (recommendation 3)\"\n  ]\n}"
              },
              {
                role: "user",
                content: JSON.stringify(analysis)
              }
            ],
            response_format: { type: "json_object" },
            temperature: 0.7
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
              "Content-Type": "application/json"
            },
            validateStatus: () => true
          }
        );

        const groqText =
          groqResponse.data?.choices?.[0]?.message?.content ?? "";

        const groqParsed = tryParseJsonFromText(groqText);

        if (groqParsed.ok && groqParsed.value?.recommendations) {
          analysis.recommendations = groqParsed.value.recommendations;
        }

      } catch (e) {
        console.error("Groq failed:", e.message);
      }

    }

    res.json(analysis);

  } catch (error) {

    console.error("Unhandled error:", error);

    res.status(500).json({
      error: "Failed to analyze style",
      details: error.message
    });

  }
});

const PORT = 5000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});