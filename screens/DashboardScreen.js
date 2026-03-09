import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// Mock Data / Structure for UI
const MOCK_INSIGHTS = {
    season: 'Clear Winter',
    undertone: 'Cool',
    bestColors: ['#000080', '#800020', '#FFFFFF', '#000000'],
    avoidColors: ['#FFA500', '#FFD700', '#A52A2A', '#F5DEB3'],
    necklines: ['V-Neck', 'Sweetheart', 'Square']
};

export default function DashboardScreen({ navigation }) {
    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState(null);
    const [ootd, setOotd] = useState(null);
    const [recommendations, setRecommendations] = useState([]);

    useEffect(() => {
        // 10. Backend Integration / Mock fetching
        const fetchData = async () => {
            try {
                // Example API endpoints:
                // const profileRes = await axios.get('/user/profile');
                // const ootdRes = await axios.get('/user/outfit-of-the-day');
                // const recRes = await axios.get('/user/recommendations');

                // Simulating API latency
                setTimeout(() => {
                    setProfile({ name: 'Sarah', ...MOCK_INSIGHTS });
                    setOotd({
                        description: 'Navy structured blazer paired with a crisp white tee and dark wash denim.',
                        occasion: 'Business Casual',
                        palette: ['#000080', '#FFFFFF', '#1A1A1A'],
                        jewellery: 'Silver minimalist watch, geometric stud earrings.'
                    });
                    setRecommendations([
                        { id: 1, name: 'Evening Elegance', desc: 'Burgundy slip dress', occasion: 'Date Night', colors: ['#800020', '#000000'] },
                        { id: 2, name: 'Weekend Errands', desc: 'Grey wool sweater + black leggings', occasion: 'Casual', colors: ['#808080', '#000000'] },
                        { id: 3, name: 'Office Core', desc: 'Charcoal trousers + ice blue blouse', occasion: 'Work', colors: ['#36454F', '#A8D8EA'] },
                    ]);
                    setLoading(false);
                }, 1500);
            } catch (error) {
                console.error('Error fetching dashboard data:', error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1a1a1a" />
                <Text style={styles.loadingText}>Curating your look...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* 1. Welcome Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu-outline" size={28} color="#1a1a1a" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.greeting}>Welcome back, {profile?.name || 'User'}</Text>
                    <Text style={styles.tagline}>Your AI stylist is ready.</Text>
                </View>
                <TouchableOpacity style={styles.profileAvatar}>
                    <Text style={styles.avatarText}>{profile?.name ? profile.name[0] : 'U'}</Text>
                </TouchableOpacity>
            </View>

            {/* 2. Outfit of the Day */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Outfit of the Day</Text>
                <View style={styles.ootdCard}>
                    <View style={styles.ootdBadge}>
                        <Ionicons name="sparkles" size={14} color="#fff" />
                        <Text style={styles.ootdBadgeText}>AI Selected</Text>
                    </View>
                    <Text style={styles.ootdOccasion}>{ootd?.occasion}</Text>
                    <Text style={styles.ootdDesc}>{ootd?.description}</Text>

                    <View style={styles.paletteRow}>
                        {ootd?.palette.map((color, idx) => (
                            <View key={idx} style={[styles.colorSwatch, { backgroundColor: color }]} />
                        ))}
                    </View>

                    <View style={styles.jewelleryHint}>
                        <Ionicons name="diamond-outline" size={16} color="#666" />
                        <Text style={styles.jewelleryText}>{ootd?.jewellery}</Text>
                    </View>
                </View>
            </View>

            {/* 3. Recommended Outfits */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recommended For You</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    {recommendations.map(rec => (
                        <View key={rec.id} style={styles.recCard}>
                            <Text style={styles.recTitle}>{rec.name}</Text>
                            <Text style={styles.recOccasion}>{rec.occasion}</Text>
                            <Text style={styles.recDesc}>{rec.desc}</Text>
                            <View style={styles.paletteRow}>
                                {rec.colors.map((c, i) => (
                                    <View key={i} style={[styles.colorSwatchSmall, { backgroundColor: c }]} />
                                ))}
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>

            {/* 4. Jewellery Recommendations */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Jewellery Match</Text>
                <View style={styles.jewelGrid}>
                    <View style={styles.jewelCard}>
                        <Ionicons name="medal-outline" size={28} color="#b0c4de" />
                        <Text style={styles.jewelTitle}>Silver / White Gold</Text>
                        <Text style={styles.jewelSub}>Best for Cool undertones</Text>
                    </View>
                    <View style={styles.jewelCard}>
                        <Ionicons name="watch-outline" size={28} color="#1a1a1a" />
                        <Text style={styles.jewelTitle}>Minimalist Watch</Text>
                        <Text style={styles.jewelSub}>Leather or mesh band</Text>
                    </View>
                </View>
            </View>

            {/* 5. Wardrobe Must-Haves */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Wardrobe Must-Haves</Text>
                <View style={styles.mustHavesCard}>
                    {['Structured Navy Blazer', 'Crisp White Button-down', 'Black Pointed Ankle Boots', 'Tailored Charcoal Trousers'].map((item, idx) => (
                        <View key={idx} style={styles.checkListItem}>
                            <Ionicons name="checkmark-circle-outline" size={22} color="#1a1a1a" />
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
                        {profile?.bestColors.map((c, i) => (
                            <View key={i} style={[styles.colorSwatchSmall, { backgroundColor: c, borderWidth: c === '#FFFFFF' ? 1 : 0, borderColor: '#eee' }]} />
                        ))}
                    </View>
                    <Text style={[styles.insightLabel, { marginTop: 16 }]}>Colors to Avoid:</Text>
                    <View style={styles.paletteRow}>
                        {profile?.avoidColors.map((c, i) => (
                            <View key={i} style={[styles.colorSwatchSmall, { backgroundColor: c }]} />
                        ))}
                    </View>
                </View>
            </View>

            {/* 7. Quick Actions */}
            <View style={[styles.section, { paddingBottom: 60 }]}>
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <TouchableOpacity style={styles.actionButtonMain}>
                    <Ionicons name="color-wand" size={20} color="#fff" />
                    <Text style={styles.actionButtonMainText}>Generate New Outfit</Text>
                </TouchableOpacity>
                <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.actionButtonSecondary} onPress={() => navigation.navigate('Onboarding')}>
                        <Ionicons name="camera-outline" size={22} color="#1a1a1a" />
                        <Text style={styles.actionButtonSecondaryText}>Upload Photo</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButtonSecondary}>
                        <Ionicons name="analytics-outline" size={22} color="#1a1a1a" />
                        <Text style={styles.actionButtonSecondaryText}>Analyze Look</Text>
                    </TouchableOpacity>
                </View>
            </View>

        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FAFAFA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FAFAFA',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        fontWeight: '500',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    menuButton: {
        padding: 4,
    },
    headerTitleContainer: {
        flex: 1,
        marginHorizontal: 16,
    },
    greeting: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    tagline: {
        fontSize: 14,
        color: '#888',
        marginTop: 4,
    },
    profileAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    section: {
        paddingHorizontal: 20,
        marginTop: 32,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 16,
    },
    ootdCard: {
        backgroundColor: '#fff',
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 3,
    },
    ootdBadge: {
        alignSelf: 'flex-start',
        backgroundColor: '#1a1a1a',
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
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
        fontWeight: '600',
    },
    ootdDesc: {
        fontSize: 24,
        fontWeight: '700',
        color: '#1a1a1a',
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
        borderTopColor: '#f0f0f0',
        paddingTop: 16,
    },
    jewelleryText: {
        marginLeft: 10,
        fontSize: 15,
        color: '#444',
    },
    horizontalScroll: {
        marginHorizontal: -20,
        paddingHorizontal: 20,
    },
    recCard: {
        width: 260,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginRight: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    recTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: 6,
    },
    recOccasion: {
        fontSize: 12,
        color: '#888',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 14,
        fontWeight: '500',
    },
    recDesc: {
        fontSize: 15,
        color: '#444',
        lineHeight: 22,
        marginBottom: 20,
    },
    jewelGrid: {
        flexDirection: 'row',
        gap: 16,
    },
    jewelCard: {
        flex: 1,
        backgroundColor: '#fff',
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
        color: '#1a1a1a',
        marginTop: 16,
        marginBottom: 6,
    },
    jewelSub: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    mustHavesCard: {
        backgroundColor: '#fff',
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
        borderBottomColor: '#f8f8f8',
    },
    checkListText: {
        marginLeft: 16,
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    insightsGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 16,
    },
    insightBox: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    insightsColorsList: {
        backgroundColor: '#fff',
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
        color: '#888',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '600',
    },
    insightValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1a1a1a',
    },
    actionButtonMain: {
        backgroundColor: '#1a1a1a',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 18,
        borderRadius: 16,
        marginBottom: 16,
    },
    actionButtonMainText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 10,
    },
    actionRow: {
        flexDirection: 'row',
        gap: 16,
    },
    actionButtonSecondary: {
        flex: 1,
        backgroundColor: '#fff',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 24,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#eee',
    },
    actionButtonSecondaryText: {
        color: '#1a1a1a',
        fontSize: 14,
        fontWeight: '600',
        marginTop: 12,
    }
});
