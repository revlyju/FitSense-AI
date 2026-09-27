import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { API_BASE_URL } from '../config';

export default function UploadScreen({ navigation, route }) {
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [isPreprocessing, setIsPreprocessing] = useState(false);
  const userPreferences = route?.params?.userPreferences || {};
  const userId = route?.params?.userId ?? null;
  const isGuest = route?.params?.isGuest || false;
  const isNight = userPreferences.timeOfDay === "Night";

  const theme = {
    bg: isNight ? "#25344F" : "#D5B893",
    card: isNight ? "#3A4B6B" : "#ffffff",
    accent: "#632024",
    text: isNight ? "#EAD8C5" : "#25344F",
    subText: isNight ? "#D5B893" : "#6F4D38",
    border: isNight ? "rgba(234,216,197,0.2)" : "rgba(37,52,79,0.1)",
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission required', 'Access to photos is needed to analyze your style.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageBase64(asset.base64 || null);
      }
    } catch (error) {
      console.error('Pick image error:', error);
      Alert.alert('Error', 'Something went wrong while picking the image.');
    }
  };

  const handleContinue = async () => {
    if (!imageUri || !imageBase64) {
      Alert.alert('Missing Image', 'Please upload a photo of yourself first.');
      return;
    }

    setIsPreprocessing(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/preprocess-image`, {
        image: `data:image/jpeg;base64,${imageBase64}`,
      }, {
        timeout: 45000,
        headers: { 'Content-Type': 'application/json' },
      });

      const data = response.data;
      const censoredImage = data?.censoredImage || `data:image/jpeg;base64,${imageBase64}`;

      navigation.navigate('CensorReview', {
        userId,
        isGuest: false,
        userPreferences: {
          ...userPreferences,
          image: censoredImage,
          originalImage: `data:image/jpeg;base64,${imageBase64}`,
        },
        censoredImage,
        faceDetected: !!data?.faceDetected,
        faceShape: data?.faceShape || 'Unknown',
        contrastLevel: data?.contrastLevel || 'Unknown',
      });
    } catch (err) {
      console.error('Error preprocessing image:', err);
      Alert.alert(
        'Privacy Verification',
        'Could not complete automated face concealment. Would you like to review the photo before proceeding?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Review Photo',
            onPress: () => {
              navigation.navigate('CensorReview', {
                userId,
                isGuest: false,
                userPreferences: {
                  ...userPreferences,
                  image: `data:image/jpeg;base64,${imageBase64}`,
                },
                censoredImage: `data:image/jpeg;base64,${imageBase64}`,
                faceDetected: false,
                faceShape: 'Unknown',
                contrastLevel: 'Unknown',
              });
            },
          },
        ]
      );
    } finally {
      setIsPreprocessing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Back Button Header */}
        <View style={{ marginBottom: 15, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={{ 
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={[styles.title, { color: theme.text }]}>Upload Photo</Text>
            <Text style={{ fontSize: 14, color: theme.accent, fontWeight: '600' }}> (Required)</Text>
          </View>
          <Text style={[styles.subtitle, { color: theme.subText }]}>
            Upload a clear photo for the best AI styling insights.
          </Text>
        </View>

        {/* Upload Dropzone Area */}
        <TouchableOpacity 
          style={[styles.uploadArea, { backgroundColor: theme.card, borderColor: theme.accent + '40' }]} 
          onPress={pickImage}
          activeOpacity={0.8}
        >
          {imageUri ? (
            <View style={styles.previewWrapper}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <View style={styles.overlayBtn}>
                <Ionicons name="camera" size={20} color="#fff" />
                <Text style={styles.overlayBtnText}>Change Photo</Text>
              </View>
            </View>
          ) : (
            <View style={styles.dropzone}>
              <View style={[styles.iconCircle, { backgroundColor: theme.accent + '15' }]}>
                <Ionicons name="cloud-upload" size={32} color={theme.accent} />
              </View>
              <Text style={[styles.dropzoneTitle, { color: theme.text }]}>Tap to Upload</Text>
              <Text style={[styles.dropzoneSub, { color: theme.subText }]}>PNG, JPG or JPEG up to 10MB</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Tips Card */}
        <View style={[styles.tipsCard, { backgroundColor: theme.card }]}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color={theme.accent} />
            <Text style={[styles.tipsTitle, { color: theme.text }]}>Upload Tips for Best Results</Text>
          </View>
          
          <View style={styles.tipsList}>
            {[
              "Full body visible (head to toe)",
              "Stand straight and face the camera",
              "Use good natural lighting",
              "Keep background simple and clutter-free",
              "Only one person in the frame"
            ].map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <View style={[styles.tipDot, { backgroundColor: theme.accent }]} />
                <Text style={[styles.tipText, { color: theme.subText }]}>{tip}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            { backgroundColor: theme.accent },
            (!imageUri || isPreprocessing) && styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={!imageUri || isPreprocessing}
          activeOpacity={0.9}
        >
          {isPreprocessing ? (
            <>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.continueButtonText}>Processing Face Privacy...</Text>
            </>
          ) : (
            <>
              <Text style={styles.continueButtonText}>Analyze My Style</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.8,
  },
  uploadArea: {
    height: 320,
    borderRadius: 24,
    borderWidth: 2,
    borderStyle: 'dashed',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#25344F',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
    marginBottom: 32,
  },
  dropzone: {
    alignItems: 'center',
    padding: 20,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  dropzoneTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  dropzoneSub: {
    fontSize: 13,
    opacity: 0.6,
  },
  previewWrapper: {
    width: '100%',
    height: '100%',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  overlayBtn: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: 'rgba(37, 52, 79, 0.8)',
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  overlayBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  tipsCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#25344F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    marginBottom: 32,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
    paddingBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 10,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 12,
    opacity: 0.6,
  },
  tipText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  continueButton: {
    height: 60,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#632024',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 15,
    elevation: 10,
  },
  continueButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.4,
  },
});