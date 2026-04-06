// A simple mapping of seasons to wardrobe essentials since we want to avoid extra backend complexity.
// We provide 4 curated essentials per season.

const DEFAULT_ESSENTIALS = [
    'Classic White Tee',
    'Perfect Fit Denim',
    'Tailored Neutral Blazer',
    'Comfortable Ankle Boots'
];

const ESSENTIALS_MAP = {
    'spring': [
        'Lightweight Trench Coat',
        'Warm Tone Floral Blouse',
        'Coral or Peach Cardigan',
        'Camel or Tan Trousers'
    ],
    'summer': [
        'Cool Tone Linen Shirt',
        'Soft Grey Relaxed Trousers',
        'Light Denim Jacket',
        'Pastel Slip Dress'
    ],
    'autumn': [
        'Olive Utility Jacket',
        'Chunky Mustard Knit Sweater',
        'Dark Wash Straight Jeans',
        'Brown Leather Chelsea Boots'
    ],
    'winter': [
        'Structured Black Coat',
        'Jewel-tone Silk Blouse',
        'Crisp White Button-down',
        'Charcoal Tailored Trousers'
    ]
};

export const getWardrobeEssentials = (season, bodyShape) => {
    // Basic fallback if no season available
    if (!season) return DEFAULT_ESSENTIALS;

    const seasonLower = season.toLowerCase();
    
    // Find matching season in our map
    let match = null;
    for (const key of Object.keys(ESSENTIALS_MAP)) {
        if (seasonLower.includes(key)) {
            match = key;
            break;
        }
    }

    if (!match) return DEFAULT_ESSENTIALS;

    return ESSENTIALS_MAP[match];
};
