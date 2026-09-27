import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Mock Data / Structure for UI
const MOCK_INSIGHTS = {
    season: 'Clear Winter',
    undertone: 'Cool',
    bestColors: ['#000080', '#800020', '#FFFFFF', '#000000'],
    avoidColors: ['#FFA500', '#FFD700', '#A52A2A', '#F5DEB3'],
    necklines: ['V-Neck', 'Sweetheart', 'Square']
};

import axios from 'axios';
import OutfitDetailsModal from '../components/OutfitDetailsModal';
import { API_BASE_URL } from '../config';
import { getWardrobeEssentials } from '../constants/wardrobeEssentials';
import { useTheme } from '../contexts/ThemeContext';
import useRequireAuth from '../hooks/useRequireAuth';

export default function DashboardScreen({ navigation, route }) {
    const { theme, isDark } = useTheme();
    const { isAuthenticated, userId: authUserId, isVerifying } = useRequireAuth();
    const userId = authUserId || route?.params?.userId || null;
    const [loading, setLoading] = useState(true);

    // Section entrance animations
    const headerAnim = useRef(new Animated.Value(0)).current;
    const sec1Anim = useRef(new Animated.Value(0)).current;
    const sec2Anim = useRef(new Animated.Value(0)).current;
    const sec3Anim = useRef(new Animated.Value(0)).current;
    const sec4Anim = useRef(new Animated.Value(0)).current;

    const runEntranceAnimation = () => {
        [headerAnim, sec1Anim, sec2Anim, sec3Anim, sec4Anim].forEach(a => a.setValue(0));
        Animated.stagger(90, [
            headerAnim, sec1Anim, sec2Anim, sec3Anim, sec4Anim
        ].map(a => Animated.timing(a, { toValue: 1, duration: 600, easing: Easing.out(Easing.exp), useNativeDriver: true })))
            .start();
    };

    const slideIn = (anim) => ({
        opacity: anim,
        transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }]
    });
    const [profile, setProfile] = useState(null);
    const [ootd, setOotd] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [stylingHistory, setStylingHistory] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedOutfit, setSelectedOutfit] = useState(null);
    const [isLiked, setIsLiked] = useState(false);

    const handleOpenModal = (outfit) => {
        if (!outfit) return;
        setSelectedOutfit(outfit);

        // Check if liked from profile
        const outfitIdStr = (outfit.id || outfit._id || "").toString();
        const liked = profile?.likedOutfits?.some(lo => lo.outfitId === outfitIdStr) || false;

        setIsLiked(liked);
        setModalVisible(true);
    };

    const handleToggleLike = async () => {
        if (!userId || !selectedOutfit) return;
        try {
            const outfitIdStr = (selectedOutfit.id || selectedOutfit._id).toString();
            if (isLiked) {
                await axios.post(`${API_BASE_URL}/unlike-outfit`, { userId, outfitId: outfitIdStr });
                setIsLiked(false);
                // Update local profile state
                if (profile) {
                    setProfile({
                        ...profile,
                        likedOutfits: profile.likedOutfits.filter(lo => lo.outfitId !== outfitIdStr)
                    });
                }
            } else {
                await axios.post(`${API_BASE_URL}/like-outfit`, { userId, outfit: selectedOutfit });
                setIsLiked(true);
                // Update local profile state
                if (profile) {
                    setProfile({
                        ...profile,
                        likedOutfits: [...(profile.likedOutfits || []), { outfitId: outfitIdStr, likedAt: new Date() }]
                    });
                }
            }
        } catch (e) {
            console.error("Like toggle failed", e);
        }
    };

    const fetchNewLook = async () => {
        setLoading(true);
        try {
            if (userId) {
                const response = await axios.get(`${API_BASE_URL}/user-profile/${userId}`);
                if (response.data) {
                    const insights = response.data.analysis || {};
                    setProfile({
                        ...response.data,
                        season: insights.colorSeason || 'Unknown',
                        undertone: insights.undertone || 'Unknown',
                        bestColors: [...(insights.bestNeutrals || []), ...(insights.bestAccentColors || [])]
                    });
                    // Use user-profile instead of dashboard for full data access
                    const dashRes = await axios.get(`${API_BASE_URL}/api/dashboard/${userId}`);
                    if (dashRes.data.success) {
                        setOotd(dashRes.data.outfitOfTheDay);
                        setRecommendations(dashRes.data.recommendedOutfits);
                    }
                }
            }
        } catch (e) {
            console.error('Error fetching new look:', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const fetchData = async () => {
            let backendProfile = null;
            let backendOotd = null;
            let backendRecs = [];
            let backendName = 'User';

            if (userId) {
                try {
                    const response = await axios.get(`${API_BASE_URL}/api/dashboard/${userId}`);
                    if (response.data.success) {
                        backendName = response.data.userName || 'User';
                        const insights = response.data.styleInsights || {};
                        backendProfile = {
                            ...response.data.userAnalysis,
                            ...insights,
                            season: insights.colorSeason || response.data.userAnalysis?.colorSeason || 'Unknown',
                            bestColors: [...(insights.bestNeutrals || []), ...(insights.bestAccentColors || [])],
                            likedOutfits: response.data.likedOutfits || []
                        };
                        backendOotd = response.data.outfitOfTheDay;
                        backendRecs = response.data.recommendedOutfits;
                        setStylingHistory(response.data.stylingHistory || []);
                    }
                } catch (error) {
                    if (error.response && error.response.status === 403) {
                        navigation.getParent()?.replace('Onboarding', { userId });
                    } else {
                        console.error('Error fetching dashboard data:', error);
                    }
                }
            }

            try {
                // Apply latest locally saved analysis
                const savedAnalysisStr = await AsyncStorage.getItem('@latest_analysis');
                if (savedAnalysisStr) {
                    const saved = JSON.parse(savedAnalysisStr);
                    backendProfile = {
                        ...(backendProfile || {}),
                        season: saved.colorSeason || backendProfile?.season || 'Unknown',
                        undertone: saved.undertone || backendProfile?.undertone || 'Unknown',
                        faceShape: saved.faceShape || backendProfile?.faceShape,
                        bodyShape: saved.bodyShape || backendProfile?.bodyShape,
                        bestColors: saved.bestNeutrals ? [...(saved.bestNeutrals || []), ...(saved.bestAccentColors || [])].map(c => typeof c === 'string' ? c : (c.hex || c.value || c.color)) : [...(backendProfile?.bestNeutrals || []), ...(backendProfile?.bestAccentColors || [])],
                        avoidColors: saved.avoidColors ? saved.avoidColors.map(c => typeof c === 'string' ? c : (c.hex || c.value || c.color)) : backendProfile?.avoidColors,
                        jewelry: saved.jewelry || backendProfile?.jewelry,
                    };

                    if (saved.dbOutfits && saved.dbOutfits.length > 0) {
                        backendRecs = saved.dbOutfits;
                    } else if (saved.outfits && saved.outfits.length > 0) {
                        backendRecs = saved.outfits;
                    }

                    if (saved.outfits && saved.outfits.length > 0 && !backendOotd) {
                        backendOotd = { ...saved.outfits[0], score: 9, type: 'Latest Saved Look', matchReasons: 'From your recent analysis' };
                    }
                }
            } catch (e) {
                console.error('Error reading local analysis storage:', e);
            }

            setProfile(backendProfile ? { name: backendName, ...backendProfile } : { name: backendName });
            if (backendOotd) setOotd(backendOotd);
            setRecommendations(backendRecs);

            setLoading(false);
        };

        fetchData();

        // Add focus listener to refresh when coming back
        const unsubscribe = navigation.addListener('focus', () => {
            setLoading(true);
            fetchData();
        });

        return unsubscribe;
    }, [userId, navigation]);

    useEffect(() => {
        if (!loading) runEntranceAnimation();
    }, [loading]);

    if (isVerifying || !isAuthenticated || loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color="#632024" />
                <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                    {isVerifying ? "Verifying security..." : "Curating your look..."}
                </Text>
            </View>
        );
    }

    return (
        <View style={styles.mainWrapper}>
            {/* 1. Welcome Header - Now Sticky */}
            <Animated.View style={[styles.header, slideIn(headerAnim)]}>
                <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu-outline" size={28} color="#25344F" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.greeting}>Hey, {profile?.name || 'Stylist'} 👋</Text>
                    <Text style={styles.tagline}>Your curated looks await.</Text>
                </View>
                <TouchableOpacity style={styles.profileAvatar} onPress={() => navigation.navigate('Settings')}>
                    <Text style={styles.avatarText}>{profile?.name ? profile.name[0].toUpperCase() : 'U'}</Text>
                </TouchableOpacity>
            </Animated.View>

            <ScrollView style={[styles.container, { backgroundColor: theme.background }]} showsVerticalScrollIndicator={false}>

                {/* 2. Outfit of the Day */}
                <Animated.View style={[styles.section, slideIn(sec1Anim)]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Outfit of the Day</Text>
                        {ootd && (
                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={fetchNewLook}>
                                <Ionicons name="refresh" size={16} color="#632024" />
                                <Text style={{ color: '#632024', fontSize: 12, fontWeight: '600', marginLeft: 4 }}>Curate Another</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                    {ootd ? (
                        <View style={styles.ootdCard}>
                            <View style={styles.ootdBadge}>
                                <Ionicons name="sparkles" size={14} color="#fff" />
                                <Text style={styles.ootdBadgeText}>AI Selected</Text>
                            </View>
                            {ootd.top && ootd.bottom ? (
                                <>
                                    <Text style={styles.ootdDesc}>Curated Pair</Text>

                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#25344F', marginBottom: 6 }}>Top</Text>
                                            <TouchableOpacity onPress={() => handleOpenModal(ootd.top)}>
                                                <Image
                                                    source={{ uri: ootd.top.imageUrl.startsWith('http') ? ootd.top.imageUrl : `${API_BASE_URL}${ootd.top.imageUrl}` }}
                                                    style={{ width: '100%', height: 160, borderRadius: 12, backgroundColor: '#fff' }}
                                                    resizeMode="contain"
                                                />
                                            </TouchableOpacity>
                                            <Text style={{ fontSize: 13, color: '#6F4D38', marginTop: 6 }} numberOfLines={2}>{ootd.top.type}</Text>
                                        </View>
                                        <View style={{ flex: 1, marginLeft: 8 }}>
                                            <Text style={{ fontSize: 14, fontWeight: '600', color: '#25344F', marginBottom: 6 }}>Bottom</Text>
                                            <TouchableOpacity onPress={() => handleOpenModal(ootd.bottom)}>
                                                <Image
                                                    source={{ uri: ootd.bottom.imageUrl.startsWith('http') ? ootd.bottom.imageUrl : `${API_BASE_URL}${ootd.bottom.imageUrl}` }}
                                                    style={{ width: '100%', height: 160, borderRadius: 12, backgroundColor: '#fff' }}
                                                    resizeMode="contain"
                                                />
                                            </TouchableOpacity>
                                            <Text style={{ fontSize: 13, color: '#6F4D38', marginTop: 6 }} numberOfLines={2}>{ootd.bottom.type}</Text>
                                        </View>
                                    </View>

                                    <Text style={{ marginBottom: 16, color: '#6F4D38', lineHeight: 20 }}>
                                        Perfectly matched top and bottom. {ootd.top.matchReasons}
                                    </Text>
                                </>
                            ) : (
                                // Fallback for single legacy format or unstructured recommendations
                                <>
                                    <Text style={styles.ootdOccasion}>Score: {ootd.score}/10</Text>
                                    <Text style={styles.ootdDesc}>{ootd.type || 'Recommended Outfit'}</Text>
                                    <Text style={{ marginBottom: 12, color: '#6F4D38' }}>{ootd.matchReasons}</Text>

                                    {ootd.imageUrl ? (
                                        <TouchableOpacity onPress={() => handleOpenModal(ootd)}>
                                            <Image
                                                source={{ uri: ootd.imageUrl.startsWith('http') ? ootd.imageUrl : `${API_BASE_URL}${ootd.imageUrl}` }}
                                                style={{ width: '100%', height: 200, borderRadius: 12, marginBottom: 12, backgroundColor: '#fff' }}
                                                resizeMode="contain"
                                            />
                                        </TouchableOpacity>
                                    ) : null}
                                </>
                            )}

                        </View>
                    ) : (
                        <Text style={{ color: '#6F4D38' }}>No Outfit of the Day available.</Text>
                    )}
                </Animated.View>

                {/* styling history extension */}
                <Animated.View style={[styles.section, slideIn(sec2Anim)]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                        <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>Styling History</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('History')}>
                            <Text style={{ color: '#632024', fontSize: 13, fontWeight: '600' }}>View All</Text>
                        </TouchableOpacity>
                    </View>
                    {stylingHistory.length > 0 ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                            {stylingHistory.map((item, index) => (
                                <TouchableOpacity
                                    key={item._id || item.id || index.toString()}
                                    style={styles.historyCard}
                                    onPress={() => navigation.navigate('Results', { analysisResults: item.analysisData, userPreferences: {} })}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString()}</Text>
                                    <Text style={styles.historySeason}>{item.season} • {item.undertone}</Text>
                                    {item.ootdUrl ? (
                                        <TouchableOpacity onPress={() => handleOpenModal({ imageUrl: item.ootdUrl, type: 'Style History', matchReasons: `${item.season} ${item.undertone} analysis` })}>
                                            <Image source={{ uri: item.ootdUrl.startsWith('http') ? item.ootdUrl : `${API_BASE_URL}${item.ootdUrl}` }} style={{ width: '100%', height: 100, borderRadius: 8, marginTop: 8 }} />
                                        </TouchableOpacity>
                                    ) : null}
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    ) : (
                        <Text style={{ color: '#6F4D38' }}>No styling history available yet.</Text>
                    )}
                </Animated.View>

                {/* 3. Recommended Outfits */}
                <Animated.View style={[styles.section, slideIn(sec3Anim)]}>
                    <Text style={styles.sectionTitle}>Recommended For You</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        {recommendations.length > 0 ? recommendations.map((rec, idx) => (
                            <TouchableOpacity
                                key={rec._id || rec.id || idx.toString()}
                                style={styles.recCard}
                                onPress={() => handleOpenModal(rec)}
                                activeOpacity={0.88}
                            >
                                {rec.imageUrl ? (
                                    <Image
                                        source={{ uri: rec.imageUrl.startsWith('http') ? rec.imageUrl : `${API_BASE_URL}${rec.imageUrl}` }}
                                        style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 10, backgroundColor: '#F5EDE0' }}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={{ width: '100%', height: 160, borderRadius: 12, marginBottom: 10, backgroundColor: '#F5EDE0', alignItems: 'center', justifyContent: 'center' }}>
                                        <Ionicons name="shirt-outline" size={40} color="#C6A57A" />
                                    </View>
                                )}
                                <View style={styles.recScoreRow}>
                                    <Ionicons name="star" size={12} color="#632024" />
                                    <Text style={styles.recScoreText}> {rec.score}/10</Text>
                                </View>
                                <Text style={styles.recTitle} numberOfLines={1}>{rec.type || 'Outfit'}</Text>
                                <Text style={styles.recDesc} numberOfLines={2}>{rec.matchReasons}</Text>
                            </TouchableOpacity>
                        )) : (
                            <Text style={{ marginLeft: 20, color: '#6F4D38' }}>No recommendations found.</Text>
                        )}
                    </ScrollView>
                </Animated.View>

                {/* 4. Jewellery Recommendations */}
                <Animated.View style={[styles.section, slideIn(sec4Anim)]}>
                    <Text style={styles.sectionTitle}>Jewellery Match</Text>
                    <View style={styles.jewelGrid}>
                        <View style={styles.jewelCard}>
                            <Ionicons name="medal-outline" size={28} color={profile?.jewelry?.recommended?.toLowerCase().includes('gold') && !profile?.jewelry?.recommended?.toLowerCase().includes('white') ? '#FFD700' : '#b0c4de'} />
                            <Text style={styles.jewelTitle}>{profile?.jewelry?.recommended || 'Silver / White Gold'}</Text>
                            <Text style={styles.jewelSub}>{profile?.jewelry?.reason || 'Best for your undertones'}</Text>
                        </View>
                        <View style={styles.jewelCard}>
                            <Ionicons name="watch-outline" size={28} color="#25344F" />
                            <Text style={styles.jewelTitle}>Minimalist Watch</Text>
                            <Text style={styles.jewelSub}>Leather or mesh band</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* 5. Wardrobe Must-Haves */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Wardrobe Must-Haves</Text>
                    <View style={styles.mustHavesCard}>
                        {getWardrobeEssentials(profile?.season, profile?.bodyShape).map((item, idx) => (
                            <View key={idx} style={styles.checkListItem}>
                                <Ionicons name="checkmark-circle" size={20} color="#632024" />
                                <Text style={styles.checkListText}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>

                {/* 6. Style Insights */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Your Style Insights</Text>
                    <View style={styles.insightsGrid}>
                        <View style={styles.insightBox}>
                            <Text style={styles.insightLabel}>Season</Text>
                            <Text style={styles.insightValue}>{profile?.season}</Text>
                        </View>
                        <View style={styles.insightBox}>
                            <Text style={styles.insightLabel}>Undertone</Text>
                            <Text style={styles.insightValue}>{profile?.undertone}</Text>
                        </View>
                    </View>
                    <View style={styles.insightsColorsList}>
                        <Text style={styles.insightLabel}>Best Colors:</Text>
                        <View style={styles.paletteRow}>
                            {profile?.bestColors?.slice(0, 8).map((c, i) => {
                                const hexColor = typeof c === 'string' ? c : (c?.hex || c?.value || c?.color || '#000000');
                                const isWhite = hexColor.toUpperCase() === '#FFFFFF' || hexColor.toUpperCase() === '#FFF';
                                return (
                                    <View key={i} style={[styles.colorSwatchSmall, {
                                        backgroundColor: hexColor,
                                        borderWidth: isWhite ? 1 : 0,
                                        borderColor: '#eee'
                                    }]} />
                                );
                            })}
                        </View>
                        <Text style={[styles.insightLabel, { marginTop: 16 }]}>Colors to Avoid:</Text>
                        <View style={styles.paletteRow}>
                            {profile?.avoidColors?.slice(0, 8).map((c, i) => {
                                const hexColor = typeof c === 'string' ? c : (c?.hex || c?.value || c?.color || '#000000');
                                return (
                                    <View key={i} style={[styles.colorSwatchSmall, { backgroundColor: hexColor }]} />
                                );
                            })}
                        </View>
                    </View>
                </View>

                {/* 7. Quick Actions */}
                <View style={[styles.section, { paddingBottom: 70 }]}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <TouchableOpacity
                        style={styles.actionButtonMain}
                        onPress={() => navigation.navigate('Onboarding', { userId })}
                        activeOpacity={0.85}
                    >
                        <Ionicons name="color-wand" size={20} color="#fff" />
                        <Text style={styles.actionButtonMainText}>Update My Style Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButtonSecondary, { marginBottom: 12 }]}
                        onPress={() => navigation.navigate('AIChatbot')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="chatbubbles-outline" size={20} color="#25344F" />
                        <Text style={styles.actionButtonSecondaryText}>Chat with AI Stylist</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionButtonSecondary, { marginBottom: 12 }]}
                        onPress={() => navigation.navigate('VirtualTryon')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="body-outline" size={20} color="#25344F" />
                        <Text style={styles.actionButtonSecondaryText}>Virtual Try-On</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.actionButtonSecondary}
                        onPress={() => navigation.navigate('GenerateOutfit')}
                        activeOpacity={0.8}
                    >
                        <Ionicons name="sparkles-outline" size={20} color="#25344F" />
                        <Text style={styles.actionButtonSecondaryText}>Style Anything (AI Lab)</Text>
                    </TouchableOpacity>
                </View>

                <OutfitDetailsModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    outfit={selectedOutfit}
                    isLiked={isLiked}
                    onToggleLike={handleToggleLike}
                />

            </ScrollView>
        </View>
    );
}
const styles = StyleSheet.create({
    mainWrapper: {
        flex: 1,
        backgroundColor: '#D5B893',
    },
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#D5B893',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#6F4D38',
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 62,
        paddingBottom: 22,
        backgroundColor: '#EAD8C5',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(198,165,122,0.5)',
        zIndex: 10,
    },
    menuButton: {
        padding: 4,
    },
    headerTitleContainer: {
        flex: 1,
        marginHorizontal: 16,
    },
    greeting: {
        fontSize: 19,
        fontWeight: '700',
        color: '#25344F',
        letterSpacing: -0.3,
    },
    tagline: {
        fontSize: 13,
        color: '#6F4D38',
        marginTop: 3,
        fontWeight: '500',
    },
    profileAvatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: '#632024',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#632024',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '800',
        color: '#fff',
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 28,
    },
    sectionTitle: {
        fontSize: 17,
        fontWeight: '800',
        color: '#25344F',
        marginBottom: 14,
        letterSpacing: -0.3,
    },
    ootdCard: {
        backgroundColor: '#EAD8C5',
        borderRadius: 24,
        padding: 22,
        shadowColor: '#25344F',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.10,
        shadowRadius: 14,
        elevation: 5,
    },
    ootdBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#632024',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 16,
    },
    ootdBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 6,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    ootdOccasion: {
        fontSize: 13,
        color: '#6F4D38',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        fontWeight: '600',
    },
    ootdDesc: {
        fontSize: 24,
        fontWeight: '700',
        color: '#25344F',
        lineHeight: 34,
        marginBottom: 24,
    },
    paletteRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    colorSwatch: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    colorSwatchSmall: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
    jewelleryHint: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 24,
        borderTopWidth: 1,
        borderTopColor: '#C6A57A',
        paddingTop: 16,
    },
    jewelleryText: {
        marginLeft: 10,
        fontSize: 15,
        color: '#6F4D38',
    },
    horizontalScroll: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    recCard: {
        width: 220,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 14,
        marginRight: 14,
        shadowColor: '#25344F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 3,
    },
    recScoreRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    recScoreText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#632024',
    },
    recTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#25344F',
        marginBottom: 4,
    },
    historyCard: {
        width: 180,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginRight: 14,
        shadowColor: '#25344F',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    historyDate: {
        fontSize: 12,
        color: '#6F4D38',
        marginBottom: 4,
        fontWeight: '600',
    },
    historySeason: {
        fontSize: 14,
        fontWeight: '700',
        color: '#25344F',
        marginBottom: 8,
    },
    recOccasion: {
        fontSize: 12,
        color: '#6F4D38',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 14,
        fontWeight: '500',
    },
    recDesc: {
        fontSize: 15,
        color: '#6F4D38',
        lineHeight: 22,
        marginBottom: 20,
    },
    jewelGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    jewelCard: {
        flex: 1,
        backgroundColor: '#EAD8C5',
        padding: 20,
        borderRadius: 20,
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    jewelTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#25344F',
        marginTop: 16,
        marginBottom: 6,
    },
    jewelSub: {
        fontSize: 13,
        color: '#6F4D38',
        lineHeight: 18,
    },
    mustHavesCard: {
        backgroundColor: '#EAD8C5',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    checkListItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#D5B893',
    },
    checkListText: {
        marginLeft: 16,
        fontSize: 16,
        color: '#25344F',
        fontWeight: '500',
    },
    insightsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    insightBox: {
        flex: 1,
        backgroundColor: '#EAD8C5',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    insightsColorsList: {
        backgroundColor: '#EAD8C5',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    insightLabel: {
        fontSize: 12,
        color: '#6F4D38',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '600',
    },
    insightValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#25344F',
    },
    actionButtonMain: {
        backgroundColor: '#632024',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        marginBottom: 12,
        shadowColor: '#632024',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.32,
        shadowRadius: 14,
        elevation: 8,
    },
    actionButtonMainText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 10,
        letterSpacing: 0.2,
    },
    actionButtonSecondary: {
        backgroundColor: '#EAD8C5',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(198,165,122,0.5)',
    },
    actionButtonSecondaryText: {
        color: '#25344F',
        fontSize: 15,
        fontWeight: '600',
        marginLeft: 8,
    }
});
