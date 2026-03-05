import axios from 'axios';
import { useEffect } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, View } from 'react-native';

// API endpoint - change this to your backend URL
// For local development, use: 'http://localhost:5000/analyze-style'
// For same network device, use your computer's IP: 'http://YOUR_IP:5000/analyze-style'
const API_BASE_URL = 'http://10.225.140.228:5000'; // Production - use your server IP

const LoadingScreen = ({ navigation, route }) => {
  const userPreferences = route?.params?.userPreferences;

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
        const payload = {
          gender: userPreferences.gender,
          skinTone: userPreferences.skinTone,
          stylePreference: userPreferences.stylePreference,
          occasion: userPreferences.occasion,
          bodyType: userPreferences.bodyType,
          contrastLevel: userPreferences.contrastLevel,
          undertone: userPreferences.undertone,
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

        navigation.replace('Results', {
          analysisResults: response.data,
          userPreferences,
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
