import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet } from 'react-native';
import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import AuthScreen from './screens/AuthScreen';
import LandingScreen from './screens/LandingScreen';
import LoadingScreen from './screens/LoadingScreen';
import MainDrawer from './screens/MainDrawer';
import OnboardingScreen from './screens/OnboardingScreen';
import ResultsScreen from './screens/ResultsScreen';

// ✅ ADD THESE IMPORTS
import PreferencesScreen from './screens/PreferencesScreen';
import UploadScreen from './screens/UploadScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={styles.container}>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Auth"
          screenOptions={{
            headerShown: false,
            animation: "slide_from_right", // cleaner transition
          }}
        >
          <Stack.Screen name="Auth" component={AuthScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />

          {/* NEW SCREENS */}
          <Stack.Screen name="Preferences" component={PreferencesScreen} />
          <Stack.Screen name="Upload" component={UploadScreen} />

          <Stack.Screen name="Loading" component={LoadingScreen} />
          <Stack.Screen name="Results" component={ResultsScreen} />
          <Stack.Screen name="Main" component={MainDrawer} />
        </Stack.Navigator>

        <StatusBar style="dark" />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});