import React, { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View, StatusBar } from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

export default function GuestLoadingScreen({ navigation, route }) {
  const userPreferences = route?.params?.userPreferences;

  const isNight = userPreferences?.timeOfDay === 'Night';

  const theme = {
    bg: isNight ? '#25344F' : '#D5B893',
    text: isNight ? '#D5B893' : '#25344F',
    subText: isNight ? '#cbb89a' : '#6F4D38',
  };

  useEffect(() => {
    if (!userPreferences || !userPreferences.image) {
      navigation.replace('GuestOnboarding');
      return;
    }

    const analyzeGuestStyle = async () => {
      try {
        const rawGender = (userPreferences.gender || '').toString().toLowerCase();
        let userGender = '';
        if (rawGender.includes('female') || rawGender === 'woman' || rawGender === 'women') {
          userGender = 'women';
        } else if (rawGender.includes('male') || rawGender === 'man' || rawGender === 'men') {
          userGender = 'men';
        }

        let customGeminiKey = null;
        try {
          customGeminiKey = await AsyncStorage.getItem('geminiApiKey');
        } catch (e) {
          console.error("Failed to read geminiApiKey in guest mode", e);
        }

        const payload = {
          gender: userPreferences.gender,
          userGender,
          occasion: userPreferences.occasion,
          seasonOrWeather: userPreferences.seasonOrWeather,
          locationClimate: userPreferences.locationClimate,
          timeOfDay: userPreferences.timeOfDay,
          activityLevel: userPreferences.activityLevel,
          stylePreference: userPreferences.stylePreference,
          colorPreference: userPreferences.colorPreference,
          fitPreference: userPreferences.fitPreference,
          image: userPreferences.image,
          userId: null, // Explicitly null for guest
          isGuest: true,
          geminiApiKey: customGeminiKey || undefined,
          isPreprocessed: userPreferences.isPreprocessed || false,
          faceShape: userPreferences.faceShape,
          contrastLevel: userPreferences.contrastLevel,
        };

        const response = await axios.post(`${API_BASE_URL}/analyze-style`, payload, {
          timeout: 60000,
          headers: { 'Content-Type': 'application/json' },
        });

        if (response.data && response.data.error) {
          throw new Error(response.data.error);
        }

        // Navigate directly to dedicated GuestResults screen
        navigation.replace('GuestResults', {
          analysisResults: response.data,
          userPreferences,
        });
      } catch (error) {
        console.error('Guest analysis error:', error);
        let errorMessage = 'Failed to analyze style. Please try again.';
        if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR') {
          errorMessage = 'Cannot connect to backend server. Please check connection.';
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        Alert.alert(
          'Analysis Error',
          errorMessage,
          [
            { text: 'Try Again', onPress: () => navigation.replace('GuestOnboarding') },
            { text: 'OK', onPress: () => navigation.replace('GuestOnboarding') },
          ]
        );
      }
    };

    analyzeGuestStyle();
  }, [navigation, userPreferences]);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isNight ? 'light-content' : 'dark-content'} />
      <ActivityIndicator size="large" color={theme.text} />
      <Text style={[styles.text, { color: theme.text }]}>Analyzing your style...</Text>
      <Text style={[styles.subtext, { color: theme.subText }]}>
        Detecting color season, undertone, and personalized outfits
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  text: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 22,
    textAlign: 'center',
  },
  subtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});
