import axios from 'axios';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';
import { API_BASE_URL } from '../config';

const LoadingScreen = ({ navigation, route }) => {
  const userPreferences = route?.params?.userPreferences;
  const userId = route?.params?.userId ?? null;

  useEffect(() => {
    if (!userPreferences) {
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
        const userGender = rawGender.includes('female') ? 'women' : 'men';
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

        if (userId) {
          try {
            await axios.post(`${API_BASE_URL}/style-profile`, {
              userId,
              skinTone: response.data.skinTone,
              undertone: response.data.undertone,
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
        }

        navigation.replace('Results', {
          analysisResults: response.data,
          userPreferences,
          userId,
        });
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
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#1a1a1a" />
      <Text style={styles.text}>Analyzing your style...</Text>
      <Text style={styles.subtext}>This may take a moment</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
  },
  text: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 20,
  },
  subtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

export default LoadingScreen;
