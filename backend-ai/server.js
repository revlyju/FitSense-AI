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
           $or: [ { id: { $in: likedIds } }, { _id: { $in: likedIds } } ] 
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
     scoredOutfits = filtered.map(o => ({ ...o, score: 0, id: o._id, type: o.type||"Outfit", imageUrl: o.imageUrl || `/outfit_img/${o._id}.jpg` }));
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

// Helper functions for OOTD
function hasCommonStyle(a, b) {
  if (!a || !b) return false;
  return a.some(tag => b.includes(tag));
}

function isNeutral(colors) {
  if (!colors) return false;
  const neutrals = ["black", "white", "beige", "grey", "navy"];
  return colors.some(c => neutrals.includes(c.toLowerCase()));
}

function hasColorContrast(a, b) {
  if (!a || !b) return false;
  return a.some(c1 => b.some(c2 => c1 !== c2));
}

function sameColorFamily(a, b) {
  if (!a || !b) return false;
  return a.some(c => b.includes(c));
}

function generateOOTD(dbOutfits, userProfile) {
  const normalize = (val) => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(v => (v || "").toString().toLowerCase().trim());
    return [(val || "").toString().toLowerCase().trim()];
  };

  const userGenderRaw = normalize(userProfile.gender);
  const userGender =
    userGenderRaw.some((g) => ["men", "man", "male", "m"].includes(g)) ? "men" :
      userGenderRaw.some((g) => ["women", "woman", "female", "f"].includes(g)) ? "women" :
        "";
        
  const userOccasions = normalize(userProfile.occasion);
  const userStyles = normalize(userProfile.stylePreference);

  // Extract History for Repetition Rule
  const recentHistory = userProfile.history || [];
  const recentOotdIds = recentHistory.flatMap(h => {
      const matches = [];
      if(h.analysisData && h.analysisData.dbOutfits) {
          h.analysisData.dbOutfits.forEach(o => matches.push(o.id || o._id));
      }
      return matches;
  }).map(id => (id || "").toString());

  const intersects = (arr1, arr2) => arr1.some(a => a && arr2.some(b => b && (a.includes(b) || b.includes(a))));

  const isTop = (cat) => {
    const c = cat ? cat.toLowerCase().trim() : "";
    return c.includes("top") || c.includes("shirt") || c.includes("blouse") || c.includes("sweater") || c.includes("jacket") || c.includes("hoodie");
  };
  const isBottom = (cat) => {
    const c = cat ? cat.toLowerCase().trim() : "";
    return c.includes("bottom") || c.includes("pant") || c.includes("jean") || c.includes("trouser") || c.includes("skirt") || c.includes("short");
  };
  const isFull = (cat) => {
    const c = cat ? cat.toLowerCase().trim() : "";
    return c.includes("dress") || c.includes("jumpsuit") || c.includes("bodysuit") || c.includes("gown") || c.includes("full");
  };

  // STEP 1: SPLIT OUTFITS
  let tops = dbOutfits.filter(o => {
    const g = o?.gender;
    const norm = normalize(g);
    if (norm.length > 0 && !norm.includes("unisex") && !norm.includes("all")) { if (!userGender || !norm.includes(userGender)) return false; }
    return isTop(o.category) || isTop(o.type);
  });

  let bottoms = dbOutfits.filter(o => {
    const g = o?.gender;
    const norm = normalize(g);
    if (norm.length > 0 && !norm.includes("unisex") && !norm.includes("all")) { if (!userGender || !norm.includes(userGender)) return false; }
    return isBottom(o.category) || isBottom(o.type);
  });

  let fullOutfits = dbOutfits.filter(o => {
    const g = o?.gender;
    const norm = normalize(g);
    if (norm.length > 0 && !norm.includes("unisex") && !norm.includes("all")) { if (!userGender || !norm.includes(userGender)) return false; }
    const occs = normalize(o.occasion);
    const occMatch = userOccasions.length === 0 || intersects(occs, userOccasions);
    return occMatch && (isFull(o.category) || isFull(o.type));
  });

  // STEP 2 & 3: FULL OUTFIT DECISION
  const useFullOutfit = fullOutfits.length > 0 && Math.random() < 0.3;
  if (useFullOutfit) {
    const scoredFull = getSmartRecommendations(fullOutfits, userProfile);
    if (scoredFull.length > 0) {
        return {
           type: "full",
           ...scoredFull[0] // Spread to cleanly expose .imageUrl for frontend fallback support
        };
    }
  }

  // STEP 4: STRICT OCCASION (With intelligent fallback if DB is mismatched)
  let validTops = tops.filter(o => userOccasions.length === 0 || intersects(normalize(o.occasion), userOccasions));
  let validBottoms = bottoms.filter(o => userOccasions.length === 0 || intersects(normalize(o.occasion), userOccasions));

  // Fallback: If 0 tops perfectly match the occasion, relax Occasion and rely purely on the User Style subsets
  if (validTops.length === 0) validTops = tops;
  if (validBottoms.length === 0) validBottoms = bottoms;

  // STEP 5: STYLE FILTER (SOFT)
  const styledTops = validTops.filter(o => intersects(normalize(o.style_tags), userStyles));
  const styledBottoms = validBottoms.filter(o => intersects(normalize(o.style_tags), userStyles));

  // STEP 6: SCORE ITEMS
  const scoredTops = getSmartRecommendations(styledTops.length ? styledTops : validTops, userProfile).slice(0, 5);
  const scoredBottoms = getSmartRecommendations(styledBottoms.length ? styledBottoms : validBottoms, userProfile).slice(0, 5);

  console.log(`[generateOOTD] Scored tops: ${scoredTops.length}, Scored bottoms: ${scoredBottoms.length}`);

  // STEP 7 & 8: COMBINATION LOGIC
  let bestCombo = null;
  let bestScore = -Infinity;

  for (let top of scoredTops) {
    for (let bottom of scoredBottoms) {
      const rawTop = dbOutfits.find(o => (o._id || o.id).toString() === top.id.toString()) || {};
      const rawBottom = dbOutfits.find(o => (o._id || o.id).toString() === bottom.id.toString()) || {};

      let score = top.score + bottom.score;
      
      const tOccasions = normalize(rawTop.occasion);
      const bOccasions = normalize(rawBottom.occasion);
      const tStyles = normalize(rawTop.style_tags);
      const bStyles = normalize(rawBottom.style_tags);
      const tColors = normalize(rawTop.colors);
      const bColors = normalize(rawBottom.colors);
      const tFit = normalize(rawTop.fit)[0] || "";
      const bFit = normalize(rawBottom.fit)[0] || "";
      const tBody = normalize(rawTop.suitable_body_types);
      const bBody = normalize(rawBottom.suitable_body_types);

      // RULE 1: SILHOUETTE BALANCE
      if (tFit === "fitted" && bFit === "loose") score += 25;
      if (tFit === "loose" && bFit === "fitted") score += 25;
      if (tFit === "loose" && bFit === "loose") score -= 15;

      // RULE 2: COLOR HARMONY
      if (isNeutral(tColors) || isNeutral(bColors)) score += 20;
      if (hasColorContrast(tColors, bColors)) score += 15;
      if (sameColorFamily(tColors, bColors)) score += 10;

      // RULE 3: STYLE CONSISTENCY
      if (hasCommonStyle(tStyles, bStyles)) {
          score += 20;
      } else {
          score -= 10;
      }

      // RULE 4: BODY TYPE MATCH
      const uBodyType = (userProfile.bodyShape || "").toLowerCase();
      if (uBodyType) {
          if (tBody.includes(uBodyType)) score += 10;
          if (bBody.includes(uBodyType)) score += 10;
      }

      // RULE 5: UNIVERSAL ITEMS BOOST
      if (rawBottom.isUniversal === true || rawBottom.isUniversal === "true") score += 12;

      // RULE 6: REPETITION CONTROL
      if (recentOotdIds.includes((bottom.id||"").toString())) score -= 25;
      if (recentOotdIds.includes((top.id||"").toString())) score -= 20;

      // RULE 7: HARD PENALTY (Occasion)
      if (userOccasions.length > 0) {
          if (!intersects(tOccasions, userOccasions)) score -= 50;
          if (!intersects(bOccasions, userOccasions)) score -= 50;
      }

      if (score > bestScore) {
        bestScore = score;
        let displayScore = Math.min(10, Math.round((Math.max(1, score) / 100) * 10)); 
        if(score > 100) displayScore = 10;

        bestCombo = { 
          top, 
          bottom, 
          score: displayScore,
          matchReasons: "Professionally curated style balancing your " + (userOccasions[0]||"occasion") + " preference and body shape."
        };
      }
    }
  }

  if (bestCombo) {
     return {
        type: "combo",
        ...bestCombo
     };
  } else if (tops.length > 0 && bottoms.length > 0) {
      console.log(`[generateOOTD] Fallback combo selection.`);
      return { 
          type: "combo",
          top: tops[0], 
          bottom: bottoms[0], 
          score: 7,
          matchReasons: "AI curated smart pair based off available wardrobe matches."
      };
  }

  // Final edge case fallback if fully empty
  return getSmartRecommendations(dbOutfits, userProfile)[0] || null;
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
         if(!resultImage) {
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