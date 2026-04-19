require('dotenv').config();
const mongoose = require('mongoose');

try {
  require("dns").setServers(["8.8.8.8", "8.8.4.4"]);
} catch (error) {
  console.warn("Could not set DNS servers:", error);
}

const uri = process.env.MONGODB_URI;

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
  history: [{
    date: { type: Date, default: Date.now },
    season: String,
    undertone: String,
    ootdUrl: String,
    analysisData: mongoose.Schema.Types.Mixed
  }],
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

const migrate = async () => {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(uri);
        console.log("Connected.");
        
        const users = await User.find({ profileAnalyzed: true });
        console.log(`Found ${users.length} users with profileAnalyzed: true`);

        let migratedCount = 0;
        
        for (let user of users) {
             if (!user.history || user.history.length === 0) {
                 if (user.analysis) {
                     const newHistoryEntry = {
                         date: new Date(),
                         season: user.analysis.colorSeason || "Unknown",
                         undertone: user.analysis.undertone || "Unknown",
                         ootdUrl: "", // Legacy won't have the ootd outfit stored there explicitly
                         analysisData: user.analysis
                     };
                     user.history = [newHistoryEntry];
                     await user.save();
                     migratedCount++;
                     console.log(`Migrated history for user: ${user.email}`);
                 }
             }
        }
        
        console.log(`Migration complete. Successfully migrated ${migratedCount} users.`);
        process.exit(0);
    } catch (e) {
        console.error("Migration error:", e);
        process.exit(1);
    }
};

migrate();
