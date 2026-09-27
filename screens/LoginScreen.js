import React, { useState, useEffect, useRef } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
  ActivityIndicator,
  Animated,
  Dimensions,
  Easing,
  StatusBar,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function LoginScreen({ navigation, route }) {
  const initialMode = route?.params?.mode === 'signup' ? 'signup' : 'login';
  const [authMode, setAuthMode] = useState(initialMode); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Entrance animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const formOpacity = useRef(new Animated.Value(1)).current;

  // Background floating shapes
  const blob1Y = useRef(new Animated.Value(0)).current;
  const blob2Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }),
    ]).start();

    // Subtle background animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob1Y, { toValue: -25, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blob1Y, { toValue: 0, duration: 4500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blob2Y, { toValue: 25, duration: 5500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blob2Y, { toValue: 0, duration: 5500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const switchMode = (mode) => {
    if (mode === authMode) return;
    Animated.sequence([
      Animated.timing(formOpacity, { toValue: 0.3, duration: 120, useNativeDriver: true }),
      Animated.timing(formOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setAuthMode(mode);
  };

  const handleAuthSubmit = async () => {
    if (authMode === 'signup') {
      if (!name.trim() || !email.trim() || !password) {
        Alert.alert('Required Fields', 'Please fill in your name, email, and password.');
        return;
      }
      if (password.length < 6) {
        Alert.alert('Weak Password', 'Password must be at least 6 characters.');
        return;
      }
    } else {
      if (!email.trim() || !password) {
        Alert.alert('Required Fields', 'Please enter your email and password.');
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = authMode === 'signup' ? '/signup' : '/login';
      const payload = authMode === 'signup'
        ? { name: name.trim(), email: email.trim(), password }
        : { email: email.trim(), password };

      const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload);

      if (response.data && response.data.success) {
        await AsyncStorage.setItem('userId', response.data.userId);

        // Reset navigation to Main so no back button can return to login
        navigation.reset({
          index: 0,
          routes: [
            {
              name: 'Main',
              params: {
                screen: 'DashboardRoot',
                params: { userId: response.data.userId },
              },
            },
          ],
        });
      } else {
        Alert.alert('Authentication Failed', response.data?.error || 'Something went wrong.');
      }
    } catch (error) {
      console.error('Auth error:', error);
      const msg = error.response?.data?.error || error.message || 'Unable to authenticate. Please check your credentials.';
      Alert.alert('Authentication Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Floating Background Blobs */}
      <Animated.View style={[styles.blob1, { transform: [{ translateY: blob1Y }] }]} />
      <Animated.View style={[styles.blob2, { transform: [{ translateY: blob2Y }] }]} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={[{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            {/* Brand Logo & Title */}
            <View style={styles.brandContainer}>
              <View style={styles.logoCircle}>
                <Ionicons name="sparkles" size={28} color="#fff" />
              </View>
              <Text style={styles.superTitle}>YOUR PERSONAL FASHION AI</Text>
              <Text style={styles.brandTitle}>AI Stylist</Text>
              <Text style={styles.tagline}>
                Discover your color season, outfits & wardrobe insights
              </Text>
            </View>

            {/* Segmented Tab Switcher: Log In / Sign Up */}
            <View style={styles.segmentedTabContainer}>
              <TouchableOpacity
                style={[styles.segmentBtn, authMode === 'login' && styles.segmentBtnActive]}
                onPress={() => switchMode('login')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, authMode === 'login' && styles.segmentTextActive]}>
                  Log In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.segmentBtn, authMode === 'signup' && styles.segmentBtnActive]}
                onPress={() => switchMode('signup')}
                activeOpacity={0.8}
              >
                <Text style={[styles.segmentText, authMode === 'signup' && styles.segmentTextActive]}>
                  Sign Up
                </Text>
              </TouchableOpacity>
            </View>

            {/* Dynamic Form Area */}
            <Animated.View style={{ opacity: formOpacity }}>
              {authMode === 'signup' && (
                <View style={styles.inputWrapper}>
                  <Ionicons name="person-outline" size={20} color="rgba(37, 52, 79, 0.5)" style={styles.inputIcon} />
                  <TextInput
                    placeholder="Full Name"
                    placeholderTextColor="rgba(37, 52, 79, 0.4)"
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                  />
                </View>
              )}

              <View style={styles.inputWrapper}>
                <Ionicons name="mail-outline" size={20} color="rgba(37, 52, 79, 0.5)" style={styles.inputIcon} />
                <TextInput
                  placeholder="Email Address"
                  placeholderTextColor="rgba(37, 52, 79, 0.4)"
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                />
              </View>

              <View style={styles.inputWrapper}>
                <Ionicons name="lock-closed-outline" size={20} color="rgba(37, 52, 79, 0.5)" style={styles.inputIcon} />
                <TextInput
                  placeholder={authMode === 'signup' ? 'Password (min 6 characters)' : 'Password'}
                  placeholderTextColor="rgba(37, 52, 79, 0.4)"
                  style={[styles.input, { paddingRight: 45 }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                    size={20}
                    color="rgba(37, 52, 79, 0.6)"
                  />
                </TouchableOpacity>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleAuthSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <View style={styles.btnContent}>
                    <Text style={styles.primaryButtonText}>
                      {authMode === 'signup' ? 'Create My Account' : 'Log In to Dashboard'}
                    </Text>
                    <Ionicons
                      name={authMode === 'signup' ? 'sparkles' : 'arrow-forward'}
                      size={18}
                      color="#fff"
                      style={{ marginLeft: 8 }}
                    />
                  </View>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.line} />
            </View>

            {/* Guest Action: Completely Functional, No Account Needed */}
            <TouchableOpacity
              onPress={() => navigation.navigate('GuestOnboarding')}
              activeOpacity={0.75}
              style={styles.guestButton}
            >
              <Ionicons name="eye-outline" size={18} color="#6F4D38" style={{ marginRight: 8 }} />
              <Text style={styles.guestButtonText}>Explore as Guest (No Login)</Text>
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              Protected by End-to-End Encryption · Free to Explore
            </Text>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D5B893',
    overflow: 'hidden',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
    zIndex: 10,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 26,
    paddingTop: 50,
    paddingBottom: 40,
  },
  blob1: {
    position: 'absolute',
    top: -height * 0.12,
    left: -width * 0.3,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: '#EAD8C5',
    opacity: 0.75,
  },
  blob2: {
    position: 'absolute',
    bottom: -height * 0.16,
    right: -width * 0.35,
    width: width * 1.3,
    height: width * 1.3,
    borderRadius: width * 0.65,
    backgroundColor: '#632024',
    opacity: 0.15,
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: 26,
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#632024',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#632024',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
    marginBottom: 12,
  },
  superTitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6F4D38',
    letterSpacing: 2,
    marginBottom: 4,
  },
  brandTitle: {
    fontSize: 34,
    fontWeight: '800',
    color: '#25344F',
    letterSpacing: -0.8,
  },
  tagline: {
    fontSize: 13,
    color: '#6F4D38',
    marginTop: 4,
    textAlign: 'center',
    lineHeight: 18,
    fontWeight: '500',
  },
  segmentedTabContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(37, 52, 79, 0.1)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  segmentBtnActive: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6F4D38',
  },
  segmentTextActive: {
    color: '#25344F',
    fontWeight: '800',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 15,
    paddingRight: 16,
    fontSize: 15,
    color: '#25344F',
    fontWeight: '600',
  },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    padding: 6,
  },
  primaryButton: {
    backgroundColor: '#632024',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#632024',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 7,
    marginTop: 6,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 18,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(37, 52, 79, 0.15)',
  },
  orText: {
    marginHorizontal: 12,
    fontSize: 11,
    fontWeight: '800',
    color: '#6F4D38',
    opacity: 0.7,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(234, 216, 197, 0.7)',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(111, 77, 56, 0.3)',
  },
  guestButtonText: {
    color: '#6F4D38',
    fontSize: 14,
    fontWeight: '700',
  },
  footerNote: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 11,
    color: 'rgba(111, 77, 56, 0.65)',
    fontWeight: '500',
  },
});
