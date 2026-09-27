import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { useCallback, useState, useEffect } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import DbOutfitCard from '../components/DbOutfitCard';
import { API_BASE_URL } from '../config';
import { useTheme } from '../contexts/ThemeContext';
import useRequireAuth from '../hooks/useRequireAuth';

export default function MyStyleProfileScreen({ navigation }) {
    const { theme, isDark } = useTheme();
    const { isAuthenticated, userId: authUserId } = useRequireAuth();
    const [userId, setUserId] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchProfile = async (targetId) => {
        try {
            const id = targetId || authUserId || (await AsyncStorage.getItem('userId'));
            if (!id) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setUserId(id);

            const response = await axios.get(`${API_BASE_URL}/user-profile/${id}`, { timeout: 8000 });
            setProfile(response.data || { populatedLikedOutfits: [] });
        } catch (error) {
            console.error('Failed to load profile', error?.message || error);
            setProfile({ populatedLikedOutfits: [] });
        } finally {
            setLoading(false);
        }
    };

    // Safety timeout: Never stay stuck in loading state longer than 8 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setLoading(false);
        }, 8000);
        return () => clearTimeout(timer);
    }, []);

    // Load on initial mount
    useEffect(() => {
        let isActive = true;
        const init = async () => {
            const id = authUserId || (await AsyncStorage.getItem('userId'));
            if (isActive) {
                if (id) {
                    await fetchProfile(id);
                } else {
                    setLoading(false);
                }
            }
        };
        init();
        return () => { isActive = false; };
    }, [authUserId]);

    // Refresh on screen focus
    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            const init = async () => {
                const id = authUserId || (await AsyncStorage.getItem('userId'));
                if (isActive && id) {
                    await fetchProfile(id);
                }
            };
            init();
            return () => { isActive = false; };
        }, [authUserId])
    );

    if (loading && !profile) {
        return (
            <View style={[styles.container, styles.center, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    const currentProfile = profile || { populatedLikedOutfits: [] };
    const { styleMemory, populatedLikedOutfits } = currentProfile;
    const hasMemory = styleMemory && styleMemory.interactionCount > 0;

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu-outline" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Liked Outfits</Text>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

                {/* STYLE MEMORY ENGINE SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>🧠 Style Memory Matrix</Text>

                    {!hasMemory ? (
                        <View style={styles.emptyMemoryCard}>
                            <Ionicons name="sparkles-outline" size={32} color="#888" />
                            <Text style={styles.memoryHelperText}>
                                Start liking outfits to build your automated style profile!
                            </Text>
                        </View>
                    ) : (
                        <View style={styles.memoryCard}>
                            <View style={styles.memoryStat}>
                                <Text style={styles.memoryStatNumber}>{styleMemory.interactionCount}</Text>
                                <Text style={styles.memoryStatLabel}>Outfits Liked</Text>
                            </View>

                            {/* Loved Colors */}
                            {styleMemory.likedColors && styleMemory.likedColors.length > 0 && (
                                <View style={styles.memoryBlock}>
                                    <Text style={styles.memoryBlockTitle}>Favored Colors</Text>
                                    <View style={styles.tagMap}>
                                        {styleMemory.likedColors.map((col, idx) => (
                                            <View key={idx} style={styles.chipTag}>
                                                <Text style={styles.chipText}>{col}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Loved Categories */}
                            {styleMemory.likedCategories && styleMemory.likedCategories.length > 0 && (
                                <View style={styles.memoryBlock}>
                                    <Text style={styles.memoryBlockTitle}>Top Categories</Text>
                                    <View style={styles.tagMap}>
                                        {styleMemory.likedCategories.map((cat, idx) => (
                                            <View key={idx} style={[styles.chipTag, styles.chipDark]}>
                                                <Text style={[styles.chipText, styles.chipDarkText]}>{cat}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}

                            {/* Loved Styles */}
                            {styleMemory.likedStyles && styleMemory.likedStyles.length > 0 && (
                                <View style={styles.memoryBlock}>
                                    <Text style={styles.memoryBlockTitle}>Dominant Aesthetic</Text>
                                    <View style={styles.tagMap}>
                                        {styleMemory.likedStyles.map((sty, idx) => (
                                            <View key={idx} style={styles.chipTag}>
                                                <Text style={styles.chipText}>{sty}</Text>
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            )}
                        </View>
                    )}
                </View>

                {/* SAVED OUTFITS LISTING */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>❤️ Liked Wardrobe</Text>

                    {(!populatedLikedOutfits || populatedLikedOutfits.length === 0) ? (
                        <Text style={styles.emptyText}>No outfits liked yet!</Text>
                    ) : (
                        populatedLikedOutfits.map((outfit, index) => (
                            <DbOutfitCard
                                key={outfit.id || index}
                                outfit={outfit}
                                index={index}
                                onBuyPress={() => Alert.alert('Shop', 'Opening shop link...')}
                            />
                        ))
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAF9F6'
    },
    center: {
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0'
    },
    menuButton: {
        marginRight: 15
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#25344F'
    },
    scrollContent: {
        padding: 20
    },
    section: {
        marginBottom: 35
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#25344F',
        marginBottom: 15
    },
    emptyMemoryCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#eee',
        borderStyle: 'dashed'
    },
    memoryHelperText: {
        textAlign: 'center',
        color: '#888',
        marginTop: 10,
        fontSize: 15,
        lineHeight: 22
    },
    memoryCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#EAD8C5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        elevation: 2
    },
    memoryStat: {
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        marginBottom: 15
    },
    memoryStatNumber: {
        fontSize: 36,
        fontWeight: '900',
        color: '#632024'
    },
    memoryStatLabel: {
        fontSize: 14,
        color: '#6F4D38',
        fontWeight: '600',
        textTransform: 'uppercase',
        marginTop: 4
    },
    memoryBlock: {
        marginBottom: 15
    },
    memoryBlockTitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
        fontWeight: '600'
    },
    tagMap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8
    },
    chipTag: {
        backgroundColor: '#EAD8C5',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20
    },
    chipText: {
        color: '#25344F',
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'capitalize'
    },
    chipDark: {
        backgroundColor: '#25344F'
    },
    chipDarkText: {
        color: '#fff'
    },
    emptyText: {
        textAlign: 'center',
        color: '#6F4D38',
        fontSize: 15,
        fontStyle: 'italic'
    }
});
