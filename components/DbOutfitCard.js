import React, { useState, useEffect, useRef } from 'react';
import {
    Animated,
    Easing,
    Image,
    Linking,
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

    // Animation refs
    const cardAnim  = useRef(new Animated.Value(0)).current;
    const heartAnim = useRef(new Animated.Value(1)).current;
    const imageAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const fetchUser = async () => {
            const storedId = await AsyncStorage.getItem('userId');
            if (storedId) setUserId(storedId);
        };
        fetchUser();

        // Staggered card entrance
        Animated.timing(cardAnim, {
            toValue: 1,
            duration: 500,
            delay: index * 80,
            easing: Easing.out(Easing.exp),
            useNativeDriver: true,
        }).start();

        Animated.timing(imageAnim, {
            toValue: 1,
            duration: 700,
            delay: index * 80 + 100,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true,
        }).start();
    }, []);

    const handleToggleLike = async () => {
        if (!userId) return;
        // Heart bounce
        Animated.sequence([
            Animated.timing(heartAnim, { toValue: 1.4, duration: 120, useNativeDriver: true }),
            Animated.spring(heartAnim, { toValue: 1, friction: 4, useNativeDriver: true }),
        ]).start();
        try {
            if (isLiked) {
                await axios.post(`${API_BASE_URL}/unlike-outfit`, { userId, outfitId: outfit.id || outfit._id });
                setIsLiked(false);
            } else {
                await axios.post(`${API_BASE_URL}/like-outfit`, { userId, outfit });
                setIsLiked(true);
            }
        } catch (e) {
            console.error('Like toggle failed', e);
        }
    };

    let explanation = outfit.matchReasons || 'Matches your style profile.';
    if (explanation.length > 100) explanation = explanation.substring(0, 97) + '...';

    const rawUrl = outfit.imageUrl;
    let imageUri = null;
    if (rawUrl) {
        imageUri = rawUrl.startsWith('http') ? rawUrl : `${API_BASE_URL}${rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`}`;
    }

    const score = outfit.score || 8;
    const scoreColor = score >= 8 ? '#2d6a4f' : score >= 6 ? '#6F4D38' : '#8b1a1a';

    return (
        <Animated.View
            style={[
                styles.card,
                {
                    opacity: cardAnim,
                    transform: [{ translateY: cardAnim.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
                },
            ]}
        >
            {/* Image Area */}
            <TouchableOpacity onPress={() => setModalVisible(true)} activeOpacity={0.95}>
                <Animated.View style={[styles.imageWrap, { opacity: imageAnim }]}>
                    {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Ionicons name="shirt-outline" size={48} color="#C6A57A" />
                        </View>
                    )}
                    {/* Score badge */}
                    <View style={[styles.scoreBadge, { backgroundColor: scoreColor }]}>
                        <Ionicons name="star" size={11} color="#fff" />
                        <Text style={styles.scoreBadgeText}> {score}/10</Text>
                    </View>
                </Animated.View>
            </TouchableOpacity>

            {/* Heart */}
            <Animated.View style={[styles.heartWrap, { transform: [{ scale: heartAnim }] }]}>
                <TouchableOpacity onPress={handleToggleLike} activeOpacity={0.7}>
                    <Ionicons
                        name={isLiked ? 'heart' : 'heart-outline'}
                        size={24}
                        color={isLiked ? '#632024' : '#25344F'}
                    />
                </TouchableOpacity>
            </Animated.View>

            {/* Content */}
            <View style={styles.content}>
                <View style={styles.typeRow}>
                    {outfit.category ? (
                        <View style={styles.categoryPill}>
                            <Text style={styles.categoryPillText}>{outfit.category}</Text>
                        </View>
                    ) : null}
                </View>

                <Text style={styles.title} numberOfLines={1}>
                    {outfit.type ? outfit.type : `Outfit #${index + 1}`}
                </Text>

                <Text style={styles.reason}>{explanation}</Text>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.buyButton}
                        onPress={() => outfit.link ? Linking.openURL(outfit.link) : (onBuyPress && onBuyPress())}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="cart-outline" size={15} color="#fff" style={{ marginRight: 6 }} />
                        <Text style={styles.buyButtonText}>Shop Now</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.detailsBtn}
                        onPress={() => setModalVisible(true)}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.detailsBtnText}>Details</Text>
                        <Ionicons name="chevron-forward" size={14} color="#632024" />
                    </TouchableOpacity>
                </View>
            </View>

            <OutfitDetailsModal
                visible={modalVisible}
                onClose={() => setModalVisible(false)}
                outfit={outfit}
                isLiked={isLiked}
                onToggleLike={handleToggleLike}
            />
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
        shadowColor: '#25344F',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 14,
        elevation: 5,
        position: 'relative',
    },
    imageWrap: {
        position: 'relative',
    },
    image: {
        width: '100%',
        height: 340,
        backgroundColor: '#F5EDE0',
    },
    imagePlaceholder: {
        width: '100%',
        height: 340,
        backgroundColor: '#F5EDE0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    scoreBadge: {
        position: 'absolute',
        bottom: 12,
        left: 14,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 3,
    },
    scoreBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    heartWrap: {
        position: 'absolute',
        top: 14,
        right: 14,
        backgroundColor: 'rgba(255,255,255,0.92)',
        borderRadius: 22,
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },
    content: {
        padding: 16,
        paddingTop: 14,
    },
    typeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryPill: {
        backgroundColor: '#F5EDE0',
        borderRadius: 12,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: '#EAD8C5',
    },
    categoryPillText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#6F4D38',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    title: {
        fontSize: 17,
        fontWeight: '700',
        color: '#25344F',
        marginBottom: 6,
        textTransform: 'capitalize',
    },
    reason: {
        fontSize: 13,
        color: '#6F4D38',
        lineHeight: 19,
        marginBottom: 16,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    buyButton: {
        backgroundColor: '#632024',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#632024',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.28,
        shadowRadius: 8,
        elevation: 4,
    },
    buyButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    detailsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    detailsBtnText: {
        fontSize: 14,
        color: '#632024',
        fontWeight: '600',
    },
});

export default DbOutfitCard;
