import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator, Alert, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const { width } = Dimensions.get('window');

export default function VirtualTryonScreen({ navigation }) {
    const [personImage, setPersonImage] = useState(null);
    const [outfitImage, setOutfitImage] = useState(null);
    const [resultImage, setResultImage] = useState(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const pickImage = async (setImageBase64) => {
        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission required', 'Please allow camera roll access to use this feature.');
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                quality: 0.5, // Downsize aggressively for memory limits
                base64: true,
            });

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const asset = result.assets[0];
                const base64URI = `data:image/jpeg;base64,${asset.base64}`;
                setImageBase64(base64URI);
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
                category: "tops" // Currently defaulted to tops based on implementation plan params mappings
            }, {
                timeout: 120000 // Give the backend 2 minutes limit for intense visual generation
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
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuButton}>
                    <Ionicons name="menu-outline" size={28} color="#25344F" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Virtual Try-On</Text>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                
                <Text style={styles.infoText}>Upload a clear photo of yourself and a clothing item you want to try on. Our AI precision models will seamlessly map the garment onto you.</Text>
                
                <View style={styles.uploadSection}>
                    <View style={styles.uploadBox}>
                        <Text style={styles.uploadLabel}>Your Photo</Text>
                        <TouchableOpacity style={styles.pickerTile} onPress={() => pickImage(setPersonImage)}>
                            {personImage ? (
                                <Image source={{ uri: personImage }} style={styles.previewImage} />
                            ) : (
                                <View style={styles.placeholder}>
                                    <Ionicons name="person-add-outline" size={32} color="#6F4D38" />
                                    <Text style={styles.placeholderText}>Tap to Upload</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.uploadBox}>
                        <Text style={styles.uploadLabel}>Garment</Text>
                        <TouchableOpacity style={styles.pickerTile} onPress={() => pickImage(setOutfitImage)}>
                            {outfitImage ? (
                                <Image source={{ uri: outfitImage }} style={styles.previewImage} />
                            ) : (
                                <View style={styles.placeholder}>
                                    <Ionicons name="shirt-outline" size={32} color="#6F4D38" />
                                    <Text style={styles.placeholderText}>Tap to Upload</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                <TouchableOpacity 
                    style={[styles.generateButton, (!personImage || !outfitImage || isGenerating) && styles.generateButtonDisabled]} 
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
                        <Text style={styles.resultTitle}>Your New Look</Text>
                        <Image source={{ uri: resultImage }} style={styles.resultImage} resizeMode="cover" />
                    </View>
                )}

            </ScrollView>
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
    
    scrollContent: {
        padding: 20,
        paddingBottom: 40
    },
    infoText: {
        fontSize: 14,
        color: '#6F4D38',
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
        color: '#25344F',
        marginBottom: 8,
        textAlign: 'center'
    },
    pickerTile: {
        height: 180,
        backgroundColor: '#fff',
        borderWidth: 2,
        borderColor: '#D5B893',
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
        color: '#6F4D38',
        fontSize: 12,
        fontWeight: '500'
    },
    generateButton: {
        backgroundColor: '#632024',
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
        backgroundColor: '#a6a6a6',
        shadowOpacity: 0,
        elevation: 0
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
        color: '#25344F',
        marginBottom: 15
    },
    resultImage: {
        width: width - 40,
        height: (width - 40) * 1.3,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#D5B893'
    }
});
