import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Alert, Platform } from 'react-native';

if (Platform.OS === 'web') {
  Alert.alert = (title, message, buttons) => {
    const formattedMsg = message ? `${title}\n\n${message}` : title;
    if (!buttons || buttons.length === 0) {
      window.alert(formattedMsg);
      return;
    }

    if (buttons.length === 1) {
      window.alert(formattedMsg);
      if (buttons[0].onPress) buttons[0].onPress();
      return;
    }

    const positiveBtn = buttons.find(b => b.style !== 'cancel' && b.text?.toLowerCase() !== 'cancel') || buttons[buttons.length - 1];
    const cancelBtn = buttons.find(b => b.style === 'cancel' || b.text?.toLowerCase() === 'cancel');

    const result = window.confirm(formattedMsg);
    if (result) {
      if (positiveBtn && positiveBtn.onPress) positiveBtn.onPress();
    } else {
      if (cancelBtn && cancelBtn.onPress) cancelBtn.onPress();
    }
  };
}

import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AuthScreen from './screens/AuthScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import LandingScreen from './screens/LandingScreen';
import LoadingScreen from './screens/LoadingScreen';
import MainDrawer from './screens/MainDrawer';
import OnboardingScreen from './screens/OnboardingScreen';
import ResultsScreen from './screens/ResultsScreen';

import HistoryDetailScreen from './screens/HistoryDetailScreen';
import PreferencesScreen from './screens/PreferencesScreen';
import UploadScreen from './screens/UploadScreen';
import CensorReviewScreen from './screens/CensorReviewScreen';

// Dedicated Guest Screens
import GuestOnboardingScreen from './screens/GuestOnboardingScreen';
import GuestPreferencesScreen from './screens/GuestPreferencesScreen';
import GuestUploadScreen from './screens/GuestUploadScreen';
import GuestCensorReviewScreen from './screens/GuestCensorReviewScreen';
import GuestLoadingScreen from './screens/GuestLoadingScreen';
import GuestResultsScreen from './screens/GuestResultsScreen';

import { ThemeProvider } from './contexts/ThemeContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Login"
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right", // cleaner transition
            }}
          >
            {/* Landing & Authentication Screens */}
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="SignUp" component={SignUpScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />

            {/* Dedicated Guest Flow (Completely Isolated from Post-Login Screens) */}
            <Stack.Screen name="GuestOnboarding" component={GuestOnboardingScreen} />
            <Stack.Screen name="GuestPreferences" component={GuestPreferencesScreen} />
            <Stack.Screen name="GuestUpload" component={GuestUploadScreen} />
            <Stack.Screen name="GuestCensorReview" component={GuestCensorReviewScreen} />
            <Stack.Screen name="GuestLoading" component={GuestLoadingScreen} />
            <Stack.Screen name="GuestResults" component={GuestResultsScreen} />

            {/* Logged-In Flow (Protected Screens) */}
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            <Stack.Screen name="Preferences" component={PreferencesScreen} />
            <Stack.Screen name="Upload" component={UploadScreen} />
            <Stack.Screen name="CensorReview" component={CensorReviewScreen} />
            <Stack.Screen name="Loading" component={LoadingScreen} />
            <Stack.Screen name="Results" component={ResultsScreen} />
            <Stack.Screen name="HistoryDetail" component={HistoryDetailScreen} />
            <Stack.Screen name="Main" component={MainDrawer} />
          </Stack.Navigator>

          <StatusBar style="dark" />
        </NavigationContainer>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});