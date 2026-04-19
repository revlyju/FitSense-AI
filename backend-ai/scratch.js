require("dotenv").config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

require('dns').setServers(["8.8.8.8", "8.8.4.4"]);
const uri = process.env.MONGODB_URI;

async function checkImages() {
    try {
        await mongoose.connect(uri);
        const outfitsDb = mongoose.connection.useDb('outfits');
        const Outfit = outfitsDb.model("Outfit", new mongoose.Schema({ imageUrl: String, id: String }, { strict: false }), "outfits");

        const outfits = await Outfit.find({}, 'id imageUrl').lean();
        const missingIDs = [];
        const imgDirPath = path.join(__dirname, 'outfit_img');

        for (const outfit of outfits) {
            if (!outfit.imageUrl) {
                missingIDs.push(outfit.id + " (No URL)");
                continue;
            }
            const filename = outfit.imageUrl.split('/').pop();
            const filePath = path.join(imgDirPath, filename);
            if (!fs.existsSync(filePath)) {
                missingIDs.push("outfit" + outfit.id); 
            }
        }
        
        fs.writeFileSync("missing_outfits.txt", missingIDs.join(", "));
        console.log("Missing count:", missingIDs.length);

    } catch (e) {
        console.error(e);
    } finally {
        mongoose.disconnect();
    }
}

checkImages();
