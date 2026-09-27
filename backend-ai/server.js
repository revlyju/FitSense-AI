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
const Groq = require("groq-sdk");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
// Force Node.js to use Google's DNS servers for resolving the MongoDB SRV record
// This fixes network issues where local ISPs block Node.js DNS queries.
try {
  require("dns").setServers(["8.8.8.8", "8.8.4.4"]);
} catch (error) {
  console.warn("Could not set DNS servers:", error);
}


const app = express();

app.use(express.json());
app.use('/outfit_img', express.static(path.join(__dirname, 'outfit_img')));

app.use(cors());
app.use(express.json({ limit: "75mb" }));

// Serve static outfit images from the outfit_img folder
app.use("/outfit_img", express.static(path.join(__dirname, "outfit_img")));

app.get("/", (req, res) => {
  res.json({ status: "ok", message: "AI Stylist Backend is running" });
});

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "ai-stylist-node-backend" });
});

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
  gender: { type: String, default: "unisex" },
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
  history: [{
    date: { type: Date, default: Date.now },
    season: String,
    undertone: String,
    ootdUrl: String,
    analysisData: mongoose.Schema.Types.Mixed
  }],
  likedOutfits: [{
    outfitId: String,
    likedAt: { type: Date, default: Date.now }
  }],
  styleMemory: {
    likedColors: [String],
    likedCategories: [String],
    likedStyles: [String],
    interactionCount: { type: Number, default: 0 }
  },
  settings: {
    stylePreferences: {
      styles: [String],
      fitPreference: { type: String, default: "" },
      colorComfort: { type: String, default: "" }
    },
    avoid: {
      colors: [String],
      patterns: [String],
      fits: [String]
    },
    privacy: {
      blurFace: { type: Boolean, default: true },
      storeImages: { type: Boolean, default: false },
      deleteAfterAnalysis: { type: Boolean, default: true }
    },
    notifications: {
      ootd: { type: Boolean, default: true },
      recommendations: { type: Boolean, default: true }
    },
    theme: {
      mode: { type: String, default: "light" }
    },
    geminiApiKey: { type: String, default: "" }
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

const analysisHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  analysisName: String,
  faceShape: String,
  bodyShape: String,
  skinTone: String,
  undertone: String,
  contrastLevel: String,
  bestColors: [mongoose.Schema.Types.Mixed],
  avoidColors: [mongoose.Schema.Types.Mixed],
  recommendedOutfits: [{
    outfitId: String,
    type: String,
    imageUrl: String,
    link: String,
    score: Number
  }]
});
const AnalysisHistory = mongoose.model("AnalysisHistory", analysisHistorySchema);

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
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-2.0-flash",
  "gemini-2.0-flash-exp",
  "gemini-3-flash-preview",
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

// ==== LIKED OUTFIT ROUTES ====
app.post("/like-outfit", async (req, res) => {
  try {
    const { userId, outfit } = req.body;
    if (!userId || !outfit || !outfit.id) {
      return res.status(400).json({ error: "userId and outfit are required" });
    }

    let user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Validate if already liked
    const alreadyLiked = user.likedOutfits.some(lo => lo.outfitId === outfit.id.toString());
    if (alreadyLiked) {
      return res.status(400).json({ error: "Outfit already liked" });
    }

    // Push to likedOutfits
    user.likedOutfits.push({ outfitId: outfit.id.toString(), likedAt: new Date() });

    // Expand Style Memory safely
    if (!user.styleMemory) {
      user.styleMemory = { likedColors: [], likedCategories: [], likedStyles: [], interactionCount: 0 };
    }

    // Extract tags
    const newColors = Array.isArray(outfit.colors) ? outfit.colors : typeof outfit.colors === 'string' ? outfit.colors.split(',') : [];
    const newTags = Array.isArray(outfit.style_tags) ? outfit.style_tags : typeof outfit.style_tags === 'string' ? outfit.style_tags.split(',') : [];
    const cat = outfit.category;

    newColors.forEach(c => {
      const color = c.trim().toLowerCase();
      if (color && !user.styleMemory.likedColors.includes(color)) user.styleMemory.likedColors.push(color);
    });

    if (cat) {
      const cleanCat = cat.trim().toLowerCase();
      if (!user.styleMemory.likedCategories.includes(cleanCat)) user.styleMemory.likedCategories.push(cleanCat);
    }

    newTags.forEach(t => {
      const tag = t.trim().toLowerCase();
      if (tag && !user.styleMemory.likedStyles.includes(tag)) user.styleMemory.likedStyles.push(tag);
    });

    user.styleMemory.interactionCount += 1;
    await user.save();
    return res.json({ success: true, likedOutfits: user.likedOutfits, styleMemory: user.styleMemory });

  } catch (error) {
    console.error("Like Outfit Error:", error);
    res.status(500).json({ error: "Failed to process outfit like" });
  }
});

app.post("/unlike-outfit", async (req, res) => {
  try {
    const { userId, outfitId } = req.body;
    if (!userId || !outfitId) {
      return res.status(400).json({ error: "userId and outfitId required" });
    }
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.likedOutfits = user.likedOutfits.filter(lo => lo.outfitId !== outfitId.toString());
    await user.save();
    return res.json({ success: true, likedOutfits: user.likedOutfits });
  } catch (error) {
    console.error("Unlike Error:", error);
    res.status(500).json({ error: "Failed to unlike outfit" });
  }
});

app.get("/user-profile/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    // Convert generic IDs into full DB outfits
    const Outfit = mongoose.connection.useDb('outfits').model("Outfit", new mongoose.Schema({}, { strict: false }), "outfits");

    const likedIds = (user.likedOutfits || []).map(lo => lo.outfitId);
    let populatedOutfits = [];
    if (likedIds.length > 0) {
      // Search via both standard _id mapping or custom id strings
      populatedOutfits = await Outfit.find({
        $or: [{ id: { $in: likedIds } }, { _id: { $in: likedIds } }]
      }).lean();
    }

    // Remap their IDs reliably for Frontend and sort by newest likes
    populatedOutfits = populatedOutfits.map(o => ({ ...o, id: o.id || o._id.toString() }));

    return res.json({ ...user, populatedLikedOutfits: populatedOutfits });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ error: "Failed to load active profile memory" });
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
  let lastResponse = null;
  let lastError = null;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      lastResponse = await axios.post(url, payload, {
        timeout: 90000,
        headers: { "Content-Type": "application/json" },
        validateStatus: () => true,
        maxBodyLength: Infinity,
        maxContentLength: Infinity
      });

      if (lastResponse.status === 429 || lastResponse.status >= 500) {
        if (attempt < 2) {
          console.warn(`Gemini API error hit (Status ${lastResponse.status}). Retry attempt ${attempt}`);
          await sleep(2000);
          continue;
        }
      } else {
        // Success or non-retryable error (like 400, 404)
        return lastResponse;
      }
    } catch (err) {
      lastError = err;
      console.warn(`Network error reaching Gemini (${err.message}). Retry attempt ${attempt}`);
      if (attempt < 2) {
        await sleep(2000);
        continue;
      }
    }
  }

  // If we had a valid HTTP response, return it so caller can use upstreamStatus
  if (lastResponse) return lastResponse;

  // Otherwise return a fake response object to signify network failure
  return {
    status: 502,
    data: {
      error: "Hard network failure reaching Gemini",
      details: lastError ? lastError.message : "Unknown"
    }
  };
}

// outfit scorer and recommender
function getSmartRecommendations(dbOutfits, userProfile) {
  const {
    gender, bodyShape, occasion, seasonOrWeather,
    stylePreference, colorPreference, fitPreference
  } = userProfile;

  const normalize = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(v => (v || "").toString().toLowerCase().trim());
    return [(val || "").toString().toLowerCase().trim()];
  };

  const userGenderRaw = normalize(gender);
  const userGender =
    userGenderRaw.some((g) => ["men", "man", "male", "m"].includes(g)) ? "men" :
      userGenderRaw.some((g) => ["women", "woman", "female", "f"].includes(g)) ? "women" :
        "";

  const userOccasions = normalize(occasion);
  const userStyles = normalize(stylePreference);
  const userSeasons = normalize(seasonOrWeather);
  const userColors = normalize(colorPreference);
  const userBodyShape = (bodyShape || "").toString().toLowerCase().trim();
  const userFit = normalize(fitPreference);

  const intersects = (arr1, arr2) => arr1.some(a => a && arr2.some(b => b && (a.includes(b) || b.includes(a))));

  // Phase 1: FAST FILTERING
  let filtered = dbOutfits.filter(outfit => {
    const g = outfit?.gender;
    const dbGenders = Array.isArray(g) ? g : (typeof g === "string" ? [g] : []);
    const normGenders = dbGenders.map(x => (x || "").toString().toLowerCase().trim());
    if (normGenders.length === 0) return true; // missing => treat as unisex
    if (normGenders.includes("unisex") || normGenders.includes("all")) return true;
    if (!userGender) return false; // unknown user gender => don't include gendered outfits
    return normGenders.includes(userGender);
  });

  // Strict Phase 2: Occasion filtering strictly
  let strictFiltered = filtered.filter(outfit => {
    const dbOccasions = normalize(outfit.occasion);
    if (userOccasions.length > 0 && dbOccasions.length > 0) {
      return intersects(userOccasions, dbOccasions);
    }
    return true;
  });

  if (strictFiltered.length < 8) {
    console.log(`[Recommendation] Only ${strictFiltered.length} items passing strict occasion filtering. Relaxing occasion filter for fallback.`);
    strictFiltered = filtered; // fallback to gender-only filter
  }

  // Phase 3: SCORING
  let scoredOutfits = strictFiltered.map(outfit => {
    let score = 0;
    let reasons = [];

    const dbOccasions = normalize(outfit.occasion);
    const dbStyles = normalize(outfit.style_tags);
    const dbSeasons = normalize(outfit.seasons).concat(normalize(outfit.weather));
    const dbColors = normalize(outfit.colors);
    const dbBodyTypes = normalize(outfit.suitable_body_types).concat(normalize(outfit.suitable_body_type));
    const dbFit = normalize(outfit.fit);

    // Occasion (+40 or -50)
    if (userOccasions.length > 0 && dbOccasions.length > 0) {
      if (intersects(userOccasions, dbOccasions)) {
        score += 40;
        reasons.push("perfectly matches your occasion");
      } else {
        score -= 50;
      }
    }

    // Style (+30 or -30)
    if (userStyles.length > 0 && dbStyles.length > 0) {
      if (intersects(userStyles, dbStyles)) {
        score += 30;
        reasons.push("fits your chosen style");
      } else {
        score -= 30; // Mismatched style penalization
      }
    }

    // Body Type (+20)
    if (userBodyShape && dbBodyTypes.length > 0) {
      if (dbBodyTypes.some(bt => userBodyShape.includes(bt) || bt.includes(userBodyShape))) {
        score += 20;
        reasons.push("flatters your body shape");
      }
    }

    // Season (+15)
    if (userSeasons.length > 0 && dbSeasons.length > 0) {
      if (intersects(userSeasons, dbSeasons) || (userSeasons.includes("summer") && dbSeasons.includes("hot")) || (userSeasons.includes("winter") && dbSeasons.includes("cold"))) {
        score += 15;
        reasons.push("ideal for the weather/season");
      }
    }

    // Colors (+10)
    if (userColors.length > 0 && dbColors.length > 0) {
      if (intersects(userColors, dbColors)) {
        score += 10;
        reasons.push("in your preferred color palette");
      }
    }

    // Fit (+5)
    if (userFit.length > 0 && dbFit.length > 0) {
      if (intersects(userFit, dbFit)) {
        score += 5;
      }
    }

    let reasonsString = reasons.length > 0 ? reasons.join(" and ") : "A great addition to your wardrobe";
    if (reasonsString.length > 120) {
      reasonsString = reasons.slice(0, 3).join(", ") + " and more";
    }
    reasonsString = reasonsString.charAt(0).toUpperCase() + reasonsString.slice(1) + ".";

    let finalImageUrl = outfit.imageUrl || `/outfit_img/${outfit._id}.jpg`;

    return {
      id: outfit._id || outfit.id,
      _id: outfit._id,
      type: outfit.type || "Outfit",
      category: outfit.category || "",
      link: outfit.link,
      imageUrl: finalImageUrl,
      matchReasons: reasonsString,
      score: score
    };
  });

  // Filter heavily penalized outfits (meaning completely irrelevant)
  scoredOutfits = scoredOutfits.filter(o => o.score > -20);

  if (scoredOutfits.length === 0) {
    console.log("[Recommendation] Extreme fallback hit. No outfits passed threshold.");
    scoredOutfits = filtered.map(o => ({ ...o, score: 0, id: o._id, type: o.type || "Outfit", imageUrl: o.imageUrl || `/outfit_img/${o._id}.jpg` }));
  }

  // Phase 4: SORTING
  scoredOutfits.sort((a, b) => b.score - a.score);

  // Normalize scores to be out of 10 for the UI
  // Best score could be up to 120, we can linearly scale and cap it
  scoredOutfits.forEach(o => {
    let normalized = Math.round((Math.max(0, o.score) / 120) * 10);
    // Even an okay match should score decently to prevent demoralizing UI
    o.score = Math.min(10, Math.max(6, normalized));
  });

  // Phase 5: DIVERSITY & SHUFFLING
  let topCandidates = scoredOutfits.slice(0, 15);
  for (let i = topCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [topCandidates[i], topCandidates[j]] = [topCandidates[j], topCandidates[i]];
  }

  return topCandidates.slice(0, 10);
}

// =============================================
// OOTD ENGINE v2 — Score-Based Outfit Matching
// =============================================

// Shared normalizer
function _norm(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val.map(v => (v || "").toString().toLowerCase().trim()).filter(Boolean);
  return [(val || "").toString().toLowerCase().trim()].filter(Boolean);
}

function _intersects(arr1, arr2) {
  return arr1.some(a => a && arr2.some(b => b && (a.includes(b) || b.includes(a))));
}

// --- Category classifiers ---

function _isFull(catOrType) {
  const c = (catOrType || "").toLowerCase().trim();
  return (
    c.includes("dress") || c.includes("jumpsuit") || c.includes("bodysuit") ||
    c.includes("gown") || c.includes("saree") || c.includes("sari") ||
    c.includes("lehenga") || c.includes("set") || c.includes("co-ord") ||
    c.includes("coord") || c.includes("romper") || c.includes("overalls") ||
    c.includes("full") || c.includes("suit") || c.includes("anarkali") ||
    c.includes("kaftan") || c.includes("abaya") || c.includes("sherwani")
  );
}

function _isTop(catOrType) {
  const c = (catOrType || "").toLowerCase().trim();
  if (_isFull(catOrType)) return false;
  return (
    c.includes("top") || c.includes("shirt") || c.includes("blouse") ||
    c.includes("sweater") || c.includes("jacket") || c.includes("hoodie") ||
    c.includes("tank") || c.includes("vest") || c.includes("cardigan") ||
    c.includes("tunic") || c.includes("kurti") || c.includes("kurta") ||
    c.includes("tee") || c.includes("t-shirt") || c.includes("crop") ||
    c.includes("polo") || c.includes("henley") || c.includes("sweatshirt") ||
    c.includes("blazer") || c.includes("coat") || c.includes("peplum")
  );
}

function _isBottom(catOrType) {
  const c = (catOrType || "").toLowerCase().trim();
  if (_isFull(catOrType) || _isTop(catOrType)) return false;
  return (
    c.includes("bottom") || c.includes("pant") || c.includes("jean") ||
    c.includes("trouser") || c.includes("skirt") || c.includes("legging") ||
    c.includes("jogger") || c.includes("palazzo") || c.includes("churidar") ||
    c.includes("salwar") || c.includes("dhoti") || c.includes("cargo") ||
    c.includes("chino") || c.includes("culottes") ||
    (c.includes("short") && !c.includes("sleeve"))
  );
}

function _classifyOutfit(outfit) {
  const cat = (outfit.category || "").toLowerCase();
  const typ = (outfit.type || "").toLowerCase();
  if (_isFull(cat) || _isFull(typ)) return "full";
  if (_isTop(cat) || _isTop(typ)) return "top";
  if (_isBottom(cat) || _isBottom(typ)) return "bottom";
  return "unknown";
}

// --- Gender filter ---

function _matchesGender(outfit, userGender) {
  const genders = _norm(outfit.gender);
  if (genders.length === 0) return true; // missing → treat as unisex
  if (genders.includes("unisex") || genders.includes("all")) return true;
  if (!userGender) return false;
  return genders.includes(userGender);
}

function _resolveGender(userProfile) {
  const raw = _norm(userProfile.gender);
  if (raw.some(g => ["men", "man", "male", "m"].includes(g))) return "men";
  if (raw.some(g => ["women", "woman", "female", "f"].includes(g))) return "women";
  return "";
}

// --- Color compatibility ---

function isColorCompatible(colors1, colors2) {
  const c1 = _norm(colors1);
  const c2 = _norm(colors2);
  if (c1.length === 0 || c2.length === 0) return true; // no data → assume ok

  const neutrals = ["black", "white", "beige", "grey", "gray", "navy", "cream", "ivory", "khaki", "taupe", "charcoal"];

  // Rule 1: If either side has a neutral, it almost always works
  if (c1.some(c => neutrals.includes(c)) || c2.some(c => neutrals.includes(c))) return true;

  // Rule 2: Same color family is harmonious
  if (c1.some(c => c2.includes(c))) return true;

  // Rule 3: Curated complementary pairs
  const goodPairs = [
    ["blue", "burgundy"], ["blue", "white"], ["blue", "camel"],
    ["grey", "pink"], ["grey", "yellow"], ["grey", "lavender"],
    ["black", "gold"], ["black", "red"], ["black", "white"],
    ["navy", "coral"], ["navy", "mustard"], ["navy", "blush"],
    ["olive", "cream"], ["olive", "rust"], ["brown", "teal"],
    ["maroon", "gold"], ["pink", "grey"], ["teal", "coral"],
    ["white", "red"], ["beige", "brown"], ["rust", "cream"],
    ["green", "beige"], ["lavender", "white"], ["mustard", "navy"],
  ];

  for (const [a, b] of goodPairs) {
    if ((c1.some(c => c.includes(a)) && c2.some(c => c.includes(b))) ||
      (c1.some(c => c.includes(b)) && c2.some(c => c.includes(a)))) {
      return true;
    }
  }

  return false;
}

// --- Length / proportion matching ---

function isGoodLengthMatch(topOutfit, bottomOutfit) {
  const tCat = (topOutfit.category || topOutfit.type || "").toLowerCase();
  const bCat = (bottomOutfit.category || bottomOutfit.type || "").toLowerCase();
  const tFit = (topOutfit.fit || "").toLowerCase();
  const bFit = (bottomOutfit.fit || "").toLowerCase();

  // Long top (kurti/tunic) with slim/fitted bottom is classic
  const longTop = tCat.includes("kurti") || tCat.includes("kurta") || tCat.includes("tunic") || tCat.includes("long");
  const slimBottom = bFit.includes("slim") || bFit.includes("fitted") || bCat.includes("legging") || bCat.includes("churidar") || bCat.includes("jean");

  if (longTop && slimBottom) return true;

  // Cropped / short top with high-waist bottom
  const shortTop = tCat.includes("crop") || tFit.includes("cropped");
  const highWaist = bCat.includes("high") || bCat.includes("palazzo") || bCat.includes("trouser");

  if (shortTop && highWaist) return true;

  // Tucked-in shirt scenario: fitted top + tailored bottom
  if (tFit === "fitted" && (bCat.includes("trouser") || bCat.includes("skirt"))) return true;

  return false;
}

// --- Hard incompatibility rules ---

const INCOMPATIBLE_PAIRS = [
  // [topPattern, bottomPattern] - if top category matches & bottom category matches → block
  { top: "kurti", bottom: "mini skirt", reason: "Ethnic top with western mini skirt" },
  { top: "kurta", bottom: "mini skirt", reason: "Ethnic top with western mini skirt" },
  { top: "blazer", bottom: "jogger", reason: "Formal blazer with casual joggers" },
  { top: "hoodie", bottom: "formal", reason: "Casual hoodie with formal bottom" },
  { top: "kurti", bottom: "cargo", reason: "Ethnic top with utility cargo" },
  { top: "kurta", bottom: "cargo", reason: "Ethnic top with utility cargo" },
  { top: "crop", bottom: "dhoti", reason: "Western crop with ethnic dhoti" },
  { top: "sherwani", bottom: "jean", reason: "Heavy ethnic with casual denim" },
];

function isIncompatible(topOutfit, bottomOutfit) {
  const tCat = (topOutfit.category || topOutfit.type || "").toLowerCase();
  const bCat = (bottomOutfit.category || bottomOutfit.type || "").toLowerCase();

  for (const rule of INCOMPATIBLE_PAIRS) {
    if (tCat.includes(rule.top) && bCat.includes(rule.bottom)) {
      return rule.reason;
    }
  }
  return null;
}

// --- Compatible category bonuses ---

const GOOD_CATEGORY_PAIRS = [
  { top: "kurti", bottoms: ["jean", "legging", "palazzo", "churidar", "salwar", "trouser"], bonus: 25 },
  { top: "kurta", bottoms: ["jean", "legging", "palazzo", "churidar", "salwar", "chino"], bonus: 25 },
  { top: "shirt", bottoms: ["jean", "trouser", "chino", "short", "skirt"], bonus: 20 },
  { top: "blouse", bottoms: ["skirt", "trouser", "palazzo", "jean"], bonus: 20 },
  { top: "t-shirt", bottoms: ["jean", "jogger", "short", "cargo", "chino"], bonus: 20 },
  { top: "tee", bottoms: ["jean", "jogger", "short", "cargo", "chino"], bonus: 20 },
  { top: "hoodie", bottoms: ["jean", "jogger", "cargo", "sweatpant"], bonus: 18 },
  { top: "blazer", bottoms: ["trouser", "jean", "skirt", "chino"], bonus: 22 },
  { top: "sweater", bottoms: ["jean", "trouser", "skirt", "legging"], bonus: 18 },
  { top: "crop", bottoms: ["palazzo", "skirt", "jean", "trouser"], bonus: 18 },
  { top: "tank", bottoms: ["jean", "short", "skirt", "palazzo"], bonus: 15 },
  { top: "polo", bottoms: ["chino", "jean", "trouser", "short"], bonus: 18 },
  { top: "peplum", bottoms: ["jean", "trouser", "skirt", "legging"], bonus: 18 },
];

function getCategoryBonus(topOutfit, bottomOutfit) {
  const tCat = (topOutfit.category || topOutfit.type || "").toLowerCase();
  const bCat = (bottomOutfit.category || bottomOutfit.type || "").toLowerCase();

  for (const rule of GOOD_CATEGORY_PAIRS) {
    if (tCat.includes(rule.top)) {
      if (rule.bottoms.some(b => bCat.includes(b))) {
        return rule.bonus;
      }
    }
  }
  return 0;
}

// --- Pattern balance ---

function getPatternScore(topOutfit, bottomOutfit) {
  const tPatterns = _norm(topOutfit.patterns);
  const bPatterns = _norm(bottomOutfit.patterns);

  const isSolid = (p) => p.length === 0 || p.includes("solid") || p.includes("plain");
  const isPattern = (p) => !isSolid(p);

  // Best: one solid + one pattern
  if (isSolid(tPatterns) && isPattern(bPatterns)) return 10;
  if (isPattern(tPatterns) && isSolid(bPatterns)) return 10;
  // OK: both solid
  if (isSolid(tPatterns) && isSolid(bPatterns)) return 5;
  // Bad: both patterned (clashing)
  if (isPattern(tPatterns) && isPattern(bPatterns)) return -10;

  return 0;
}

// =============================================
// MAIN: calculateOutfitScore
// =============================================

function calculateOutfitScore(topOutfit, bottomOutfit, userProfile) {
  let score = 0;
  let reasons = [];

  const userOccasions = _norm(userProfile.occasion);
  const userStyles = _norm(userProfile.stylePreference);
  const userBodyShape = (userProfile.bodyShape || "").toLowerCase().trim();
  const userFit = _norm(userProfile.fitPreference);

  // --- RULE 0: HARD INCOMPATIBILITY (instant reject) ---
  const blocked = isIncompatible(topOutfit, bottomOutfit);
  if (blocked) {
    return { score: -Infinity, reasons: [`Blocked: ${blocked}`] };
  }

  // --- RULE 1: CATEGORY COMPATIBILITY BONUS ---
  const catBonus = getCategoryBonus(topOutfit, bottomOutfit);
  if (catBonus > 0) {
    score += catBonus;
    reasons.push("Great category pairing");
  }

  // --- RULE 2: FIT / SILHOUETTE BALANCE ---
  const tFit = (topOutfit.fit || "").toLowerCase();
  const bFit = (bottomOutfit.fit || "").toLowerCase();

  if (tFit && bFit && tFit !== bFit) {
    score += 15;
    reasons.push("Balanced silhouette");
  } else if (tFit && bFit && tFit === bFit) {
    // Same fit is okay for fitted+fitted, bad for loose+loose
    if (tFit.includes("loose") || tFit.includes("oversized") || tFit.includes("relaxed")) {
      score -= 10;
    }
  }

  // Specific good combos
  if ((tFit.includes("fitted") && bFit.includes("loose")) || (tFit.includes("loose") && bFit.includes("fitted"))) {
    score += 10; // extra bonus for classic balance
  }

  // --- RULE 3: STYLE CONSISTENCY ---
  const tStyles = _norm(topOutfit.style_tags);
  const bStyles = _norm(bottomOutfit.style_tags);

  if (tStyles.length > 0 && bStyles.length > 0) {
    if (_intersects(tStyles, bStyles)) {
      score += 20;
      reasons.push("Consistent style");
    } else {
      score -= 15;
    }
  }

  // --- RULE 4: OCCASION MATCH (HIGH PRIORITY) ---
  const tOccs = _norm(topOutfit.occasion);
  const bOccs = _norm(bottomOutfit.occasion);

  if (userOccasions.length > 0) {
    const topMatch = tOccs.length === 0 || _intersects(tOccs, userOccasions);
    const bottomMatch = bOccs.length === 0 || _intersects(bOccs, userOccasions);

    if (topMatch && bottomMatch) {
      score += 30;
      reasons.push("Perfect for your occasion");
    } else if (topMatch || bottomMatch) {
      score += 10;
    } else {
      score -= 30;
    }
  }

  // --- RULE 5: COLOR COMPATIBILITY ---
  if (isColorCompatible(topOutfit.colors, bottomOutfit.colors)) {
    score += 20;
    reasons.push("Harmonious colors");
  } else {
    score -= 15;
  }

  // --- RULE 6: PATTERN BALANCE ---
  score += getPatternScore(topOutfit, bottomOutfit);

  // --- RULE 7: LENGTH / PROPORTION ---
  if (isGoodLengthMatch(topOutfit, bottomOutfit)) {
    score += 10;
    reasons.push("Great proportions");
  }

  // --- RULE 8: VERSATILE ITEMS BOOST ---
  const bCat = (bottomOutfit.category || bottomOutfit.type || "").toLowerCase();
  if (bCat.includes("jean") || bCat.includes("chino")) score += 10;

  // --- RULE 9: BODY TYPE MATCH ---
  if (userBodyShape) {
    const tBody = _norm(topOutfit.suitable_body_types).concat(_norm(topOutfit.suitable_body_type));
    const bBody = _norm(bottomOutfit.suitable_body_types).concat(_norm(bottomOutfit.suitable_body_type));
    if (tBody.some(bt => userBodyShape.includes(bt) || bt.includes(userBodyShape))) score += 10;
    if (bBody.some(bt => userBodyShape.includes(bt) || bt.includes(userBodyShape))) score += 10;
  }

  // --- RULE 10: FIT PREFERENCE MATCH ---
  if (userFit.length > 0) {
    if (tFit && userFit.some(f => tFit.includes(f))) score += 5;
    if (bFit && userFit.some(f => bFit.includes(f))) score += 5;
  }

  return { score, reasons };
}

// =============================================
// MAIN: generateOOTD
// =============================================

function generateOOTD(dbOutfits, userProfile) {
  const userGender = _resolveGender(userProfile);
  const userOccasions = _norm(userProfile.occasion);
  const userStyles = _norm(userProfile.stylePreference);

  // Extract recent history IDs for repetition control
  const recentHistory = userProfile.history || [];
  const recentOotdIds = recentHistory.flatMap(h => {
    const matches = [];
    if (h.analysisData && h.analysisData.dbOutfits) {
      h.analysisData.dbOutfits.forEach(o => matches.push(o.id || o._id));
    }
    return matches;
  }).map(id => (id || "").toString());

  // ==== STEP 1: CLASSIFY & SPLIT OUTFITS ====
  const genderFiltered = dbOutfits.filter(o => _matchesGender(o, userGender));

  const tops = [];
  const bottoms = [];
  const fullOutfits = [];

  for (const o of genderFiltered) {
    const cls = _classifyOutfit(o);
    if (cls === "top") tops.push(o);
    else if (cls === "bottom") bottoms.push(o);
    else if (cls === "full") fullOutfits.push(o);
    // "unknown" items are skipped
  }

  console.log(`[OOTD v2] Gender: ${userGender} | Tops: ${tops.length} | Bottoms: ${bottoms.length} | Full: ${fullOutfits.length}`);

  // ==== STEP 2: SINGLE-PIECE PRIORITY (30% chance) ====
  const shouldTryFull = fullOutfits.length > 0 && Math.random() < 0.3;

  function getBestFullOutfit() {
    if (fullOutfits.length === 0) return null;

    // Score full outfits using the existing recommendation scorer
    const scoredFull = getSmartRecommendations(fullOutfits, userProfile);
    if (scoredFull.length === 0) return null;

    // Apply repetition penalty and pick best
    let best = null;
    let bestRawScore = -Infinity;

    for (const item of scoredFull) {
      let rawScore = item.score;
      if (recentOotdIds.includes((item.id || "").toString())) rawScore -= 3;
      if (rawScore > bestRawScore) {
        bestRawScore = rawScore;
        best = item;
      }
    }

    if (!best) return null;

    return {
      type: "full",
      ...best,
      matchReasons: best.matchReasons || "A stylish single-piece look curated for you.",
    };
  }

  if (shouldTryFull) {
    const fullResult = getBestFullOutfit();
    if (fullResult) {
      console.log(`[OOTD v2] Returning full outfit: ${fullResult.type} / ${fullResult.id}`);
      return fullResult;
    }
  }

  // ==== STEP 3: TOP + BOTTOM COMBO ====

  // Pre-filter by occasion (with fallback)
  let candidateTops = tops.filter(o => userOccasions.length === 0 || _intersects(_norm(o.occasion), userOccasions));
  let candidateBottoms = bottoms.filter(o => userOccasions.length === 0 || _intersects(_norm(o.occasion), userOccasions));

  if (candidateTops.length === 0) candidateTops = tops;
  if (candidateBottoms.length === 0) candidateBottoms = bottoms;

  // Soft style filter — prefer matching styles but don't hard-require
  const styledTops = candidateTops.filter(o => _intersects(_norm(o.style_tags), userStyles));
  const styledBottoms = candidateBottoms.filter(o => _intersects(_norm(o.style_tags), userStyles));

  const finalTops = styledTops.length >= 2 ? styledTops : candidateTops;
  const finalBottoms = styledBottoms.length >= 2 ? styledBottoms : candidateBottoms;

  // Score individual items to get top candidates (max 8 each to keep O(n²) manageable)
  const scoredTops = getSmartRecommendations(finalTops, userProfile).slice(0, 8);
  const scoredBottoms = getSmartRecommendations(finalBottoms, userProfile).slice(0, 8);

  console.log(`[OOTD v2] Candidate tops: ${scoredTops.length}, Candidate bottoms: ${scoredBottoms.length}`);

  if (scoredTops.length === 0 || scoredBottoms.length === 0) {
    // Can't make a combo — try full outfit
    const fallbackFull = getBestFullOutfit();
    if (fallbackFull) return fallbackFull;

    // Absolute fallback
    const anyRec = getSmartRecommendations(dbOutfits, userProfile)[0] || null;
    return anyRec;
  }

  // ==== STEP 4: SCORE ALL TOP×BOTTOM COMBINATIONS ====

  let bestCombo = null;
  let bestScore = -Infinity;
  let bestReasons = [];

  for (const topItem of scoredTops) {
    // Look up the raw outfit data for scoring
    const rawTop = genderFiltered.find(o => (o._id || o.id).toString() === topItem.id.toString()) || {};

    for (const bottomItem of scoredBottoms) {
      const rawBottom = genderFiltered.find(o => (o._id || o.id).toString() === bottomItem.id.toString()) || {};

      // Calculate pair score
      const { score: pairScore, reasons } = calculateOutfitScore(rawTop, rawBottom, userProfile);

      if (pairScore === -Infinity) continue; // Hard blocked

      // Total score = individual item relevance + pair compatibility
      let totalScore = pairScore;

      // Repetition control
      if (recentOotdIds.includes((topItem.id || "").toString())) totalScore -= 20;
      if (recentOotdIds.includes((bottomItem.id || "").toString())) totalScore -= 25;

      if (totalScore > bestScore) {
        bestScore = totalScore;
        bestReasons = reasons;
        bestCombo = { top: topItem, bottom: bottomItem };
      }
    }
  }

  // ==== STEP 5: THRESHOLD CHECK ====
  const COMBO_THRESHOLD = 20;

  if (bestCombo && bestScore >= COMBO_THRESHOLD) {
    // Normalize display score to 1-10
    let displayScore = Math.min(10, Math.max(6, Math.round((Math.max(0, bestScore) / 120) * 10)));
    if (bestScore > 100) displayScore = 10;

    const reasonText = bestReasons.length > 0
      ? bestReasons.slice(0, 3).join(", ") + "."
      : `Professionally curated for your ${userOccasions[0] || "style"} preference.`;

    console.log(`[OOTD v2] Returning combo (score: ${bestScore}): ${reasonText}`);

    return {
      type: "combo",
      top: bestCombo.top,
      bottom: bestCombo.bottom,
      score: displayScore,
      matchReasons: reasonText.charAt(0).toUpperCase() + reasonText.slice(1),
    };
  }

  // ==== STEP 6: FALLBACK — score too low, try full outfit instead ====
  console.log(`[OOTD v2] Combo score (${bestScore}) below threshold (${COMBO_THRESHOLD}). Falling back to full outfit.`);

  const fallbackFull = getBestFullOutfit();
  if (fallbackFull) return fallbackFull;

  // If still no full outfit, return best combo anyway (better than nothing)
  if (bestCombo) {
    let displayScore = Math.min(10, Math.max(6, Math.round((Math.max(0, bestScore) / 80) * 10)));
    return {
      type: "combo",
      top: bestCombo.top,
      bottom: bestCombo.bottom,
      score: displayScore,
      matchReasons: "AI curated smart pair based on available wardrobe matches.",
    };
  }

  // Absolute final fallback
  console.log(`[OOTD v2] Absolute fallback — returning top recommendation.`);
  return getSmartRecommendations(dbOutfits, userProfile)[0] || null;
}

// ==========================================
// PREPROCESS IMAGE: RUN PYTHON FACE PIPELINE
// Returns censored image for user review BEFORE sending to Gemini API
// ==========================================
app.post("/api/preprocess-image", async (req, res) => {
  try {
    const { image } = req.body || {};
    const parsedImage = parseImageBase64(image);

    if (!parsedImage || !parsedImage.data) {
      return res.status(400).json({ error: "No image provided" });
    }

    let finalImageData = parsedImage.data;
    let faceDetected = false;
    let faceShape = "Unknown";
    let contrastLevel = "Unknown";

    try {
      const imageBuffer = Buffer.from(parsedImage.data, 'base64');
      const form = new FormData();
      form.append('file', imageBuffer, {
        filename: 'upload.jpg',
        contentType: parsedImage.mimeType || 'image/jpeg'
      });

      const pythonUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
      const pyResponse = await axios.post(`${pythonUrl}/analyze-face`, form, {
        headers: {
          ...form.getHeaders()
        },
        timeout: 30000
      });

      if (pyResponse.data) {
        if (pyResponse.data.faceShape) faceShape = pyResponse.data.faceShape;
        if (pyResponse.data.contrastLevel) contrastLevel = pyResponse.data.contrastLevel;
        if (pyResponse.data.status === "success" && pyResponse.data.censoredImage) {
          finalImageData = pyResponse.data.censoredImage;
          faceDetected = true;
          console.log("[/api/preprocess-image] Face successfully detected and censored.");
        } else if (pyResponse.data.censoredImage) {
          finalImageData = pyResponse.data.censoredImage;
          faceDetected = (pyResponse.data.status === "success");
          console.log("[/api/preprocess-image] Python returned image. Status:", pyResponse.data.status);
        }

        const censorPath = path.join(__dirname, 'censored_latest.jpg');
        fs.writeFileSync(censorPath, Buffer.from(finalImageData, 'base64'));
        console.log(`\n\n🟢 PREVIEW CENSORED IMAGE CREATED: file:///${censorPath.replace(/\\/g, '/')}\n\n`);
      }
    } catch (pyErr) {
      console.warn("[/api/preprocess-image] Python microservice failed or unreachable:", pyErr.message);
    }

    return res.json({
      success: true,
      censoredImage: `data:image/jpeg;base64,${finalImageData}`,
      faceDetected,
      faceShape,
      contrastLevel,
    });
  } catch (err) {
    console.error("Error in /api/preprocess-image:", err);
    return res.status(500).json({ error: "Failed to preprocess image" });
  }
});

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
      isPreprocessed,
      faceShape: passedFaceShape,
      contrastLevel: passedContrastLevel,
    } = req.body || {};

    // Support user-provided custom Gemini API key (from request body, header, or user settings)
    let providedApiKey = (req.body?.geminiApiKey || req.headers?.['x-gemini-api-key'] || '').toString().trim();
    if (!providedApiKey && userId && mongoose.Types.ObjectId.isValid(userId)) {
      const u = await User.findById(userId).select('settings').lean();
      if (u?.settings?.geminiApiKey) {
        providedApiKey = u.settings.geminiApiKey.trim();
      }
    }
    const effectiveApiKey = providedApiKey || process.env.GEMINI_API_KEY;

    if (!effectiveApiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY missing. Please set it in .env or provide your custom Gemini API key in Settings."
      });
    }

    // CACHING BLOCK: Avoid hitting pipeline if no new image is provided
    let dbUser = null;
    if (userId) {
      dbUser = await User.findById(userId).lean();
      if (dbUser && dbUser.profileAnalyzed && dbUser.analysis && !image) {
        console.log(`[Cache Hit] Returning cached analysis for user ${userId}. Bypassing Gemini/Python pipeline.`);
        let analysis = dbUser.analysis;

        try {
          const dbOutfits = await Outfit.find({}).lean();
          const rawUserGender = (req.body?.userGender || gender || dbUser.gender || "").toString().toLowerCase().trim();
          const userGender = ["men", "man", "male", "m"].includes(rawUserGender) ? "men" : ["women", "woman", "female", "f"].includes(rawUserGender) ? "women" : "";

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

          const recommended = getSmartRecommendations(dbOutfits, userProfile);
          analysis.dbOutfits = recommended.slice(0, 5);
        } catch (e) {
          analysis.dbOutfits = [];
        }

        // Natively return without running APIs
        return res.json(analysis);
      }
    }

    const parsedImage = parseImageBase64(image);

    if (!parsedImage || !parsedImage.data) {
      return res.status(400).json({
        error: "No image provided"
      });
    }

    // ==== HYBRID PYTHON PIPELINE / PREPROCESSED BYPASS ====
    let finalImageData = parsedImage.data;
    let finalMimeType = parsedImage.mimeType;
    let pyFaceShape = passedFaceShape || "Unknown";
    let pyContrastLevel = passedContrastLevel || "Unknown";

    if (isPreprocessed) {
      console.log("[/analyze-style] Image was preprocessed and verified by user. Bypassing python microservice.");
      const censorPath = path.join(__dirname, 'censored_latest.jpg');
      fs.writeFileSync(censorPath, Buffer.from(finalImageData, 'base64'));
      console.log(`\n\n🟢 USER-APPROVED CENSORED IMAGE SENT TO GEMINI API! View it here: file:///${censorPath.replace(/\\/g, '/')}\n\n`);
    } else {
      try {
        const imageBuffer = Buffer.from(parsedImage.data, 'base64');
        const form = new FormData();
        form.append('file', imageBuffer, {
          filename: 'upload.jpg',
          contentType: parsedImage.mimeType || 'image/jpeg'
        });

        const pythonUrl = process.env.PYTHON_API_URL || 'http://localhost:8000';
        const pyResponse = await axios.post(`${pythonUrl}/analyze-face`, form, {
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
7. You MUST be deterministic. Given the same image, always return the same classification. Do not vary between similar categories.
8. All outputs MUST strictly belong to predefined standard categories.

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
        responseMimeType: "application/json",
        temperature: 0.2,
        topP: 0.8,
        topK: 40
      }
    };

    let geminiResponse;
    let successfulModel = null;
    let lastErrorData = null;
    let lastStatus = 500;

    const models = ["gemini-1.5-flash", "gemini-1.5-flash-latest", "gemini-2.0-flash", "gemini-2.0-flash-exp", "gemini-3-flash-preview"];

    for (const modelName of GEMINI_MODELS_TO_TRY) {
      console.log(`Calling Gemini model: ${modelName} ${providedApiKey ? '(using custom user API key)' : '(using server default key)'}`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${effectiveApiKey}`;

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

    // Normalize Gemini output for consistency locking and strict casing limits
    const toTitleCase = (str) => {
      if (!str || typeof str !== 'string') return str;
      return str.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    };
    analysis.undertone = toTitleCase(analysis.undertone);
    analysis.contrastLevel = toTitleCase(analysis.contrastLevel);
    analysis.colorSeason = toTitleCase(analysis.colorSeason);
    analysis.bodyShape = toTitleCase(analysis.bodyShape);
    analysis.faceShape = toTitleCase(analysis.faceShape);

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
      const dbOutfits = await Outfit.find({}).lean(); // Critical fix: Output pure javascript objects, bypassing heavy classes causing CastErrors.
      const rawUserGender = (req.body?.userGender || gender || "").toString().toLowerCase().trim();
      const userGender =
        ["men", "man", "male", "m"].includes(rawUserGender) ? "men" :
          ["women", "woman", "female", "f"].includes(rawUserGender) ? "women" :
            "";

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

      const recommended = getSmartRecommendations(dbOutfits, userProfile);

      // Top 5 purely for immediate analysis display
      analysis.dbOutfits = recommended.slice(0, 5);

      // Save to User collection if userId is provided
      if (userId) {
        const updateData = {
          gender: userGender || "unisex",
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

        const newHistoryEntry = {
          date: new Date(),
          season: analysis.colorSeason || "Unknown",
          undertone: analysis.undertone || "Unknown",
          ootdUrl: analysis.dbOutfits?.[0]?.imageUrl || "",
          analysisData: analysis
        };

        await User.findByIdAndUpdate(userId, {
          $set: updateData,
          $push: {
            history: {
              $each: [newHistoryEntry],
              $position: 0,
              $slice: 10
            }
          }
        }, { new: true });

        // -- Dedicated Tab Save --
        try {
          const occasionName = (Array.isArray(occasion) ? occasion[0] : occasion) || "Style";
          await AnalysisHistory.create({
            userId: userId,
            analysisName: `${occasionName.charAt(0).toUpperCase() + occasionName.slice(1)} Look`,
            faceShape: analysis.faceShape,
            bodyShape: analysis.bodyShape,
            skinTone: analysis.skinTone,
            undertone: analysis.undertone,
            contrastLevel: analysis.contrastLevel,
            bestColors: analysis.bestNeutrals ? [...analysis.bestNeutrals, ...(analysis.bestAccentColors || [])] : [],
            avoidColors: analysis.avoidColors || [],
            recommendedOutfits: (analysis.dbOutfits || []).map(o => ({
              outfitId: o.id || o._id,
              type: o.type || o.category || "Outfit",
              imageUrl: o.imageUrl,
              link: o.link,
              score: o.score
            }))
          });

          // Keep only last 5
          const analyses = await AnalysisHistory.find({ userId }).sort({ createdAt: -1 });
          if (analyses.length > 5) {
            const idsToDelete = analyses.slice(5).map(a => a._id);
            await AnalysisHistory.deleteMany({ _id: { $in: idsToDelete } });
          }
        } catch (hErr) {
          console.error("Error updating AnalysisHistory coll:", hErr);
        }
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
      gender: user.gender || "unisex",
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

    const allRecommendations = getSmartRecommendations(dbOutfits, userProfile);

    const outfitOfTheDay = generateOOTD(dbOutfits, userProfile);
    let recommendedOutfits = [...allRecommendations];

    if (outfitOfTheDay) {
      // filter out the top and bottom from recommendations to avoid duplicates
      recommendedOutfits = recommendedOutfits.filter(o =>
        o.id !== outfitOfTheDay.top?.id && o.id !== outfitOfTheDay.bottom?.id
      );
    }

    // Construct Response
    return res.json({
      success: true,
      userName: user.name,
      userAnalysis: user.analysis,
      styleInsights: {
        season: user.analysis?.colorSeason || "Unknown",
        undertone: user.analysis?.undertone || "Unknown",
        bestColors: (user.analysis?.bestNeutrals || []).map(c => c.hex).concat((user.analysis?.bestAccentColors || []).map(c => c.hex)).filter(Boolean),
        avoidColors: (user.analysis?.avoidColors || []).map(c => c.hex).filter(Boolean),
        necklines: user.analysis?.necklines?.recommended || [],
      },
      outfitOfTheDay,
      recommendedOutfits,
      stylingHistory: user.history || [],
      likedOutfits: user.likedOutfits || []
    });

  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).json({ error: "Failed to load dashboard data" });
  }
});

// GET /api/analysis-history/:userId
app.get("/api/analysis-history/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const history = await AnalysisHistory.find({ userId })
      .sort({ createdAt: -1 })
      .select("_id analysisName createdAt");
    res.json(history);
  } catch (error) {
    console.error("Fetch history summary error:", error);
    res.status(500).json({ error: "Failed to fetch history list" });
  }
});

// GET /api/analysis-history/detail/:id
app.get("/api/analysis-history/detail/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const detail = await AnalysisHistory.findById(id);
    if (!detail) return res.status(404).json({ error: "Analysis not found" });
    res.json(detail);
  } catch (error) {
    console.error("Fetch history detail error:", error);
    res.status(500).json({ error: "Failed to fetch history detail" });
  }
});

// POST /virtual-tryon
app.post("/virtual-tryon", async (req, res) => {
  try {
    const { personImage, outfitImage, category } = req.body;

    if (!personImage || !outfitImage) {
      return res.status(400).json({ error: "Both personImage and outfitImage are required" });
    }

    if (!process.env.FASHN_API_KEY) {
      return res.status(500).json({ error: "Internal Server Error: Missing FASHN_API_KEY in environment" });
    }

    const payload = {
      model_name: "tryon-v1.6",
      inputs: {
        model_image: personImage,
        garment_image: outfitImage,
        category: category || "tops"
      }
    };

    // 1. Submit Job to Fashn.ai
    const response = await axios.post("https://api.fashn.ai/v1/run", payload, {
      headers: {
        "Authorization": `Bearer ${process.env.FASHN_API_KEY}`,
        "Content-Type": "application/json"
      }
    });

    const jobId = response.data?.id;
    if (!jobId) {
      return res.status(500).json({ error: "Failed to receive a valid Job ID from FASHN.ai" });
    }

    // 2. Asynchronous Polling
    let status = "starting";
    let attempts = 0;
    const maxAttempts = 30; // Max ~90 seconds

    while (status !== "completed" && status !== "failed" && attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 3000));
      attempts++;

      const check = await axios.get(`https://api.fashn.ai/v1/status/${jobId}`, {
        headers: {
          "Authorization": `Bearer ${process.env.FASHN_API_KEY}`
        }
      });

      status = check.data?.status || status;

      if (status === "completed") {
        const resultImage = check.data?.output?.[0];
        if (!resultImage) {
          return res.status(500).json({ error: "FASHN.ai completed successfully but returned no image" });
        }
        return res.json({ success: true, resultImage });
      }

      if (status === "failed") {
        return res.status(500).json({ error: "FASHN.ai job failed during processing" });
      }
    }

    if (attempts >= maxAttempts) {
      return res.status(504).json({ error: "Virtual Try-on request timed out while polling the model" });
    }

  } catch (error) {
    console.error("Virtual Try-on Error:", error?.response?.data || error.message);
    res.status(500).json({
      error: "Virtual try-on failed",
      details: error?.response?.data?.error?.message || error?.response?.data?.message || error.message
    });
  }
});

// ==== SETTINGS ROUTES ====

// GET /user/settings/:userId - Fetch user settings with defaults
app.get("/user/settings/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Valid userId is required" });
    }

    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: "User not found" });

    // Return settings with safe defaults
    const defaults = {
      stylePreferences: { styles: [], fitPreference: "", colorComfort: "" },
      avoid: { colors: [], patterns: [], fits: [] },
      privacy: { blurFace: true, storeImages: false, deleteAfterAnalysis: true },
      notifications: { ootd: true, recommendations: true },
      theme: { mode: "light" },
      geminiApiKey: ""
    };

    const settings = user.settings || {};
    const merged = {
      stylePreferences: { ...defaults.stylePreferences, ...settings.stylePreferences },
      avoid: { ...defaults.avoid, ...settings.avoid },
      privacy: { ...defaults.privacy, ...settings.privacy },
      notifications: { ...defaults.notifications, ...settings.notifications },
      theme: { ...defaults.theme, ...settings.theme },
      geminiApiKey: settings.geminiApiKey || ""
    };

    return res.json({
      success: true,
      settings: merged,
      profile: { name: user.name, email: user.email }
    });
  } catch (err) {
    console.error("Get settings error:", err);
    return res.status(500).json({ error: "Failed to fetch settings" });
  }
});

// PUT /user/settings - Deep merge update settings
app.put("/user/settings", async (req, res) => {
  try {
    const { userId, settings } = req.body || {};

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Valid userId is required" });
    }
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ error: "Settings object is required" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Build dot-notation $set object for deep merge
    const setObj = {};
    for (const section of Object.keys(settings)) {
      if (typeof settings[section] === "object" && settings[section] !== null && !Array.isArray(settings[section])) {
        for (const field of Object.keys(settings[section])) {
          setObj[`settings.${section}.${field}`] = settings[section][field];
        }
      } else {
        setObj[`settings.${section}`] = settings[section];
      }
    }

    if (Object.keys(setObj).length === 0) {
      return res.status(400).json({ error: "No valid settings fields to update" });
    }

    await User.updateOne({ _id: userId }, { $set: setObj });

    // Fetch updated settings for response
    const updated = await User.findById(userId).lean();
    return res.json({ success: true, settings: updated.settings });
  } catch (err) {
    console.error("Update settings error:", err);
    return res.status(500).json({ error: "Failed to update settings" });
  }
});

// POST /api/verify-gemini-key - Verify if a custom Gemini API key is valid
app.post("/api/verify-gemini-key", async (req, res) => {
  try {
    const { apiKey } = req.body || {};
    const keyToTest = (apiKey || "").toString().trim();
    if (!keyToTest) {
      return res.status(400).json({ success: false, error: "Please enter a Gemini API key to test." });
    }

    const testUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${keyToTest}`;
    const testPayload = {
      contents: [{ parts: [{ text: "Respond with OK" }] }]
    };

    const resp = await callGemini(testUrl, testPayload);
    if (resp.status < 400 && resp.data?.candidates) {
      return res.json({ success: true, message: "Gemini API key is valid and working!" });
    } else {
      const errMsg = resp.data?.error?.message || "Invalid or unauthorized Gemini API key.";
      return res.status(400).json({ success: false, error: errMsg });
    }
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message || "Failed to verify API key" });
  }
});

// NEW: Analyze a specific garment
app.post("/api/analyze-garment", async (req, res) => {
  const { image, userId } = req.body;
  if (!image) return res.status(400).json({ error: "Image is required" });

  try {
    // 1. Prepare Gemini payload (image is base64)
    const base64Data = image.includes("base64,") ? image.split("base64,")[1] : image;

    // We'll ask for a structured JSON response
    const prompt = `Analyze this clothing item/garment image. Provide a sophisticated fashion analysis in JSON format. 
    JSON structure:
    {
      "description": "Short stylish description of the item",
      "colorPalettes": [
        {"name": "Palette Name 1", "colors": ["#hex1", "#hex2", "#hex3"]},
        {"name": "Palette Name 2", "colors": ["#hex4", "#hex5", "#hex6"]}
      ],
      "complementaryItems": ["item 1", "item 2", "item 3", "item 4"],
      "stylingTips": ["tip 1", "tip 2", "tip 3", "tip 4"],
      "matchingAccessories": ["accessory 1", "accessory 2", "accessory 3"]
    }
    Be expert, specific, and ensure color choices are harmonious.`;

    const geminiPayload = {
      contents: [{
        parts: [
          { text: prompt },
          {
            inline_data: {
              mime_type: "image/jpeg",
              data: base64Data
            }
          }
        ]
      }]
    };

    let garmentApiKey = (req.body?.geminiApiKey || req.headers?.['x-gemini-api-key'] || '').toString().trim();
    if (!garmentApiKey && userId && mongoose.Types.ObjectId.isValid(userId)) {
      const u = await User.findById(userId).select('settings').lean();
      if (u?.settings?.geminiApiKey) {
        garmentApiKey = u.settings.geminiApiKey.trim();
      }
    }
    const effectiveGarmentKey = garmentApiKey || process.env.GEMINI_API_KEY;

    let geminiResponse;
    let lastErrorData = null;

    for (const modelName of GEMINI_MODELS_TO_TRY) {
      console.log(`[AnalyzeGarment] Trying model: ${modelName} ${garmentApiKey ? '(using custom user API key)' : '(using server default key)'}`);
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${effectiveGarmentKey}`;

      geminiResponse = await callGemini(url, geminiPayload);

      if (geminiResponse.status < 400) {
        break;
      }
      lastErrorData = geminiResponse.data;
    }

    if (!geminiResponse || geminiResponse.status >= 400) {
      return res.status(500).json({ error: "Gemini analysis failed", details: lastErrorData });
    }

    const textOutput = geminiResponse.data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    // Extract JSON
    let analysis;
    try {
      const jsonMatch = textOutput.match(/\{[\s\S]*\}/);
      analysis = JSON.parse(jsonMatch ? jsonMatch[0] : textOutput);
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", textOutput);
      return res.status(500).json({ error: "Could not parse AI response", raw: textOutput });
    }

    res.json({ success: true, analysis });

  } catch (err) {
    console.error("Garment analysis error:", err);
    res.status(500).json({ error: "Internal server error during analysis" });
  }
});

const PORT = 5000;
const os = require("os");

// Configure global Axios interceptors for Express backend outbound requests
axios.interceptors.request.use(
  (config) => {
    console.log(`[Backend Axios Request] ${config.method?.toUpperCase()} -> ${config.url}`);
    return config;
  },
  (error) => {
    console.error('[Backend Axios Request Setup Error]', error);
    return Promise.reject(error);
  }
);

axios.interceptors.response.use(
  (response) => {
    console.log(`[Backend Axios Response] ${response.status} <- ${response.config?.url}`);
    return response;
  },
  (error) => {
    console.error(`[Backend Axios Network Error] Failed request to: ${error.config?.url || 'unknown URL'}`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      data: error.response?.data,
      stack: error.stack
    });
    return Promise.reject(error);
  }
);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`\n==================================================`);
  console.log(`🚀 Node.js Backend listening on port ${PORT}`);
  console.log(`🔗 Local Loopback: http://localhost:${PORT}`);

  // Log all available network interfaces
  const interfaces = os.networkInterfaces();
  console.log('📡 Available Network Interfaces:');
  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4') {
        console.log(`   - ${name}: http://${net.address}:${PORT}`);
      }
    }
  }
  console.log(`==================================================\n`);
});

// AI Chatbot endpoint
app.post("/api/chat", async (req, res) => {
  const { messages, userId } = req.body;

  try {
    let userContext = "";
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      const user = await User.findById(userId);
      if (user) {
        userContext = `\n\nUser Context:\nGender: ${user.gender}\nSeason: ${user.analysis?.colorSeason}\nUndertone: ${user.analysis?.undertone}\nBody Shape: ${user.analysis?.bodyShape}`;
      }
    }

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: `You are the AI Stylist assistant. Help users with fashion, style advice, and outfit recommendations based on their analysis.${userContext}\n\nKeep advice concise and encouraging.`
        },
        ...messages
      ],
      model: "llama-3.3-70b-versatile",
    });

    res.json({ content: chatCompletion.choices[0].message.content });
  } catch (error) {
    console.error("Groq Chat Error:", error);
    res.status(500).json({ error: "Failed to get response from Groq" });
  }
});

process.on("uncaughtException", (err) => {
  console.error("UNCAUGHT EXCEPTION:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("UNHANDLED REJECTION:", reason);
});