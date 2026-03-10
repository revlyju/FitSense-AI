import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { API_BASE_URL } from '../config';

const DbOutfitCard = ({ outfit, index, onBuyPress }) => {
    // Explanation length limit to ~120 chars
    let explanation = outfit.matchReasons || 'Matches your style profile.';
    if (explanation.length > 120) {
        explanation = explanation.substring(0, 117) + '...';
    }

    // Determine the image to display
    const rawUrl = outfit.imageUrl;
    let imageUri = 'backend-ai/outfit_img/placeholder.webp';
    if (rawUrl) {
        // if it starts with http, use it, else append API_BASE_URL
        if (rawUrl.startsWith('http')) {
            imageUri = rawUrl;
        } else {
            imageUri = `${API_BASE_URL}${rawUrl}`;
        }
    }

    return (
        <View style={styles.card}>
            <Image
                source={{ uri: imageUri }}
                style={styles.image}
                resizeMode="cover"
            />
            <View style={styles.content}>
                <Text style={styles.title}>{outfit.type ? outfit.type.toUpperCase() : `DbOutfit #${index + 1}`}</Text>
                {outfit.category ? (
                    <Text style={styles.category}>Category: {outfit.category}</Text>
                ) : null}
                <Text style={styles.reason}>{explanation}</Text>
                <Text style={styles.occasion}>⭐ Match Score: {outfit.score}/10</Text>
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.buyButton} onPress={onBuyPress}>
                        <Text style={styles.buyButtonText}>Buy Now</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#eee',
    },
    image: {
        width: '100%',
        height: 350,
        backgroundColor: '#f0f0f0',
    },
    content: {
        padding: 14,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 4,
    },
    category: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    reason: {
        fontSize: 14,
        color: '#444',
        lineHeight: 20,
        marginBottom: 8,
    },
    occasion: {
        fontSize: 13,
        color: '#888',
        fontStyle: 'italic',
        marginBottom: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    buyButton: {
        backgroundColor: '#1a1a1a',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 6,
    },
    buyButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default DbOutfitCard;
