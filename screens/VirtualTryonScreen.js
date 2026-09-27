import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useTheme } from '../contexts/ThemeContext';
import useRequireAuth from '../hooks/useRequireAuth';

const { width } = Dimensions.get('window');

export default function VirtualTryonScreen({ navigation, route }) {
    const { theme, isDark } = useTheme();
    const { isAuthenticated, isVerifying } = useRequireAuth();
    const [personImage, setPersonImage] = useState(null);
    const [outfitImage, setOutfitImage] = useState(null);
    const [resultImage, setResultImage] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // Accept garment image from navigation params (e.g. from OutfitDetailsModal)
    useEffect(() => {
        if (route?.params?.garmentImageUri) {
            setOutfitImage(route.params.garmentImageUri);
        }
    }, [route?.params?.garmentImageUri]);

    if (isVerifying || !isAuthenticated) {
        return (
            <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color={theme.accent} />
            </View>
        );
    }

    const pickImage = async (setImageCallback) => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission required', 'Please allow camera roll access to use this feature.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.5,
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const base64URI = `data:image/jpeg;base64,${asset.base64}`;
                setImageCallback(base64URI);
            }
        } catch (error) {
            console.error('Image picker error:', error);
            Alert.alert('Error', 'Failed to pick image.');
        }
    };

    const handleTryOn = async () => {
        if (!personImage || !outfitImage) {
            Alert.alert("Missing Images", "Please upload both a photo of yourself and a garment.");
            return;
        }

        setIsGenerating(true);
        setResultImage(null);

        try {
            const response = await axios.post(`${API_BASE_URL}/virtual-tryon`, {
                personImage,
                outfitImage,
                category: "tops"
            }, {
                timeout: 120000
            });

            if (response.data.success && response.data.resultImage) {
                setResultImage(response.data.resultImage);
            } else {
                Alert.alert("Error", "We received a blank result from the AI engine.");
            }
        } catch (err) {
            console.error("Virtual try-on request failed:", err);
            Alert.alert("Generation Failed", err.response?.data?.error || err.message || "Unknown error occurred");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu-outline" size={28} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Virtual Try-On</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <Text style={[styles.infoText, { color: theme.textSecondary }]}>Upload a clear photo of yourself and a clothing item you want to try on. Our AI precision models will seamlessly map the garment onto you.</Text>
                
                <View style={styles.uploadSection}>
                    <View style={styles.uploadBox}>
                        <Text style={[styles.uploadLabel, { color: theme.text }]}>Your Photo</Text>
                        <TouchableOpacity style={[styles.pickerTile, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => pickImage(setPersonImage)}>
                            {personImage ? (
                                <Image source={{ uri: personImage }} style={styles.previewImage} />
                            ) : (
                                <View style={styles.placeholder}>
                                    <Ionicons name="person-add-outline" size={32} color={theme.textSecondary} />
                                    <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Tap to Upload</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.uploadBox}>
                        <Text style={[styles.uploadLabel, { color: theme.text }]}>Garment</Text>
                        <TouchableOpacity style={[styles.pickerTile, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => pickImage(setOutfitImage)}>
                            {outfitImage ? (
                                <Image source={{ uri: outfitImage }} style={styles.previewImage} resizeMode="contain" />
                            ) : (
                                <View style={styles.placeholder}>
                                    <Ionicons name="shirt-outline" size={32} color={theme.textSecondary} />
                                    <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>Tap to Upload</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.generateButton, { backgroundColor: theme.accent }, (!personImage || !outfitImage || isGenerating) && styles.generateButtonDisabled]} 
                    onPress={handleTryOn} 
                    disabled={!personImage || !outfitImage || isGenerating}
                >
                    {isGenerating ? (
                        <View style={styles.generatingContents}>
                            <ActivityIndicator size="small" color="#fff" />
                            <Text style={styles.generateButtonText}>Generating style magic...</Text>
                        </View>
                    ) : (
                        <Text style={styles.generateButtonText}>Visualize My Fit</Text>
                    )}
                </TouchableOpacity>

                {resultImage && (
                    <View style={styles.resultSection}>
                        <Text style={[styles.resultTitle, { color: theme.text }]}>Your New Look</Text>
                        <Image source={{ uri: resultImage }} style={[styles.resultImage, { borderColor: theme.border }]} resizeMode="cover" />
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
        paddingBottom: 40
    },
    infoText: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 20,
        textAlign: 'center'
    },
    uploadSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30
    },
    uploadBox: {
        flex: 1,
        marginHorizontal: 5
    },
    uploadLabel: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center'
    },
    pickerTile: {
        height: 180,
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 12,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center'
    },
    previewImage: {
        width: '100%',
        height: '100%'
    },
    placeholder: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    placeholderText: {
        marginTop: 8,
        fontSize: 12,
        fontWeight: '500'
    },
    generateButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        marginBottom: 30
    },
    generateButtonDisabled: {
        opacity: 0.5,
    },
    generatingContents: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    generateButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8
    },
    resultSection: {
        alignItems: 'center',
        marginTop: 10
    },
    resultTitle: {
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 15
    },
    resultImage: {
        width: width - 40,
        height: (width - 40) * 1.3,
        borderRadius: 16,
        borderWidth: 1,
    }
});
