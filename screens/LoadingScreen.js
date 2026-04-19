import axios from 'axios';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const LoadingScreen = ({ navigation, route }) => {
  const routeUserPreferences = route?.params?.userPreferences || {};
  const routeImage = route?.params?.image;
  const userPreferences = {
    ...routeUserPreferences,
    image: routeUserPreferences.image || routeImage,
  };
  // Explicit guest flag passed through the flow
  const isGuest = route?.params?.isGuest || false;
  const routeUserId = route?.params?.userId;

  const isNight = userPreferences.timeOfDay === "Night";

  const theme = {
    bg: isNight ? "#25344F" : "#D5B893",
    text: isNight ? "#D5B893" : "#25344F",
    subText: isNight ? "#cbb89a" : "#6F4D38",
  };

  useEffect(() => {
    if (!userPreferences || !userPreferences.image) {
      navigation.replace('Onboarding');
      return;
    }
    const analyzeStyle = async () => {
      try {
        console.log("Sending user preferences to backend...");
        console.log("API URL:", `${API_BASE_URL}/analyze-style`);
        console.log("Image present:", !!userPreferences.image);
        console.log("Image length:", userPreferences.image?.length || 0);

        // Prepare the request payload
        const rawGender = (userPreferences.gender || '').toString().toLowerCase();
        let userGender = '';
        if (rawGender.includes('female') || rawGender === 'woman' || rawGender === 'women') {
          userGender = 'women';
        } else if (rawGender.includes('male') || rawGender === 'man' || rawGender === 'men') {
          userGender = 'men';
        }
        let activeUserId = routeUserId ?? null;
        // Only fallback to AsyncStorage if NOT an explicit guest and userId is missing
        if (!isGuest && routeUserId === undefined) {
          try {
            activeUserId = await AsyncStorage.getItem('userId');
          } catch (e) {
            console.error("Failed to fetch AsyncStorage userId", e);
          }
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
          image: userPreferences.image, // base64 string
          userId: activeUserId, // Explicitly pass resolved ID
        };

        const response = await axios.post(`${API_BASE_URL}/analyze-style`, payload, {
          timeout: 60000, // 60 second timeout for image processing
          headers: {
            'Content-Type': 'application/json',
          },
        });

        console.log("Received response from backend:", response.data);

        if (response.data.error) {
          throw new Error(response.data.error);
        }

        try {
          await AsyncStorage.setItem('@latest_analysis', JSON.stringify(response.data));
        } catch (e) {
          console.error("Failed to auto-save analysis locally", e);
        }

        if (activeUserId && !isGuest) {
          try {
            await axios.post(`${API_BASE_URL}/style-profile`, {
              userId: activeUserId,
              skinTone: response.data.skinTone,
              undertone: response.data.undertone,
              bodyShape: response.data.bodyShape,
              contrastLevel: response.data.contrastLevel,
              season: response.data.colorSeason,
              bestColors: response.data.bestNeutrals,
              avoidColors: response.data.avoidColors,
              metalPreference: response.data.jewelry?.recommended,
              necklines: response.data.necklines,
            });
          } catch (e) {
            console.error('Failed to save style profile', e?.response?.data || e.message);
          }
 
          navigation.replace('Main', {
            screen: 'DashboardRoot',
            params: { userId: activeUserId }
          });
        } else {
          navigation.replace("Results", {
            analysisResults: response.data,
            userPreferences,
            isGuest: true, // explicitly tell ResultsScreen it's a guest
          });
        }
      } catch (error) {
        console.error('Analysis error:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);

        let errorMessage = "Failed to analyze style. Please try again.";
        if (error.code === 'ECONNREFUSED' || error.code === 'NETWORK_ERROR') {
          errorMessage = "Cannot connect to server. Please check:\n1. Backend server is running\n2. Correct IP address/port\n3. Same network connection";
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }

        Alert.alert(
          "Analysis Error",
          errorMessage,
          [
            { text: "Try Again", onPress: () => navigation.replace('Onboarding') },
            { text: "OK", onPress: () => navigation.replace('Onboarding') }
          ]
        );
      }
    };

    analyzeStyle();
  }, [navigation, userPreferences]);

  if (!userPreferences) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ActivityIndicator size="large" color={theme.text} />
      <Text style={[styles.text, { color: theme.text }]}>Analyzing your style...</Text>
      <Text style={[styles.subtext, { color: theme.subText }]}>This may take a moment</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D5B893', // FIXED
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: '#25344F',
    marginTop: 20,
  },
  subtext: {
    fontSize: 14,
    color: '#6F4D38',
    marginTop: 8,
  },
});

export default LoadingScreen;
