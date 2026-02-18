console.log("🔥 THIS SERVER.JS IS RUNNING 🔥");

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(express.json({ limit: "75mb" })); // increase limit for base64 images

function parseImageBase64(input) {
  if (!input || typeof input !== "string") return null;

  const trimmed = input.trim();

  // data URI: data:image/png;base64,AAAA
  const dataUriMatch = trimmed.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.*)$/s);
  if (dataUriMatch) {
    const mimeType = dataUriMatch[1];
    const data = (dataUriMatch[2] || "").replace(/\s+/g, "");
    return { mimeType, data };
  }

  // raw base64 (no prefix)
  const data = trimmed.replace(/\s+/g, "");
  return { mimeType: "image/jpeg", data };
}

function tryParseJsonFromText(text) {
  if (typeof text !== "string") return { ok: false, value: null, error: "Non-string model output" };

  // If it's valid JSON already, great.
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (_) {
    // fall through
  }

  // Attempt to extract the first JSON object/array substring (common when model adds extra text).
  const firstBrace = text.indexOf("{");
  const firstBracket = text.indexOf("[");
  const start =
    firstBrace === -1 ? firstBracket :
      firstBracket === -1 ? firstBrace :
        Math.min(firstBrace, firstBracket);

  if (start === -1) {
    return { ok: false, value: null, error: "No JSON object/array found in model output" };
  }

  const slice = text.slice(start).trim();
  try {
    return { ok: true, value: JSON.parse(slice) };
  } catch (e) {
    return { ok: false, value: null, error: `JSON parse failed: ${e.message}` };
  }
}

app.post("/analyze-style", async (req, res) => {
  try {
    console.log("[/analyze-style] body keys:", Object.keys(req.body || {}));
    const {
      gender,
      skinTone,
      hairColor,
      eyeColor,
      stylePreference,
      occasion,
      bodyType,
      contrastLevel,
      undertone,
      image,
    } = req.body || {};

    if (!process.env.GEMINI_API_KEY) {
      console.error("[/analyze-style] GEMINI_API_KEY missing");
      return res.status(500).json({
        error: "Server misconfigured: GEMINI_API_KEY missing",
        hint: "Set GEMINI_API_KEY in backend-ai/.env and restart the server",
      });
    }

    const parsedImage = parseImageBase64(image);
    if (!parsedImage || !parsedImage.data) {
      return res.status(400).json({
        error: "No image provided",
        hint: "Send `image` as base64 string (optionally with data:image/...;base64, prefix)",
      });
    }

    console.log(
      `[/analyze-style] image received: mime=${parsedImage.mimeType} base64Length=${parsedImage.data.length}`
    );

    let prompt = `
    You are a professional colour analyst and fashion stylist.
    Analyze the user's profile and the provided image (if any) to provide a strict JSON response.
    Do not include any chat conversational text or markdown formatting outside the JSON.
    
    The JSON structure must be exactly (return ONLY valid JSON):
    {
      "undertone": "String (e.g., Warm, Cool, Neutral)",
      "contrastLevel": "String (e.g., Low, Medium, High)",
      "faceShape": "String (e.g., Oval, Round, Square, Heart, Diamond, Oblong)",
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

    User Profile:
    Gender: ${gender ?? "Not specified"}
    Skin Tone: ${skinTone ?? "Not specified"}
    Hair Color: ${hairColor ?? "Not specified"}
    Eye Color: ${eyeColor ?? "Not specified"}
    Style Preference: ${stylePreference ?? "Not specified"}
    Occasion: ${occasion ?? "Not specified"}
    Body Type: ${bodyType ?? "Not specified"}
    Undertone (User Input): ${undertone ?? "Not specified"}
    Contrast Level (User Input): ${contrastLevel ?? "Not specified"}
    `;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${process.env.GEMINI_API_KEY}`;

    // Gemini Vision REST format (NOT deprecated)
    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: prompt.trim() },
            {
              inline_data: {
                mime_type: parsedImage.mimeType,
                data: parsedImage.data,
              },
            },
          ],
        },
      ],
    };

    console.log("[/analyze-style] POST", url.split("?")[0]);

    const geminiResponse = await axios.post(url, geminiPayload, {
      timeout: 90_000,
      headers: { "Content-Type": "application/json" },
      // Axios in Node can otherwise choke on big payloads
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      validateStatus: () => true,
    });

    if (geminiResponse.status >= 400) {
      console.error("[/analyze-style] Gemini HTTP error", geminiResponse.status);
      console.error("[/analyze-style] Gemini error body:", JSON.stringify(geminiResponse.data).slice(0, 4000));
      return res.status(502).json({
        error: "Gemini API error",
        upstreamStatus: geminiResponse.status,
        upstreamBody: geminiResponse.data,
      });
    }

    const modelText =
      geminiResponse.data?.candidates?.[0]?.content?.parts?.find((p) => typeof p?.text === "string")?.text ??
      geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "";

    if (!modelText) {
      console.error("[/analyze-style] No text returned from Gemini");
      console.error("[/analyze-style] Full Gemini body:", JSON.stringify(geminiResponse.data).slice(0, 4000));
      return res.status(502).json({
        error: "Gemini returned no text content",
        upstreamBody: geminiResponse.data,
      });
    }

    const parsed = tryParseJsonFromText(modelText);
    if (!parsed.ok) {
      // Do NOT crash by JSON.parse'ing blindly; return raw text + parsing hint.
      console.error("[/analyze-style] Model output was not valid JSON:", parsed.error);
      console.error("[/analyze-style] Model output (first 2000 chars):", modelText.slice(0, 2000));
      return res.status(502).json({
        error: "Model did not return valid JSON",
        parseError: parsed.error,
        rawText: modelText,
      });
    }

    const analysis = parsed.value;

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
    console.error("[/analyze-style] Unhandled error:", error);
    console.error("[/analyze-style] message:", error?.message);
    console.error("[/analyze-style] stack:", error?.stack);
    if (error?.response) {
      console.error("[/analyze-style] axios response status:", error.response.status);
      console.error("[/analyze-style] axios response data:", JSON.stringify(error.response.data).slice(0, 4000));
    }
    res.status(500).json({
      error: "Failed to analyze style",
      details: error?.message ?? String(error),
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

