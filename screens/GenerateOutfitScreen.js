import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { API_BASE_URL } from '../config';
import { useTheme } from '../contexts/ThemeContext';
import useRequireAuth from '../hooks/useRequireAuth';

const { width } = Dimensions.get('window');

export default function GenerateOutfitScreen({ navigation }) {
    const { theme, isDark } = useTheme();
    const { isAuthenticated, isVerifying } = useRequireAuth();
    const [imageUri, setImageUri] = useState(null);
    const [imageBase64, setImageBase64] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [analysis, setAnalysis] = useState(null);

    if (isVerifying || !isAuthenticated) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    const pickImage = async () => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission required', 'Please allow access to your photos to upload a garment.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.6,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                setImageUri(result.assets[0].uri);
                setImageBase64(result.assets[0].base64);
                setAnalysis(null); // Clear previous results
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Error', 'Failed to pick image.');
        }
    };

    const handleGenerate = async () => {
        if (!imageBase64) {
            Alert.alert("Missing Image", "Please upload a photo of a garment first.");
            return;
        }

        setIsGenerating(true);

        try {
            let customKey = null;
            try {
                customKey = await AsyncStorage.getItem('geminiApiKey');
            } catch (e) {
                console.error("Failed to read geminiApiKey", e);
            }

            const activeUserId = await AsyncStorage.getItem('userId');
            const response = await axios.post(`${API_BASE_URL}/api/analyze-garment`, {
                image: imageBase64,
                userId: activeUserId || undefined,
                geminiApiKey: customKey || undefined,
            }, {
                timeout: 60000
            });

            if (response.data.success && response.data.analysis) {
                setAnalysis(response.data.analysis);
            } else {
                throw new Error("Invalid response from server");
            }
        } catch (err) {
            console.error("Garment analysis failed:", err);
            Alert.alert("Analysis Failed", "Our AI could not analyze this item. Please try a clearer photo.");
        } finally {
            setIsGenerating(false);
        }
    };

    const handleReset = () => {
        setImageUri(null);
        setImageBase64(null);
        setAnalysis(null);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu-outline" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Style Anything</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {!analysis ? (
                    <>
                        <View style={styles.introSection}>
                            <Text style={[styles.title, { color: theme.text }]}>AI Style Lab</Text>
                            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                                Upload a photo of any clothing item or accessory. Our Gemini-powered AI will analyze its texture, color, and silhouette to curate the perfect look for you.
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[styles.uploadContainer, { backgroundColor: theme.card, borderColor: theme.border }]}
                            activeOpacity={0.8}
                            onPress={pickImage}
                        >
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={styles.uploadedImage} resizeMode="contain" />
                            ) : (
                                <>
                                    <View style={[styles.uploadIconContainer, { backgroundColor: isDark ? '#2E2E48' : '#F5EBE6' }]}>
                                        <Ionicons name="camera-outline" size={40} color={theme.accent} />
                                    </View>
                                    <Text style={[styles.uploadText, { color: theme.text }]}>Upload Garment Photo</Text>
                                    <Text style={[styles.uploadSubtext, { color: theme.textSecondary }]}>Supports JPG, PNG (Max 10MB)</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={[styles.infoBox, { backgroundColor: isDark ? '#2E2E48' : '#F5EBE6' }]}>
                            <Ionicons name="sparkles" size={24} color={theme.accent} style={styles.infoIcon} />
                            <View style={styles.infoTextContainer}>
                                <Text style={[styles.infoTextTitle, { color: theme.text }]}>Insight Engine:</Text>
                                <Text style={[styles.infoText, { color: theme.textSecondary }]}>• Expert Color Palettes</Text>
                                <Text style={[styles.infoText, { color: theme.textSecondary }]}>• Complementary Pieces</Text>
                                <Text style={[styles.infoText, { color: theme.textSecondary }]}>• Professional Styling Tips</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.generateButton, { backgroundColor: theme.accent }, (isGenerating || !imageUri) && styles.generateButtonDisabled]}
                            activeOpacity={0.8}
                            onPress={handleGenerate}
                            disabled={isGenerating || !imageUri}
                        >
                            {isGenerating ? (
                                <View style={styles.loadingRow}>
                                    <ActivityIndicator color="#fff" size="small" />
                                    <Text style={styles.generateButtonText}>Analyzing your style...</Text>
                                </View>
                            ) : (
                                <>
                                    <Ionicons name="analytics-outline" size={20} color="#fff" style={styles.generateIcon} />
                                    <Text style={styles.generateButtonText}>Analyze & Style Item</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.resultsContainer}>
                        <View style={[styles.resultHeader, { backgroundColor: isDark ? '#2E2E48' : '#F5EBE6' }]}>
                            <Ionicons name="ribbon-outline" size={28} color={theme.accent} />
                            <Text style={[styles.resultTitle, { color: theme.text }]}>AI Style Profile</Text>
                        </View>

                        <View style={styles.resultImageWrapper}>
                            <Image source={{ uri: imageUri }} style={[styles.resultImageSmall, { borderColor: theme.border, backgroundColor: '#fff' }]} resizeMode="contain" />
                            <Text style={[styles.resultImageLabel, { color: theme.text }]}>Target Item</Text>
                        </View>

                        <View style={[styles.resultSection, { backgroundColor: theme.card }]}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Item Description</Text>
                            <Text style={[styles.resultText, { color: theme.textSecondary }]}>{analysis.description}</Text>
                        </View>

                        <View style={[styles.resultSection, { backgroundColor: theme.card }]}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Pro Color Palettes</Text>
                            {analysis.colorPalettes.map((p, idx) => (
                                <View key={idx} style={styles.paletteRow}>
                                    <Text style={[styles.paletteName, { color: theme.text }]}>{p.name}</Text>
                                    <View style={styles.colorsContainer}>
                                        {p.colors.map((hex, i) => (
                                            <View key={i} style={[styles.colorSwatch, { backgroundColor: hex }]} />
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>

                        <View style={[styles.resultSection, { backgroundColor: theme.card }]}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Complementary Pieces</Text>
                            <View style={styles.bulletList}>
                                {analysis.complementaryItems.map((item, idx) => (
                                    <Text key={idx} style={[styles.bulletItem, { color: theme.textSecondary }]}>• {item}</Text>
                                ))}
                            </View>
                        </View>

                        <View style={[styles.resultSection, { backgroundColor: theme.card }]}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Styling & Context</Text>
                            <View style={styles.bulletList}>
                                {analysis.stylingTips.map((tip, idx) => (
                                    <Text key={idx} style={[styles.bulletItem, { color: theme.textSecondary }]}>• {tip}</Text>
                                ))}
                            </View>
                        </View>

                        <View style={[styles.resultSection, { backgroundColor: theme.card }]}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Matching Accessories</Text>
                            <View style={styles.bulletList}>
                                {analysis.matchingAccessories.map((acc, idx) => (
                                    <Text key={idx} style={[styles.bulletItem, { color: theme.textSecondary }]}>• {acc}</Text>
                                ))}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.resetButton, { borderColor: theme.accent }]}
                            activeOpacity={0.8}
                            onPress={handleReset}
                        >
                            <Ionicons name="refresh-outline" size={20} color={theme.accent} style={styles.generateIcon} />
                            <Text style={[styles.resetButtonText, { color: theme.accent }]}>Style Another Item</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
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
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    introSection: {
        marginBottom: 25,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 22,
    },
    uploadContainer: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 16,
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2
    },
    uploadIconContainer: {
        width: 70,
        height: 70,
        borderRadius: 35,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    uploadText: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 5,
    },
    uploadSubtext: {
        fontSize: 14,
    },
    uploadedImage: {
        width: '100%',
        height: 300,
        borderRadius: 12,
    },
    infoBox: {
        flexDirection: 'row',
        padding: 18,
        borderRadius: 12,
        marginBottom: 30,
    },
    infoIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    infoTextContainer: {
        flex: 1,
    },
    infoTextTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        lineHeight: 22,
    },
    generateButton: {
        flexDirection: 'row',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    generateButtonDisabled: {
        opacity: 0.5,
    },
    loadingRow: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    generateIcon: {
        marginRight: 10,
    },
    generateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 8
    },
    // Results Styles
    resultsContainer: {
        flex: 1,
        paddingBottom: 20,
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 25,
        justifyContent: 'center',
        padding: 15,
        borderRadius: 12,
    },
    resultTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    resultImageWrapper: {
        alignItems: 'center',
        marginBottom: 25,
    },
    resultImageSmall: {
        width: 200,
        height: 250,
        borderRadius: 16,
        borderWidth: 1,
        marginBottom: 8,
    },
    resultImageLabel: {
        fontSize: 14,
        fontWeight: '600',
        textTransform: 'uppercase',
        opacity: 0.7
    },
    resultSection: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
        elevation: 2,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 15,
    },
    paletteRow: {
        marginBottom: 15
    },
    paletteName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8
    },
    colorsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    colorSwatch: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    resultText: {
        fontSize: 15,
        lineHeight: 22,
    },
    bulletList: {
        marginTop: 5,
    },
    bulletItem: {
        fontSize: 15,
        lineHeight: 24,
        marginBottom: 10,
    },
    resetButton: {
        flexDirection: 'row',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        marginTop: 10,
    },
    resetButtonText: {
        fontSize: 16,
        fontWeight: '700',
    }
});
