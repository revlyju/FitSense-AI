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
import LandingScreen from './screens/LandingScreen';
import LoadingScreen from './screens/LoadingScreen';
import MainDrawer from './screens/MainDrawer';
import OnboardingScreen from './screens/OnboardingScreen';
import ResultsScreen from './screens/ResultsScreen';

import HistoryDetailScreen from './screens/HistoryDetailScreen';
import PreferencesScreen from './screens/PreferencesScreen';
import UploadScreen from './screens/UploadScreen';

import { ThemeProvider } from './contexts/ThemeContext';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <ThemeProvider>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Landing"
            screenOptions={{
              headerShown: false,
              animation: "slide_from_right", // cleaner transition
            }}
          >
            <Stack.Screen name="Landing" component={LandingScreen} />
            <Stack.Screen name="Auth" component={AuthScreen} />
            <Stack.Screen name="Onboarding" component={OnboardingScreen} />


            <Stack.Screen name="Preferences" component={PreferencesScreen} />
            <Stack.Screen name="Upload" component={UploadScreen} />

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