import { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width, height } = Dimensions.get('window');

const AuthScreen = ({ navigation }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // Staggered Entrance Animations for UI Elements
  const headerAnim = useRef(new Animated.Value(0)).current;
  const form1Anim = useRef(new Animated.Value(0)).current;
  const form2Anim = useRef(new Animated.Value(0)).current;
  const buttonAnim = useRef(new Animated.Value(0)).current;
  const toggleAnim = useRef(new Animated.Value(0)).current;

  // Background Abstract Blob Animations
  const blob1Y = useRef(new Animated.Value(0)).current;
  const blob2Y = useRef(new Animated.Value(0)).current;
  const blobScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Entrance Staggering
    Animated.stagger(120, [
      Animated.timing(headerAnim, { toValue: 1, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.timing(form1Anim, { toValue: 1, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.timing(form2Anim, { toValue: 1, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.timing(buttonAnim, { toValue: 1, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.timing(toggleAnim, { toValue: 1, duration: 800, easing: Easing.out(Easing.exp), useNativeDriver: true }),
    ]).start();

    // 2. Slow Continuous Background Loops
    Animated.loop(
      Animated.sequence([
        Animated.timing(blob1Y, { toValue: -40, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blob1Y, { toValue: 0, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blob2Y, { toValue: 40, duration: 5500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blob2Y, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(blobScale, { toValue: 1.15, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(blobScale, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Helper generator to slide up and fade in simultaneously
  const slideUp = (anim) => ({
    opacity: anim,
    transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [40, 0] }) }]
  });

  const handleAuth = async () => {
    if (!email || !password || (isSignUp && !name)) {
      Alert.alert('Error', 'Please fill in all blanks');
      return;
    }
    setLoading(true);
    try {
      const endpoint = isSignUp ? '/signup' : '/login';
      const payload = isSignUp ? { name, email, password } : { email, password };

      const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload);

      if (response.data.success) {
        await AsyncStorage.setItem('userId', response.data.userId);
        navigation.navigate('Main', { screen: 'DashboardRoot', params: { userId: response.data.userId } });
      }
    } catch (error) {
      console.error('Auth error:', error);
      Alert.alert('Authentication Failed', error.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      
      {/* Back Button */}
      <TouchableOpacity 
        onPress={() => navigation.navigate('Landing')} 
        style={{ 
          position: 'absolute', 
          top: 60, 
          left: 20, 
          zIndex: 20,
          width: 42,
          height: 42,
          borderRadius: 21,
          backgroundColor: 'rgba(255,255,255,0.25)',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1,
          borderColor: 'rgba(255,255,255,0.1)'
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={24} color="#25344F" />
      </TouchableOpacity>
      
      {/* Background Blobs (Abstract floating shapes) */}
      <Animated.View style={[styles.blob1, { transform: [{ translateY: blob1Y }, { scale: blobScale }] }]} />
      <Animated.View style={[styles.blob2, { transform: [{ translateY: blob2Y }, { scale: blobScale }] }]} />
      <Animated.View style={styles.blob3} />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.inner}>
          
          {/* Header */}
          <Animated.View style={[slideUp(headerAnim), styles.headerContainer]}>
            <Text style={styles.superTitle}>WELCOME TO</Text>
            <Text style={styles.title}>AI Stylist</Text>
            <View style={styles.fancyDivider} />
            <Text style={styles.subtitle}>
              {isSignUp ? 'Create your premium account' : 'Log in to your account'}
            </Text>
          </Animated.View>

          {/* Form */}
          {isSignUp && (
            <Animated.View style={[slideUp(form1Anim), styles.inputWrapper]}>
               <Ionicons name="person-outline" size={20} color="rgba(37, 52, 79, 0.5)" style={styles.inputIcon} />
               <TextInput 
                  placeholder="Full Name" 
                  placeholderTextColor="rgba(37, 52, 79, 0.4)" 
                  style={styles.input} 
                  value={name} 
                  onChangeText={setName} 
               />
            </Animated.View>
          )}

          <Animated.View style={[slideUp(form1Anim), styles.inputWrapper]}>
            <Ionicons name="mail-outline" size={20} color="rgba(37, 52, 79, 0.5)" style={styles.inputIcon} />
            <TextInput 
                placeholder="Email Address" 
                placeholderTextColor="rgba(37, 52, 79, 0.4)" 
                style={styles.input} 
                value={email} 
                onChangeText={setEmail} 
                autoCapitalize="none" 
                keyboardType="email-address" 
            />
          </Animated.View>

          <Animated.View style={[slideUp(form2Anim), styles.inputWrapper]}>
            <Ionicons name="lock-closed-outline" size={20} color="rgba(37, 52, 79, 0.5)" style={styles.inputIcon} />
            <TextInput 
                placeholder="Password" 
                placeholderTextColor="rgba(37, 52, 79, 0.4)" 
                style={[styles.input, { paddingRight: 45 }]} 
                value={password} 
                onChangeText={setPassword} 
                secureTextEntry={!showPassword} 
            />
            <TouchableOpacity 
              style={{ position: 'absolute', right: 16, padding: 4 }} 
              onPress={() => setShowPassword(!showPassword)}
              activeOpacity={0.7}
            >
              <Ionicons 
                name={showPassword ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color="rgba(37, 52, 79, 0.6)" 
              />
            </TouchableOpacity>
          </Animated.View>

          {/* Button */}
          <Animated.View style={[slideUp(buttonAnim), { marginTop: 15 }]}>
            <TouchableOpacity style={styles.button} onPress={handleAuth} disabled={loading} activeOpacity={0.8}>
              {loading ? (
                 <ActivityIndicator color="#fff" />
              ) : (
                 <Text style={styles.buttonText}>{isSignUp ? 'Join AI Stylist' : 'Proceed to Dashboard'}</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          {/* Footer Toggles */}
          <Animated.View style={[slideUp(toggleAnim), styles.footerLinks]}>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)} activeOpacity={0.6} style={styles.toggleBtn}>
              <Text style={styles.toggleText}>
                {isSignUp ? "Already a member? " : "New to AI Stylist? "}
                <Text style={styles.toggleTextBold}>{isSignUp ? "Log In here" : "Create Account"}</Text>
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity onPress={() => navigation.navigate('Onboarding')} activeOpacity={0.6} style={styles.guestBtn}>
              <Text style={styles.guestText}>Or continue as Guest</Text>
            </TouchableOpacity>
          </Animated.View>

        </View>
      </KeyboardAvoidingView>
    </View>
  );
};

export default AuthScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D5B893', // Warm tan background
    overflow: 'hidden', // Contain the massive blobs
  },
  keyboardView: {
    flex: 1,
    zIndex: 10,
  },
  inner: {
    flex: 1,
    paddingHorizontal: 32,
    justifyContent: 'center',
  },

  // --- Background Design ---
  blob1: {
    position: 'absolute',
    top: -height * 0.15,
    left: -width * 0.3,
    width: width * 1.2,
    height: width * 1.2,
    borderRadius: width * 0.6,
    backgroundColor: '#EAD8C5',
    opacity: 0.7,
    zIndex: 0,
  },
  blob2: {
    position: 'absolute',
    bottom: -height * 0.2,
    right: -width * 0.4,
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: width * 0.7,
    backgroundColor: '#632024',
    opacity: 0.18,
    zIndex: 0,
  },
  blob3: {
    position: 'absolute',
    top: height * 0.4,
    right: -width * 0.2,
    width: width * 0.8,
    height: width * 0.8,
    borderRadius: width * 0.4,
    backgroundColor: '#25344F',
    opacity: 0.08,
    zIndex: 0,
  },

  // --- Header ---
  headerContainer: {
    alignItems: 'flex-start',
    marginBottom: 40,
    marginTop: 20,
  },
  superTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 2,
    color: '#6F4D38',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: 42,
    fontWeight: '800',
    color: '#25344F',
    letterSpacing: -1,
  },
  fancyDivider: {
    width: 50,
    height: 4,
    backgroundColor: '#632024',
    borderRadius: 2,
    marginTop: 18,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 15,
    color: '#6F4D38',
    fontWeight: '500',
  },

  // --- Form Elements ---
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff', // Pure white for high modern contrast
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inputIcon: {
    marginLeft: 18,
    marginRight: 8,
  },
  input: {
    flex: 1,
    paddingVertical: 18,
    paddingRight: 18,
    fontSize: 15,
    color: '#25344F',
    fontWeight: '600',
  },

  // --- Buttons ---
  button: {
    backgroundColor: '#632024',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#632024', // Reddish shadow
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
    letterSpacing: 0.5,
  },

  // --- Footer ---
  footerLinks: {
    marginTop: 35,
    alignItems: 'center',
  },
  toggleBtn: {
    paddingVertical: 10,
  },
  toggleText: {
    color: '#25344F',
    fontSize: 14,
  },
  toggleTextBold: {
    fontWeight: '800',
    color: '#632024',
  },
  guestBtn: {
    marginTop: 15,
    paddingVertical: 10,
  },
  guestText: {
    color: 'rgba(37, 52, 79, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
});