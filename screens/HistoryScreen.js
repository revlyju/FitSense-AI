import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import axios from 'axios';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../config';
import useRequireAuth from '../hooks/useRequireAuth';

export default function HistoryScreen({ navigation }) {
    const { isAuthenticated, userId: authUserId, isVerifying } = useRequireAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState(null);

    const fetchHistory = async (targetId) => {
        try {
            const id = targetId || authUserId || (await AsyncStorage.getItem('userId'));
            if (!id) {
                setLoading(false);
                return;
            }

            setLoading(true);
            setUserId(id);
            const response = await axios.get(`${API_BASE_URL}/api/analysis-history/${id}`);
            setHistory(Array.isArray(response.data) ? response.data : []);
        } catch (e) {
            console.error("Failed to load history list:", e);
            setHistory([]);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            let isActive = true;
            const init = async () => {
                const id = authUserId || (await AsyncStorage.getItem('userId'));
                if (isActive) {
                    if (id) {
                        await fetchHistory(id);
                    } else {
                        setLoading(false);
                    }
                }
            };
            init();
            return () => { isActive = false; };
        }, [authUserId])
    );

    const renderItem = ({ item }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('HistoryDetail', { id: item._id })}
        >
            <View style={styles.cardIcon}>
                <Ionicons name="shirt-outline" size={24} color="#632024" />
            </View>
            <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>{item.analysisName || "Style Analysis"}</Text>
                <Text style={styles.cardDate}>{new Date(item.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
    );

    if (isVerifying || !isAuthenticated) {
        return (
            <View style={[styles.container, styles.center]}>
                <ActivityIndicator size="large" color="#632024" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu-outline" size={28} color="#25344F" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Analysis History</Text>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#25344F" />
                </View>
            ) : history.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="time-outline" size={64} color="#ccc" />
                    <Text style={styles.emptyText}>You don't have any saved analysis history yet.</Text>
                </View>
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={item => item._id}
                    renderItem={renderItem}
                    contentContainerStyle={{ padding: 20 }}
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#FAF9F6' },
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
    menuButton: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#25344F' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    emptyText: { textAlign: 'center', color: '#6F4D38', marginTop: 15, fontSize: 16 },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2
    },
    cardIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#F5EBE6',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 15
    },
    cardContent: { flex: 1 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: '#25344F', marginBottom: 4 },
    cardDate: { fontSize: 14, color: '#6F4D38' }
});
