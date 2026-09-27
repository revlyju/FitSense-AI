import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { useCallback, useState, useEffect } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../config';
import { useTheme } from '../contexts/ThemeContext';
import useRequireAuth from '../hooks/useRequireAuth';

export default function HistoryScreen({ navigation }) {
    const { theme, isDark } = useTheme();
    const { isAuthenticated, userId: authUserId } = useRequireAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [userId, setUserId] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    const fetchHistory = async (targetId, isPullRefresh = false) => {
        try {
            const id = targetId || userId || authUserId || (await AsyncStorage.getItem('userId'));
            if (!id) {
                setLoading(false);
                setRefreshing(false);
                return;
            }

            setUserId(id);
            if (isPullRefresh) {
                setRefreshing(true);
            } else if (history.length === 0) {
                setLoading(true);
            }
            setErrorMessage(null);

            // Check cache first for instant render
            try {
                const cached = await AsyncStorage.getItem(`@cache_history_${id}`);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed) && parsed.length > 0) {
                        setHistory(parsed);
                    }
                }
            } catch (ce) {
                // Ignore cache read error
            }

            const response = await axios.get(`${API_BASE_URL}/api/analysis-history/${id}`, { timeout: 7000 });
            const list = Array.isArray(response.data) ? response.data : [];
            setHistory(list);
            AsyncStorage.setItem(`@cache_history_${id}`, JSON.stringify(list)).catch(() => {});
        } catch (e) {
            console.error("Failed to load history list:", e?.message || e);
            setErrorMessage("Unable to sync latest history. Tap to retry.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Load on initial mount
    useEffect(() => {
        let isActive = true;
        const init = async () => {
            const id = authUserId || (await AsyncStorage.getItem('userId'));
            if (isActive && id) {
                await fetchHistory(id);
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
                    await fetchHistory(id);
                }
            };
            init();
            return () => { isActive = false; };
        }, [authUserId])
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={[styles.card, { backgroundColor: isDark ? theme.card : '#fff', borderColor: theme.border }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('HistoryDetail', { id: item._id })}
        >
            <View style={[styles.cardIcon, { backgroundColor: isDark ? '#2e2638' : '#F5EBE6' }]}>
                <Ionicons name="shirt-outline" size={24} color={theme.accent} />
            </View>
            <View style={styles.cardContent}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{item.analysisName || "Style Analysis"}</Text>
                <Text style={[styles.cardDate, { color: theme.textSecondary }]}>
                    {new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu-outline" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Analysis History</Text>
                {loading && (
                    <ActivityIndicator size="small" color={theme.accent} style={{ marginLeft: 10 }} />
                )}
            </View>

            {errorMessage ? (
                <TouchableOpacity
                    style={[styles.errorBanner, { backgroundColor: isDark ? '#331a1a' : '#ffebee' }]}
                    onPress={() => fetchHistory(userId)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="alert-circle-outline" size={18} color="#d32f2f" />
                    <Text style={[styles.errorText, { color: isDark ? '#ff8a80' : '#c62828' }]}>
                        {errorMessage}
                    </Text>
                </TouchableOpacity>
            ) : null}

            {loading && history.length === 0 ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={theme.accent} />
                </View>
            ) : history.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="time-outline" size={64} color={theme.textSecondary} />
                    <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                        You don't have any saved analysis history yet.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 20 }}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => fetchHistory(userId, true)}
                            colors={[theme.accent]}
                            tintColor={theme.accent}
                        />
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomWidth: 1,
    },
    menuButton: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: '700' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyText: { textAlign: 'center', marginTop: 15, fontSize: 16 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
        borderWidth: 1,
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15
    },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    cardDate: { fontSize: 14 },
    errorBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginHorizontal: 16,
        marginTop: 10,
        borderRadius: 8,
        gap: 8,
    },
    errorText: {
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    }
});
