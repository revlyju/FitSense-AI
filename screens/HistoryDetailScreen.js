import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import DbOutfitCard from '../components/DbOutfitCard';
import useRequireAuth from '../hooks/useRequireAuth';

export default function HistoryDetailScreen({ navigation, route }) {
    const { isAuthenticated, isVerifying } = useRequireAuth();
    const id = route?.params?.id;
    const [detail, setDetail] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!isAuthenticated || !id) return;
        const fetchDetail = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/api/analysis-history/detail/${id}`);
                setDetail(response.data);
            } catch (e) {
                console.error("Failed to load history detail:", e);
            } finally {
                setLoading(false);
            }
        };
        fetchDetail();
    }, [id, isAuthenticated]);

    if (isVerifying || !isAuthenticated) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#25344F" />
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#25344F" />
            </View>
        );
    }

    if (!detail) {
        return (
            <View style={styles.center}>
                <Text style={{ color: '#6F4D38' }}>Could not load details.</Text>
            </View>
        );
    }

    const renderColorSwatches = (colors) => {
        if (!colors || colors.length === 0) return <Text style={styles.emptyText}>None mapped</Text>;
        
        return (
            <View style={styles.colorContainer}>
                {colors.map((c, i) => {
                    let hex = '#ccc';
                    let name = 'Color';
                    if (typeof c === 'string') {
                        hex = c.match(/#[0-9a-fA-F]{3,8}/i)?.[0] || c;
                    } else if (typeof c === 'object') {
                        hex = c.hex || c.value || c.color || '#ccc';
                        name = c.name || c.label || name;
                    }
                    
                    const isWhite = hex.toUpperCase() === '#FFFFFF' || hex.toUpperCase() === '#FFF';
                    
                    return (
                        <View key={i} style={[styles.swatchWrap]}>
                            <View style={[styles.swatch, { backgroundColor: hex, borderWidth: isWhite ? 1 : 0, borderColor: '#eee' }]} />
                            {typeof c !== 'string' && c.name && <Text style={styles.swatchText} numberOfLines={1}>{c.name}</Text>}
                        </View>
                    );
                })}
            </View>
        );
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#25344F" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{detail.analysisName}</Text>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Basic Info</Text>
                <View style={styles.infoGrid}>
                    <View style={styles.infoBox}><Text style={styles.infoLabel}>Face Shape</Text><Text style={styles.infoValue}>{detail.faceShape || '-'}</Text></View>
                    <View style={styles.infoBox}><Text style={styles.infoLabel}>Body Shape</Text><Text style={styles.infoValue}>{detail.bodyShape || '-'}</Text></View>
                    <View style={styles.infoBox}><Text style={styles.infoLabel}>Skin Tone</Text><Text style={styles.infoValue}>{detail.skinTone || '-'}</Text></View>
                    <View style={styles.infoBox}><Text style={styles.infoLabel}>Undertone</Text><Text style={styles.infoValue}>{detail.undertone || '-'}</Text></View>
                    <View style={styles.infoBox}><Text style={styles.infoLabel}>Contrast</Text><Text style={styles.infoValue}>{detail.contrastLevel || '-'}</Text></View>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Best Colors</Text>
                {renderColorSwatches(detail.bestColors)}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Avoid Colors</Text>
                {renderColorSwatches(detail.avoidColors)}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recommended Outfits</Text>
                {detail.recommendedOutfits && detail.recommendedOutfits.length > 0 ? (
                    detail.recommendedOutfits.map((outfit, index) => (
                        <DbOutfitCard 
                            key={index} 
                            outfit={{ 
                                ...outfit, 
                                imageUrl: outfit.imageUrl.startsWith('http') ? outfit.imageUrl : `${API_BASE_URL}${outfit.imageUrl}` 
                            }} 
                        />
                    ))
                ) : (
                    <Text style={styles.emptyText}>No outfits saved for this analysis.</Text>
                )}
            </View>
            <View style={{ height: 40 }} />
        </ScrollView>
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
    backButton: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#25344F' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    section: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#e0e0e0', backgroundColor: '#fff', marginBottom: 10 },
    sectionTitle: { fontSize: 18, fontWeight: '700', color: '#632024', marginBottom: 15 },
    infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -5 },
    infoBox: { 
        width: '46%', 
        backgroundColor: '#FAF9F6', 
        margin: '2%', 
        padding: 15, 
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1
    },
    infoLabel: { fontSize: 12, color: '#6F4D38', marginBottom: 4 },
    infoValue: { fontSize: 16, fontWeight: '600', color: '#25344F' },
    colorContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    swatchWrap: { alignItems: 'center', marginRight: 12, marginBottom: 12, width: 44 },
    swatch: { width: 40, height: 40, borderRadius: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 1 },
    swatchText: { fontSize: 10, color: '#6F4D38', marginTop: 4, textAlign: 'center' },
    emptyText: { color: '#6F4D38', fontStyle: 'italic' }
});
