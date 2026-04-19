import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';

export default function GenerateOutfitScreen({ navigation }) {
    const { theme, isDark } = useTheme();
    const [imageUri, setImageUri] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);
    const [showResults, setShowResults] = useState(false);

    const handleGenerate = () => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            setShowResults(true);
        }, 1500);
    };

    const handleReset = () => {
        setImageUri(null);
        setShowResults(false);
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu-outline" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Generate Outfit</Text>
            </View>
            
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {!showResults ? (
                    <>
                        <View style={styles.introSection}>
                            <Text style={styles.title}>Style an Accessory</Text>
                            <Text style={styles.subtitle}>
                                Upload a picture of any accessory (e.g., shoes, bag, necklace) and our AI will recommend the perfect colors and clothing pieces to match it!
                            </Text>
                        </View>

                        <TouchableOpacity 
                            style={styles.uploadContainer} 
                            activeOpacity={0.8}
                            onPress={() => setImageUri('https://via.placeholder.com/300x300.png?text=Sample+Uploaded+Accessory')}
                        >
                            {imageUri ? (
                                <Image source={{ uri: imageUri }} style={styles.uploadedImage} />
                            ) : (
                                <>
                                    <View style={styles.uploadIconContainer}>
                                        <Ionicons name="camera-outline" size={40} color="#632024" />
                                    </View>
                                    <Text style={styles.uploadText}>Tap to Upload Accessory</Text>
                                    <Text style={styles.uploadSubtext}>Supports JPG, PNG</Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle-outline" size={24} color="#6F4D38" style={styles.infoIcon} />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoTextTitle}>What you will get:</Text>
                                <Text style={styles.infoText}>• Recommended color palettes</Text>
                                <Text style={styles.infoText}>• Complementary clothing pieces</Text>
                                <Text style={styles.infoText}>• Styling tips and matching accessories</Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]} 
                            activeOpacity={0.8}
                            onPress={handleGenerate}
                            disabled={isGenerating}
                        >
                            {isGenerating ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="color-wand-outline" size={20} color="#fff" style={styles.generateIcon} />
                                    <Text style={styles.generateButtonText}>Generate Outfit Recommendations</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </>
                ) : (
                    <View style={styles.resultsContainer}>
                        <View style={styles.resultHeader}>
                            <Ionicons name="sparkles" size={28} color="#632024" />
                            <Text style={styles.resultTitle}>Your AI Recommendations</Text>
                        </View>
                        
                        {imageUri && (
                            <View style={styles.resultImageWrapper}>
                                <Image source={{ uri: imageUri }} style={styles.resultImageSmall} />
                                <Text style={styles.resultImageLabel}>Your Item</Text>
                            </View>
                        )}

                        <View style={styles.resultSection}>
                            <Text style={styles.sectionTitle}>Complementary Colors</Text>
                            <View style={styles.colorsContainer}>
                                <View style={[styles.colorSwatch, { backgroundColor: '#FADADD' }]} />
                                <View style={[styles.colorSwatch, { backgroundColor: '#003366' }]} />
                                <View style={[styles.colorSwatch, { backgroundColor: '#EADDCA' }]} />
                                <View style={[styles.colorSwatch, { backgroundColor: '#FFFFFF', borderColor: '#ccc', borderWidth: 1 }]} />
                                <View style={[styles.colorSwatch, { backgroundColor: '#4F7942' }]} />
                            </View>
                            <Text style={styles.resultText}>Soft pinks, navy blue, beige, crisp white, and earth green pair beautifully with this item.</Text>
                        </View>

                        <View style={styles.resultSection}>
                            <Text style={styles.sectionTitle}>Matching Clothing Pieces</Text>
                            <View style={styles.bulletList}>
                                <Text style={styles.bulletItem}>• High-waisted wide-leg trousers (Navy or Beige)</Text>
                                <Text style={styles.bulletItem}>• Crisp white silk or linen button-up shirt</Text>
                                <Text style={styles.bulletItem}>• A tailored blazer to elevate the structured look</Text>
                                <Text style={styles.bulletItem}>• Flowy midi skirts for a softer, relaxed aesthetic</Text>
                            </View>
                        </View>

                        <View style={styles.resultSection}>
                            <Text style={styles.sectionTitle}>Other Accessories</Text>
                            <View style={styles.bulletList}>
                                <Text style={styles.bulletItem}>• Minimalist gold jewelry (hoops, thin chain)</Text>
                                <Text style={styles.bulletItem}>• Neutral-toned structured crossbody handbag</Text>
                                <Text style={styles.bulletItem}>• Classic tortoiseshell sunglasses</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.resetButton} activeOpacity={0.8} onPress={handleReset}>
                            <Ionicons name="refresh-outline" size={20} color="#632024" style={styles.generateIcon} />
                            <Text style={styles.resetButtonText}>Start Over</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#FAF9F6' 
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
    menuButton: { marginRight: 15 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#25344F' },
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
        color: '#25344F',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 15,
        color: '#6F4D38',
        lineHeight: 22,
    },
    uploadContainer: {
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#E8E0D9',
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
        backgroundColor: '#F5EBE6',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 15,
    },
    uploadText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#25344F',
        marginBottom: 5,
    },
    uploadSubtext: {
        fontSize: 14,
        color: '#999',
    },
    uploadedImage: {
        width: '100%',
        height: 200,
        borderRadius: 12,
        resizeMode: 'contain',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#F5EBE6',
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
        color: '#25344F',
        marginBottom: 8,
    },
    infoText: {
        fontSize: 14,
        color: '#6F4D38',
        lineHeight: 22,
    },
    generateButton: {
        flexDirection: 'row',
        backgroundColor: '#632024',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#632024',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 4,
    },
    generateButtonDisabled: {
        opacity: 0.7,
    },
    generateIcon: {
        marginRight: 10,
    },
    generateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    // Results Styles
    resultsContainer: {
        flex: 1,
        paddingBottom: 20,
    },
    resultHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        justifyContent: 'center',
        backgroundColor: '#F5EBE6',
        padding: 15,
        borderRadius: 12,
    },
    resultTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#25344F',
        marginLeft: 10,
    },
    resultImageWrapper: {
        alignItems: 'center',
        marginBottom: 25,
    },
    resultImageSmall: {
        width: 150,
        height: 150,
        borderRadius: 12,
        resizeMode: 'cover',
        borderWidth: 1,
        borderColor: '#E8E0D9',
        marginBottom: 8,
    },
    resultImageLabel: {
        fontSize: 14,
        color: '#6F4D38',
        fontWeight: '500',
    },
    resultSection: {
        backgroundColor: '#fff',
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
        fontWeight: '600',
        color: '#25344F',
        marginBottom: 15,
    },
    colorsContainer: {
        flexDirection: 'row',
        marginBottom: 15,
        flexWrap: 'wrap',
    },
    colorSwatch: {
        width: 45,
        height: 45,
        borderRadius: 22.5,
        marginRight: 12,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    resultText: {
        fontSize: 15,
        color: '#6F4D38',
        lineHeight: 22,
    },
    bulletList: {
        marginTop: 5,
    },
    bulletItem: {
        fontSize: 15,
        color: '#6F4D38',
        lineHeight: 24,
        marginBottom: 8,
    },
    resetButton: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#632024',
        marginTop: 10,
    },
    resetButtonText: {
        color: '#632024',
        fontSize: 16,
        fontWeight: '700',
    }
});
