console.log("🔥 THIS SERVER.JS IS RUNNING 🔥");

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");
const FormData = require("form-data");
// Force Node.js to use Google's DNS servers for resolving the MongoDB SRV record
// This fixes network issues where local ISPs block Node.js DNS queries.
try {
  require("dns").setServers(["8.8.8.8", "8.8.4.4"]);
} catch (error) {
  console.warn("Could not set DNS servers:", error);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: "75mb" }));

// Serve static outfit images from the outfit_img folder
app.use("/outfit_img", express.static(path.join(__dirname, "outfit_img")));

const uri = process.env.MONGODB_URI;

const connectDB = async () => {
  try {
    await mongoose.connect(uri);
    console.log("MongoDB connected");
  } catch (err) {
    console.error("MongoDB connection failed:", err);
  }
};

connectDB();

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  profileAnalyzed: { type: Boolean, default: false },
  analysis: {
    skinTone: String,
    undertone: String,
    bodyShape: String,
    faceShape: String,
    contrastLevel: String,
    colorSeason: String,
    necklines: mongoose.Schema.Types.Mixed,
    jewelry: mongoose.Schema.Types.Mixed,
    bestNeutrals: [mongoose.Schema.Types.Mixed],
    bestAccentColors: [mongoose.Schema.Types.Mixed],
    avoidColors: [mongoose.Schema.Types.Mixed],
  },
  preferences: {
    styles: [String],
    occasions: [String],
    colors: [String],
    seasonOrWeather: [String],
    fitPreference: [String]
  },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

const userStyleProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", unique: true },
  skinTone: String,
  undertone: String,
  bodyShape: String,
  contrastLevel: String,
  season: String,
  bestColors: [mongoose.Schema.Types.Mixed],
  avoidColors: [mongoose.Schema.Types.Mixed],
  metalPreference: String,
  necklines: mongoose.Schema.Types.Mixed,
  updatedAt: { type: Date, default: Date.now },
});

const UserStyleProfile = mongoose.model("UserStyleProfile", userStyleProfileSchema);

const outfitsDb = mongoose.connection.useDb('outfits');
const outfitSchema = new mongoose.Schema({
  id: String,
  gender: [String],
  type: String,
  category: String,
  imageUrl: String,
  suitable_body_types: [String],
  suitable_body_type: [String],
  seasons: [String],
  weather: [String],
  necklines: [String],
  patterns: [String],
  colors: [String],
  fit: String,
  fabric: [String],
  style_tags: [String],
  occasion: String,
  link: String
});
const Outfit = outfitsDb.model("Outfit", outfitSchema, "outfits");

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

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
    });

    return res.status(201).json({
      success: true,
      userId: user._id.toString(),
      name: user.name,
      profileAnalyzed: user.profileAnalyzed || false,
    });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Failed to create account" });
  }
});

app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ error: "Valid email and password are required" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    return res.json({
      success: true,
      userId: user._id.toString(),
      name: user.name,
      profileAnalyzed: user.profileAnalyzed || false,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ error: "Failed to login" });
  }
});

app.post("/style-profile", async (req, res) => {
  try {
    const {
      userId,
      skinTone,
      undertone,
      bodyShape,
      contrastLevel,
      season,
      bestColors,
      avoidColors,
      metalPreference,
      necklines,
    } = req.body || {};

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const profile = await UserStyleProfile.findOneAndUpdate(
      { userId: user._id },
      {
        skinTone,
        undertone,
        bodyShape,
        contrastLevel,
        season,
        bestColors,
        avoidColors,
        metalPreference,
        necklines,
        updatedAt: new Date(),
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({
      success: true,
      profile,
    });
  } catch (err) {
    console.error("Style profile error:", err);
    return res.status(500).json({ error: "Failed to save style profile" });
  }
});

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

  const lastBrace = text.lastIndexOf("}");
  const lastBracket = text.lastIndexOf("]");
  const end = Math.max(lastBrace, lastBracket);

  if (end === -1 || end < start) {
    return { ok: false, value: null, error: "No closing JSON bracket found" };
  }

  const slice = text.slice(start, end + 1).trim();
  try {
    return { ok: true, value: JSON.parse(slice) };
  } catch (e) {
    return { ok: false, value: null, error: `JSON parse failed: ${e.message}`, rawText: text };
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

// outfit scorer
function calculateOutfitScore(outfit, userProfile) {
  let score = 0;
  let reasons = [];

  const { gender, bodyShape, colorSeason, necklines, occasion, seasonOrWeather, stylePreference, colorPreference, fitPreference } = userProfile;

  // Gender is filtered BEFORE scoring (see filteredOutfits logic below).
  // We keep scoring logic gender-agnostic to avoid wasting compute and to guarantee
  // the frontend never receives mismatched outfits.

  // Body type match -> +3
  const userBodyShape = (bodyShape || "").toString().toLowerCase();
  const dbBodyTypes = outfit.suitable_body_types || outfit.suitable_body_type || [];
  if (userBodyShape && dbBodyTypes.some(bt => userBodyShape.includes((bt || "").toString().toLowerCase()) || (bt || "").toString().toLowerCase().includes(userBodyShape))) {
    score += 3;
    reasons.push("flatters your body type");
  }

  // Season match -> +2
  const userSeason = (seasonOrWeather || colorSeason || "").toString().toLowerCase();
  const dbSeasons = outfit.seasons || outfit.weather || [];
  if (userSeason && dbSeasons.some(s => {
    const sStr = (s || "").toString().toLowerCase();
    return userSeason.includes(sStr) || sStr.includes(userSeason) ||
      (userSeason.includes("summer") && sStr.includes("hot")) ||
      (userSeason.includes("winter") && sStr.includes("cold"));
  })) {
    score += 2;
    reasons.push("perfect for the season/weather");
  }

  // Occasion match -> +2
  const userOccasion = (occasion || "").toString().toLowerCase();

  let outfitOccasionMatch = false;
  if (userOccasion && outfit.occasion) {
    if (Array.isArray(outfit.occasion)) {
      outfitOccasionMatch = outfit.occasion.some(o => (o || "").toString().toLowerCase().includes(userOccasion));
    } else {
      outfitOccasionMatch = (outfit.occasion || "").toString().toLowerCase().includes(userOccasion);
    }
  }

  if (outfitOccasionMatch) {
    score += 2;
    reasons.push("matches your occasion");
  }

  // Style preference match -> +1 (supports single string or array)
  const userStyles = Array.isArray(stylePreference)
    ? stylePreference.map(s => (s || "").toString().toLowerCase())
    : [(stylePreference || "").toString().toLowerCase()];
  const dbStyles = outfit.style_tags || [];
  if (userStyles.some(userStyle => userStyle && dbStyles.some(st =>
    (st || "").toString().toLowerCase().includes(userStyle) || userStyle.includes((st || "").toString().toLowerCase())
  ))) {
    score += 1;
    reasons.push("fits your style preference");
  }

  // Color preference match -> +1 (supports single string or array)
  const userColors = Array.isArray(colorPreference)
    ? colorPreference.map(c => (c || "").toString().toLowerCase())
    : [(colorPreference || "").toString().toLowerCase()];
  const dbColors = outfit.colors || [];
  if (userColors.some(userColor => userColor && dbColors.some(c =>
    userColor.includes((c || "").toString().toLowerCase()) || (c || "").toString().toLowerCase().includes(userColor)
  ))) {
    score += 1;
    reasons.push("matches your color preference");
  }

  // Neckline match -> +1
  const recommendedNecklines = Array.isArray(necklines?.recommended) ? necklines.recommended.map(n => (n || "").toString().toLowerCase()) : [];
  const dbNecklines = outfit.necklines || [];
  if (recommendedNecklines.length > 0 && dbNecklines.some(n => {
    const nStr = (n || "").toString().toLowerCase();
    return recommendedNecklines.some(rec => rec.includes(nStr) || nStr.includes(rec));
  })) {
    score += 1;
    reasons.push("features a recommended neckline");
  }

  let reasonsString = reasons.length > 0 ? reasons.join(" and ") : "A great addition to your wardrobe";
  if (reasonsString.length > 120) {
    reasonsString = reasons.slice(0, 3).join(", ") + " and more";
  }
  reasonsString = reasonsString.charAt(0).toUpperCase() + reasonsString.slice(1) + ".";

  return { score, matchReasons: reasonsString };
}

app.post("/analyze-style", async (req, res) => {

  try {

    console.log("[/analyze-style] body keys:", Object.keys(req.body || {}));

    let {
      userId, // added userId extraction
      gender,
      occasion,
      seasonOrWeather,
      locationClimate,
      timeOfDay,
      activityLevel,
      stylePreference,
      colorPreference,
      fitPreference,
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

    // ==== HYBRID PYTHON PIPELINE ====
    let finalImageData = parsedImage.data;
    let finalMimeType = parsedImage.mimeType;
    let pyFaceShape = "Unknown";
    let pyContrastLevel = "Unknown";

    try {
      const imageBuffer = Buffer.from(parsedImage.data, 'base64');
      const form = new FormData();
      form.append('file', imageBuffer, {
        filename: 'upload.jpg',
        contentType: parsedImage.mimeType || 'image/jpeg'
      });

      const pyResponse = await axios.post('http://localhost:8000/analyze-face', form, {
        headers: {
          ...form.getHeaders()
        },
        timeout: 30000
      });

      if (pyResponse.data) {
        if (pyResponse.data.faceShape) pyFaceShape = pyResponse.data.faceShape;
        if (pyResponse.data.contrastLevel) pyContrastLevel = pyResponse.data.contrastLevel;
        if (pyResponse.data.censoredImage) {
          finalImageData = pyResponse.data.censoredImage;
          finalMimeType = 'image/jpeg';
          console.log("Python successfully censored a face in the image.");
        } else {
          console.log("Python did not detect a face to censor. Passing original image directly.");
        }
        
        const censorPath = path.join(__dirname, 'censored_latest.jpg');
        fs.writeFileSync(censorPath, Buffer.from(finalImageData, 'base64'));
        console.log(`\n\n🟢 IMAGE SENT TO API! View it here: file:///${censorPath.replace(/\\/g, '/')}\n\n`);
      }
    } catch (pyErr) {
      console.warn("Python microservice failed or is unreachable. Falling back to default Gemini processing.", pyErr.message);
    }
    // ================================

    const prompt = `
You are an expert 12-season color analyst and fashion stylist. You MUST perform a rigorous and unbiased analysis of the provided image. 
CRITICAL RULES:
1. Do NOT default to "Autumn" or "Warm" blindly. Many users are Winter, Summer, or Spring.
2. Distinctly evaluate the contrast (High/Medium/Low) between skin, hair, and eyes.
3. Precisely determine undertone (Cool, Warm, Neutral, Olive).
4. Assign the EXACT 12-season category (e.g., Light Spring, Soft Summer, True Winter, Dark Autumn).
5. Ensure color recommendations are extremely personalized to their specific season. Avoid generic colors.
6. Jewelry MUST match undertone strictly (Cool = Silver/White Gold; Warm = Gold/Brass; Neutral = Rose Gold/Mixed).

Return ONLY a valid JSON object with the exact following structure. Do not include markdown formatting like \`\`\`json.
{
  "skinTone": "string (Detected skin tone)",
  "undertone": "string (Detected undertone, e.g., Warm, Cool, Neutral)",
  "contrastLevel": "string (e.g. High, Medium, Low)",
  "colorSeason": "string (e.g., True Autumn, Clear Winter)",
  "colorSeasonConfidence": "number (0-100 representing confidence score)",
  "faceShape": "string (Detected face shape, e.g., Oval, Round, Square)",
  "bodyShape": "string (Detected body shape, e.g., Hourglass, Pear)",
  "bestNeutrals": [
    { "name": "string (color name)", "hex": "string (hex code)" },
    { "name": "string", "hex": "string" },
    { "name": "string", "hex": "string" },
    { "name": "string", "hex": "string" },
    { "name": "string", "hex": "string" }
  ],
  "bestAccentColors": [
    { "name": "string (color name)", "hex": "string (hex code)" },
    { "name": "string", "hex": "string" },
    { "name": "string", "hex": "string" },
    { "name": "string", "hex": "string" },
    { "name": "string", "hex": "string" }
  ],
  "avoidColors": [
    { "name": "string (color name)", "hex": "string (hex code)" },
    { "name": "string", "hex": "string" },
    { "name": "string", "hex": "string" },
    { "name": "string", "hex": "string" },
    { "name": "string", "hex": "string" }
  ],
  "jewelry": {
    "recommended": "string (e.g., Gold, Silver, Rose Gold)",
    "avoid": "string",
    "reason": "string (Why this metal works best for their undertone)"
  },
  "necklines": {
    "recommended": ["string", "string"],
    "avoid": ["string", "string"],
    "reason": "string (Why these necklines suit their body type)"
  }
}

User Profile Context:
Gender: ${gender ?? "Not specified"}
Detected Face Shape: ${pyFaceShape}
Detected Contrast Level: ${pyContrastLevel}
(Please use the detected face shape and contrast level directly in your JSON output if they are not Unknown.)
`;

    const geminiPayload = {
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inline_data: {
                mime_type: finalMimeType,
                data: finalImageData
              }
            }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json"
      }
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
        parseError: parsed.error,
        rawText: modelText
      });
    }

    const analysis = parsed.value;

    if (process.env.GROQ_API_KEY) {

      try {

        const rawContextualInputs = {
          occasion,
          seasonOrWeather,
          locationClimate,
          timeOfDay,
          activityLevel,
          stylePreference,
          colorPreference,
          fitPreference
        };

        const contextualInputs = Object.fromEntries(
          Object.entries(rawContextualInputs).filter(([_, v]) => v && v !== 'No Preference')
        );

        const groqPrompt = `
You are a professional fashion stylist. You have been provided with two pieces of information about a client:
1. A visual style profile extracted by an AI image analyzer.
2. The user's personal preferences and contextual details for what they want to wear.

Your task is to:
1. Generate a "summaryExplanation" (1-2 paragraphs) that explains their color season and how it works with their requested style/occasion.
2. Generate exactly 3 highly specific outfit recommendations that perfectly combine their visual attributes (color season, body recommendations) with their requested preferences.

Return ONLY a valid JSON object with the exact following structure. Do not include markdown formatting:
{
  "summaryExplanation": "string (Your personalized explanation)",
  "outfits": [
    {
      "id": "outfit-1",
      "description": "string (Detailed description of the pieces, colors, and why it works)",
      "occasion": "string (The occasion this suits best or user matched)",
      "style": "string (The aesthetic name)",
      "link": "string (A placeholder realistic URL for buying this or similar outfit)"
    },
    { "id": "outfit-2", "description": "string", "occasion": "string", "style": "string", "link": "string" },
    { "id": "outfit-3", "description": "string", "occasion": "string", "style": "string", "link": "string" }
  ]
}
`;

        const groqResponse = await axios.post(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            model: GROQ_MODEL,
            messages: [
              {
                role: "system",
                content: groqPrompt
              },
              {
                role: "user",
                content: JSON.stringify({
                  visualProfile: analysis,
                  userPreferences: contextualInputs
                })
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

        if (groqParsed.ok && groqParsed.value?.outfits) {
          analysis.outfits = groqParsed.value.outfits;
          analysis.summaryExplanation = groqParsed.value.summaryExplanation || "We've created these personalized outfits for you based on your analysis.";
        }

      } catch (e) {
        console.error("Groq failed:", e.message);
      }

    }

    // --- DB OUTFITS MATCHING LOGIC ---
    try {
      const dbOutfits = await Outfit.find({});
      const rawUserGender = (req.body?.userGender || gender || "").toString().toLowerCase().trim();
      const userGender = rawUserGender === "men" || rawUserGender === "women" ? rawUserGender : "";

      const filteredOutfits = dbOutfits.filter((outfit) => {
        const g = outfit?.gender;
        // Defensive: missing gender => treat as unisex
        const genders = Array.isArray(g) ? g : (typeof g === "string" ? [g] : []);
        if (genders.length === 0) return true;

        const normalized = genders.map((x) => (x || "").toString().toLowerCase().trim());
        if (normalized.includes("unisex")) return true;
        if (!userGender) return true;
        return normalized.includes(userGender);
      });

      const userProfile = {
        gender: userGender,
        bodyShape: analysis.bodyShape,
        colorSeason: analysis.colorSeason,
        necklines: analysis.necklines,
        occasion,
        seasonOrWeather,
        stylePreference,
        colorPreference,
        fitPreference
      };

      const scoredOutfits = filteredOutfits.map(outfit => {
        const { score, matchReasons } = calculateOutfitScore(outfit, userProfile);

        // determine the correct image URL if imageUrl exists on the document or fallback to local
        let finalImageUrl = outfit.imageUrl || `/outfit_img/${outfit._id}.jpg`;

        return {
          id: outfit._id,
          type: outfit.type || "Outfit",
          category: outfit.category || "",
          link: outfit.link,
          imageUrl: finalImageUrl,
          matchReasons,
          score
        };
      });

      // Sort outfits by highest score first
      scoredOutfits.sort((a, b) => b.score - a.score);

      // Take top 5 recommendations
      analysis.dbOutfits = scoredOutfits.slice(0, 5);

      // Save to User collection if userId is provided
      if (userId) {
        const updateData = {
          profileAnalyzed: true,
          analysis: {
            skinTone: analysis.skinTone,
            undertone: analysis.undertone,
            bodyShape: analysis.bodyShape,
            faceShape: analysis.faceShape,
            contrastLevel: analysis.contrastLevel,
            colorSeason: analysis.colorSeason,
            necklines: analysis.necklines,
            jewelry: analysis.jewelry,
            bestNeutrals: analysis.bestNeutrals,
            bestAccentColors: analysis.bestAccentColors,
            avoidColors: analysis.avoidColors,
          },
          preferences: {
            // Normalize: if already an array keep it, if a single string wrap it, filter out "No Preference"
            styles: (Array.isArray(stylePreference) ? stylePreference : (stylePreference ? [stylePreference] : [])).filter(v => v && v !== "No Preference"),
            occasions: (Array.isArray(occasion) ? occasion : (occasion ? [occasion] : [])).filter(v => v && v !== "No Preference"),
            colors: (Array.isArray(colorPreference) ? colorPreference : (colorPreference ? [colorPreference] : [])).filter(v => v && v !== "No Preference"),
            seasonOrWeather: (Array.isArray(seasonOrWeather) ? seasonOrWeather : (seasonOrWeather ? [seasonOrWeather] : [])).filter(v => v && v !== "No Preference"),
            fitPreference: (Array.isArray(fitPreference) ? fitPreference : (fitPreference ? [fitPreference] : [])).filter(v => v && v !== "No Preference")
          }
        };
        await User.findByIdAndUpdate(userId, updateData, { new: true });
      }

    } catch (err) {
      console.error("Error fetching or parsing db outfits:", err);
      analysis.dbOutfits = [];
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

app.get("/api/dashboard/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "userId is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    if (!user.profileAnalyzed) {
      return res.status(403).json({ error: "Onboarding required", requireOnboarding: true });
    }

    // Prepare user profile for scoring — pass full arrays so all selected preferences influence results
    const userProfile = {
      gender: "unisex",
      bodyShape: user.analysis?.bodyShape || "",
      colorSeason: user.analysis?.colorSeason || "",
      necklines: user.analysis?.necklines || { recommended: [] },
      occasion: user.preferences?.occasions?.[0] || "",          // single value (occasion is still single-select)
      seasonOrWeather: user.preferences?.seasonOrWeather?.[0] || "", // single value
      stylePreference: user.preferences?.styles || "",            // full array
      colorPreference: user.preferences?.colors || "",            // full array
      fitPreference: user.preferences?.fitPreference || "",       // full array
      ...user.analysis,
    };

    const dbOutfits = await Outfit.find({});

    // Filter outfits by gender (we will default to unisex matching since gender wasn't strictly added to the user model schema earlier)
    const filteredOutfits = dbOutfits; // All outfits, since gender is tricky without explicit user record

    const scoredOutfits = filteredOutfits.map(outfit => {
      const { score, matchReasons } = calculateOutfitScore(outfit, userProfile);
      let finalImageUrl = outfit.imageUrl || `/outfit_img/${outfit._id}.jpg`;
      return {
        _id: outfit._id,
        type: outfit.type || "Outfit",
        category: outfit.category || "",
        link: outfit.link,
        imageUrl: finalImageUrl,
        matchReasons,
        score
      };
    });

    // Sort descending by score
    scoredOutfits.sort((a, b) => b.score - a.score);

    // Get Recommendations (top 10)
    const recommendedOutfits = scoredOutfits.slice(0, 10);

    // Get OOTD (Random high scoring, e.g. from top 5)
    let outfitOfTheDay = null;
    if (scoredOutfits.length > 0) {
      const topCount = Math.min(5, scoredOutfits.length);
      const randomIndex = Math.floor(Math.random() * topCount);
      outfitOfTheDay = scoredOutfits[randomIndex];
    }

    // Construct Response
    return res.json({
      success: true,
      userAnalysis: user.analysis,
      styleInsights: {
        season: user.analysis?.colorSeason || "Unknown",
        undertone: user.analysis?.undertone || "Unknown",
        bestColors: (user.analysis?.bestNeutrals || []).map(c => c.hex).concat((user.analysis?.bestAccentColors || []).map(c => c.hex)).filter(Boolean),
        avoidColors: (user.analysis?.avoidColors || []).map(c => c.hex).filter(Boolean),
        necklines: user.analysis?.necklines?.recommended || [],
      },
      outfitOfTheDay,
      recommendedOutfits
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to load dashboard data" });
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