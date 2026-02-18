import axios from 'axios';
import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

const LoadingScreen = ({ navigation, route }) => {
  const userPreferences = route?.params?.userPreferences;

  useEffect(() => {
    if (!userPreferences) {
      navigation.replace('Onboarding');
      return;
    }
    const analyzeStyle = async () => {
      try {
        console.log("sending user preferences to backend...", userPreferences);
        const response = await axios.post('http://172.16.25.49:5000/analyze-style', userPreferences);

        console.log("Received response from backend:", response.data);

        navigation.replace('Results', {
          analysisResults: response.data,
          userPreferences,
        });
      } catch (error) {
        console.error('Analysis error:', error);
        // Optional: Alert the user or navigate back
        // Alert.alert("Error", "Failed to analyze style. Please try again.");
        navigation.replace('Onboarding');
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
