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
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

export default function SignUpScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Entrance animations
  const headerAnim = useRef(new Animated.Value(0)).current;
  const formAnim = useRef(new Animated.Value(0)).current;
  const btnAnim = useRef(new Animated.Value(0)).current;
  const footerAnim = useRef(new Animated.Value(0)).current;

  // Background floating shapes
  const blob1Y = useRef(new Animated.Value(0)).current;
  const blob2Y = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.stagger(100, [
      Animated.timing(headerAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.timing(formAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.timing(btnAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.timing(footerAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blob1Y, { toValue: -30, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blob1Y, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blob2Y, { toValue: 30, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blob2Y, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const slideUp = (anim) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [35, 0] }) }],
  });

  const handleSignUp = async () => {
    if (!name || !email || !password) {
      Alert.alert('Required Fields', 'Please fill in your name, email, and password.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/signup`, {
        name: name.trim(),
        email: email.trim(),
        password,
      });

      if (response.data && response.data.success) {
        await AsyncStorage.setItem('userId', response.data.userId);
        // Reset navigation to Main so no back button can return to sign up
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
        Alert.alert('Sign Up Failed', response.data?.error || 'Registration failed');
      }
    } catch (error) {
      console.error('Sign up error:', error);
      const msg = error.response?.data?.error || error.message || 'Unable to register. Please try again.';
      Alert.alert('Registration Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back button to Login */}
      <TouchableOpacity
        onPress={() => navigation.navigate('Login')}
        style={styles.backBtn}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={22} color="#25344F" />
      </TouchableOpacity>

      {/* Floating Background Blobs */}
      <Animated.View style={[styles.blob1, { transform: [{ translateY: blob1Y }] }]} />
      <Animated.View style={[styles.blob2, { transform: [{ translateY: blob2Y }] }]} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          {/* Header */}
          <Animated.View style={[slideUp(headerAnim), styles.headerContainer]}>
            <View style={styles.badgeWrap}>
              <Ionicons name="person-add" size={14} color="#632024" />
              <Text style={styles.badgeText}>NEW ACCOUNT</Text>
            </View>
            <Text style={styles.title}>Join AI Stylist</Text>
            <Text style={styles.subtitle}>Unlock your custom style profile, history, and AI wardrobe</Text>
          </Animated.View>

          {/* Form */}
          <Animated.View style={slideUp(formAnim)}>
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
                placeholder="Password (min 6 characters)"
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
          </Animated.View>

          {/* Button */}
          <Animated.View style={[slideUp(btnAnim), { marginTop: 10 }]}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleSignUp}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.btnContent}>
                  <Text style={styles.buttonText}>Create My Account</Text>
                  <Ionicons name="sparkles" size={18} color="#fff" style={{ marginLeft: 8 }} />
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Links */}
          <Animated.View style={[slideUp(footerAnim), styles.footerLinks]}>
            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              activeOpacity={0.7}
              style={styles.toggleBtn}
            >
              <Text style={styles.toggleText}>
                Already have an account? <Text style={styles.toggleTextBold}>Log In here</Text>
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.orText}>OR</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity
              onPress={() => navigation.navigate('GuestOnboarding')}
              activeOpacity={0.7}
              style={styles.guestBtn}
            >
              <Ionicons name="sparkles-outline" size={18} color="#25344F" style={{ marginRight: 8 }} />
              <Text style={styles.guestText}>Continue as Guest (No Login)</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
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
  keyboardView: {
    flex: 1,
    zIndex: 10,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 28,
    justifyContent: 'center',
  },
  backBtn: {
    position: 'absolute',
    top: 55,
    left: 24,
    zIndex: 30,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  blob1: {
    position: 'absolute',
    top: -height * 0.12,
    left: -width * 0.25,
    width: width * 1.1,
    height: width * 1.1,
    borderRadius: width * 0.55,
    backgroundColor: '#EAD8C5',
    opacity: 0.75,
  },
  blob2: {
    position: 'absolute',
    bottom: -height * 0.15,
    right: -width * 0.35,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: '#632024',
    opacity: 0.15,
  },
  headerContainer: {
    marginBottom: 28,
  },
  badgeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 32, 36, 0.12)',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 10,
    gap: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#632024',
    letterSpacing: 1,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#25344F',
    letterSpacing: -0.8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6F4D38',
    marginTop: 6,
    lineHeight: 20,
    fontWeight: '500',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 16,
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
  button: {
    backgroundColor: '#632024',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#632024',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  btnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.3,
  },
  footerLinks: {
    marginTop: 24,
    alignItems: 'center',
  },
  toggleBtn: {
    paddingVertical: 8,
  },
  toggleText: {
    color: '#25344F',
    fontSize: 14,
  },
  toggleTextBold: {
    fontWeight: '800',
    color: '#632024',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 14,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(37, 52, 79, 0.15)',
  },
  orText: {
    marginHorizontal: 12,
    fontSize: 12,
    fontWeight: '700',
    color: '#6F4D38',
    opacity: 0.7,
  },
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.65)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(37, 52, 79, 0.15)',
    width: '100%',
  },
  guestText: {
    color: '#25344F',
    fontSize: 14,
    fontWeight: '700',
  },
});
