import React, { useState, useEffect } from 'react';
import {
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import OutfitDetailsModal from './OutfitDetailsModal';

const DbOutfitCard = ({ outfit, index, onBuyPress }) => {
    const [modalVisible, setModalVisible] = useState(false);
    const [isLiked, setIsLiked] = useState(false);
    const [userId, setUserId] = useState(null);

    useEffect(() => {
        const fetchUser = async () => {
            const storedId = await AsyncStorage.getItem('userId');
            if (storedId) {
                setUserId(storedId);
                // Optional: You can pre-fetch if it's liked, but passing down is typical.
                // For now, assume unliked unless passed from parent, or fetch specifically.
            }
        };
        fetchUser();
    }, []);

    const handleToggleLike = async () => {
        if (!userId) return;
        try {
            if (isLiked) {
                await axios.post(`${API_BASE_URL}/unlike-outfit`, { userId, outfitId: outfit.id || outfit._id });
                setIsLiked(false);
            } else {
                await axios.post(`${API_BASE_URL}/like-outfit`, { userId, outfit });
                setIsLiked(true);
            }
        } catch (e) {
            console.error("Like toggle failed", e);
        }
    };
    // Explanation length limit to ~120 chars
    let explanation = outfit.matchReasons || 'Matches your style profile.';
    if (explanation.length > 120) {
        explanation = explanation.substring(0, 117) + '...';
    }

    // Determine the image to display
    const rawUrl = outfit.imageUrl;
    let imageUri = 'backend-ai/outfit_img/placeholder.webp';
    if (rawUrl) {
        if (rawUrl.startsWith('http')) {
            imageUri = rawUrl;
        } else {
            const cleanUrl = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
            imageUri = `${API_BASE_URL}${cleanUrl}`;
        }
    }

    return (
        <View style={styles.card}>
            <TouchableOpacity onPress={() => setModalVisible(true)}>
                <Image
                    source={{ uri: imageUri }}
                    style={styles.image}
                    resizeMode="cover"
                />
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.heartOverlay} onPress={handleToggleLike}>
                 <Ionicons name={isLiked ? "heart" : "heart-outline"} size={26} color={isLiked ? "#632024" : "#25344F"} />
            </TouchableOpacity>

            <View style={styles.content}>
                <Text style={styles.title}>{outfit.type ? outfit.type.toUpperCase() : `DbOutfit #${index + 1}`}</Text>
                {outfit.category ? (
                    <Text style={styles.category}>Category: {outfit.category}</Text>
                ) : null}
                <Text style={styles.reason}>{explanation}</Text>
                <Text style={styles.occasion}>⭐ Match Score: {outfit.score || 8}/10</Text>
                
                <OutfitDetailsModal 
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    outfit={outfit}
                    isLiked={isLiked}
                    onToggleLike={handleToggleLike}
                />
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
        position: 'relative',
    },
    heartOverlay: {
        position: 'absolute',
        top: 15,
        right: 15,
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 20,
        padding: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        elevation: 3
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
