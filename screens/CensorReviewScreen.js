import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import useRequireAuth from '../hooks/useRequireAuth';

const { width } = Dimensions.get('window');

export default function CensorReviewScreen({ navigation, route }) {
  // Enforce authentication on member route
  const { isAuthenticated, isVerifying } = useRequireAuth();

  const {
    userId,
    userPreferences = {},
    censoredImage,
    faceDetected = false,
    faceShape = 'Unknown',
    contrastLevel = 'Unknown',
  } = route?.params || {};

  const [isModalOpen, setIsModalOpen] = useState(false);

  const isNight = userPreferences?.timeOfDay === 'Night';

  const theme = {
    bg: isNight ? '#25344F' : '#D5B893',
    card: isNight ? '#3A4B6B' : '#ffffff',
    accent: '#632024',
    text: isNight ? '#EAD8C5' : '#25344F',
    subText: isNight ? '#D5B893' : '#6F4D38',
    border: isNight ? 'rgba(234,216,197,0.2)' : 'rgba(37,52,79,0.1)',
    successBg: isNight ? 'rgba(46, 125, 50, 0.25)' : 'rgba(46, 125, 50, 0.1)',
    successText: isNight ? '#81C784' : '#2E7D32',
    warningBg: isNight ? 'rgba(239, 108, 0, 0.25)' : 'rgba(239, 108, 0, 0.12)',
    warningText: isNight ? '#FFB74D' : '#D84315',
  };

  if (isVerifying || !isAuthenticated) {
    return null;
  }

  const handleConfirmAndProceed = () => {
    navigation.navigate('Loading', {
      userId,
      isGuest: false,
      userPreferences: {
        ...userPreferences,
        image: censoredImage,
        isPreprocessed: true,
        faceShape,
        contrastLevel,
      },
    });
  };

  const handleRetakePhoto = () => {
    navigation.goBack();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isNight ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Navigation */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={handleRetakePhoto}
            style={[styles.backButton, { backgroundColor: isNight ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.4)' }]}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

          <View style={[styles.privacyBadge, { backgroundColor: isNight ? 'rgba(99,32,36,0.5)' : '#632024' }]}>
            <Ionicons name="shield-checkmark" size={14} color="#FFF" style={{ marginRight: 5 }} />
            <Text style={styles.privacyBadgeText}>PRIVACY VERIFICATION</Text>
          </View>
        </View>

        {/* Title Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Review Concealed Photo</Text>
          <Text style={[styles.subtitle, { color: theme.subText }]}>
            This is the exact image that will be sent to Google Gemini AI. Please verify that your face is concealed to your satisfaction before proceeding.
          </Text>
        </View>

        {/* Image Preview Card */}
        <View style={[styles.imageCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {censoredImage ? (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => setIsModalOpen(true)}
              style={styles.imageTouchable}
            >
              <Image
                source={{ uri: censoredImage }}
                style={styles.previewImage}
                resizeMode="contain"
              />
              <View style={styles.zoomHint}>
                <Ionicons name="expand-outline" size={16} color="#FFF" />
                <Text style={styles.zoomHintText}>Tap to Zoom</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <View style={styles.emptyImage}>
              <Ionicons name="image-outline" size={48} color={theme.subText} />
              <Text style={{ color: theme.subText, marginTop: 8 }}>No image available</Text>
            </View>
          )}
        </View>

        {/* Face Concealment Status Banner */}
        <View
          style={[
            styles.statusBanner,
            {
              backgroundColor: faceDetected ? theme.successBg : theme.warningBg,
              borderColor: faceDetected ? theme.successText : theme.warningText,
            },
          ]}
        >
          <View style={styles.statusHeader}>
            <Ionicons
              name={faceDetected ? 'shield-checkmark' : 'alert-circle'}
              size={22}
              color={faceDetected ? theme.successText : theme.warningText}
              style={{ marginRight: 8 }}
            />
            <Text
              style={[
                styles.statusTitle,
                { color: faceDetected ? theme.successText : theme.warningText },
              ]}
            >
              {faceDetected ? 'Face Successfully Concealed' : 'Face Detection Inconclusive'}
            </Text>
          </View>
          <Text
            style={[
              styles.statusDescription,
              { color: faceDetected ? theme.successText : theme.warningText },
            ]}
          >
            {faceDetected
              ? 'Our local privacy pipeline has applied a blackout mask over your face. Gemini AI will only evaluate skin undertone, contrast, and style context.'
              : 'Our face detector could not detect a distinct face in this photo, so the image may not be blurred. If you do not want your face sent to Gemini, please tap Retake Photo.'}
          </Text>
        </View>

        {/* Pre-Analysis Insights Pills */}
        {(faceShape !== 'Unknown' || contrastLevel !== 'Unknown') && (
          <View style={[styles.insightsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.insightsHeader, { color: theme.text }]}>Detected Styling Attributes</Text>
            <View style={styles.pillsRow}>
              {faceShape !== 'Unknown' && (
                <View style={[styles.pill, { backgroundColor: theme.bg }]}>
                  <Text style={[styles.pillLabel, { color: theme.subText }]}>Face Shape:</Text>
                  <Text style={[styles.pillValue, { color: theme.text }]}>{faceShape}</Text>
                </View>
              )}
              {contrastLevel !== 'Unknown' && (
                <View style={[styles.pill, { backgroundColor: theme.bg }]}>
                  <Text style={[styles.pillLabel, { color: theme.subText }]}>Contrast:</Text>
                  <Text style={[styles.pillValue, { color: theme.text }]}>{contrastLevel}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: theme.accent }]}
            onPress={handleConfirmAndProceed}
            activeOpacity={0.88}
          >
            <Ionicons name="sparkles" size={20} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Confirm & Analyze Style</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.secondaryButton, { borderColor: theme.accent, backgroundColor: theme.card }]}
            onPress={handleRetakePhoto}
            activeOpacity={0.8}
          >
            <Ionicons name="camera-reverse-outline" size={20} color={theme.accent} style={{ marginRight: 8 }} />
            <Text style={[styles.secondaryButtonText, { color: theme.accent }]}>
              Retake / Choose Another Photo
            </Text>
          </TouchableOpacity>
        </View>

        {/* Informational Privacy Note */}
        <Text style={[styles.privacyNote, { color: theme.subText }]}>
          🔒 Your privacy is our priority. We never send uncensored faces to external AI APIs without your explicit consent.
        </Text>
      </ScrollView>

      {/* Full-Screen Zoom Modal */}
      <Modal visible={isModalOpen} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalCloseBtn}
            onPress={() => setIsModalOpen(false)}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={28} color="#FFF" />
          </TouchableOpacity>

          {censoredImage && (
            <Image
              source={{ uri: censoredImage }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  privacyBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  header: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  imageCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    height: 340,
    marginBottom: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  imageTouchable: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  previewImage: {
    width: '100%',
    height: '100%',
    backgroundColor: '#1E1E1E',
  },
  zoomHint: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  zoomHintText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyImage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBanner: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  statusTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  statusDescription: {
    fontSize: 13,
    lineHeight: 18,
    opacity: 0.9,
  },
  insightsCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginBottom: 20,
  },
  insightsHeader: {
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pillLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 4,
  },
  pillValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  actionContainer: {
    marginTop: 8,
    gap: 12,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 56,
    borderRadius: 16,
    elevation: 3,
    shadowColor: '#632024',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  privacyNote: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 17,
    paddingHorizontal: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseBtn: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalImage: {
    width: width * 0.95,
    height: '80%',
  },
});
