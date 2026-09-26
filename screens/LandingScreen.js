import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const LandingScreen = ({ navigation }) => {
  const fadeIn    = useRef(new Animated.Value(0)).current;
  const slideUp   = useRef(new Animated.Value(60)).current;
  const btn1Scale = useRef(new Animated.Value(0.85)).current;
  const btn2Scale = useRef(new Animated.Value(0.85)).current;
  const blob1Anim = useRef(new Animated.Value(0)).current;
  const blob2Anim = useRef(new Animated.Value(0)).current;
  const logoAnim  = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.7)).current;

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const storedUserId = await AsyncStorage.getItem('userId');
        if (storedUserId) {
          navigation.replace('Main', { screen: 'DashboardRoot', params: { userId: storedUserId } });
          return;
        }
      } catch (err) {
        console.error('Auto-login check failed:', err);
      }

      // If not logged in, animate the landing page items
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }),
        Animated.timing(logoAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start();

      Animated.stagger(120, [
        Animated.parallel([
          Animated.timing(fadeIn, { toValue: 1, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }),
          Animated.timing(slideUp, { toValue: 0, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }),
        ]),
        Animated.spring(btn1Scale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
        Animated.spring(btn2Scale, { toValue: 1, friction: 6, tension: 100, useNativeDriver: true }),
      ]).start();

      Animated.loop(
        Animated.sequence([
          Animated.timing(blob1Anim, { toValue: 1, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(blob1Anim, { toValue: 0, duration: 6000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
      Animated.loop(
        Animated.sequence([
          Animated.timing(blob2Anim, { toValue: 1, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
          Animated.timing(blob2Anim, { toValue: 0, duration: 8000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        ])
      ).start();
    };

    checkLogin();
  }, []);

  const blob1Y = blob1Anim.interpolate({ inputRange: [0, 1], outputRange: [0, -35] });
  const blob2Y = blob2Anim.interpolate({ inputRange: [0, 1], outputRange: [0, 30] });

  return (
    <View style={styles.container}>
      {/* Animated background blobs */}
      <Animated.View style={[styles.blob1, { transform: [{ translateY: blob1Y }] }]} />
      <Animated.View style={[styles.blob2, { transform: [{ translateY: blob2Y }] }]} />
      <View style={styles.blob3} />

      {/* Logo */}
      <Animated.View style={[styles.logoContainer, { opacity: logoAnim, transform: [{ scale: logoScale }] }]}>
        <View style={styles.logoCircle}>
          <Ionicons name="sparkles" size={32} color="#fff" />
        </View>
        <View style={styles.logoTextWrap}>
          <Text style={styles.logoSuper}>YOUR PERSONAL</Text>
          <Text style={styles.logoTitle}>AI Stylist</Text>
        </View>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={[styles.taglineWrap, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <View style={styles.dividerLine} />
        <Text style={styles.tagline}>
          Discover your perfect colors, outfits {'\n'}& personal style — powered by AI.
        </Text>

        {/* Feature pills */}
        <View style={styles.pillRow}>
          {['Color Analysis', 'Outfit Match', 'AI Chatbot'].map((pill) => (
            <View key={pill} style={styles.pill}>
              <Text style={styles.pillText}>{pill}</Text>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* Buttons */}
      <View style={styles.buttonContainer}>
        <Animated.View style={{ transform: [{ scale: btn1Scale }] }}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Auth')}
            activeOpacity={0.85}
          >
            <Ionicons name="person-outline" size={20} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.primaryButtonText}>Login / Sign Up</Text>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: btn2Scale }] }}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Onboarding', { userId: null, isGuest: true })}
            activeOpacity={0.8}
          >
            <Ionicons name="eye-outline" size={18} color="#6F4D38" style={{ marginRight: 6 }} />
            <Text style={styles.secondaryButtonText}>Explore Without Account</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>

      <Text style={styles.footer}>No credit card required · Free to use</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D5B893',
    overflow: 'hidden',
    paddingHorizontal: 28,
    justifyContent: 'center',
  },

  // Blobs
  blob1: {
    position: 'absolute',
    top: -height * 0.18,
    left: -width * 0.35,
    width: width * 1.3,
    height: width * 1.3,
    borderRadius: width * 0.65,
    backgroundColor: '#EAD8C5',
    opacity: 0.75,
  },
  blob2: {
    position: 'absolute',
    bottom: -height * 0.22,
    right: -width * 0.4,
    width: width * 1.4,
    height: width * 1.4,
    borderRadius: width * 0.7,
    backgroundColor: '#632024',
    opacity: 0.15,
  },
  blob3: {
    position: 'absolute',
    top: height * 0.38,
    right: -width * 0.25,
    width: width * 0.7,
    height: width * 0.7,
    borderRadius: width * 0.35,
    backgroundColor: '#25344F',
    opacity: 0.07,
  },

  // Logo
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 36,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#632024',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#632024',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 18,
    elevation: 10,
    marginRight: 16,
  },
  logoTextWrap: { flexDirection: 'column' },
  logoSuper: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: '#6F4D38',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  logoTitle: {
    fontSize: 36,
    fontWeight: '800',
    color: '#25344F',
    letterSpacing: -1,
  },

  // Tagline
  taglineWrap: { marginBottom: 48 },
  dividerLine: {
    width: 48,
    height: 4,
    backgroundColor: '#632024',
    borderRadius: 2,
    marginBottom: 18,
  },
  tagline: {
    fontSize: 17,
    color: '#6F4D38',
    lineHeight: 26,
    fontWeight: '500',
    marginBottom: 22,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  pill: {
    backgroundColor: 'rgba(37,52,79,0.10)',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(37,52,79,0.15)',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#25344F',
    letterSpacing: 0.3,
  },

  // Buttons
  buttonContainer: { gap: 14 },
  primaryButton: {
    backgroundColor: '#632024',
    paddingVertical: 18,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#632024',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 16,
    elevation: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  secondaryButton: {
    borderWidth: 1.5,
    borderColor: 'rgba(111,77,56,0.4)',
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(234,216,197,0.5)',
  },
  secondaryButtonText: {
    color: '#6F4D38',
    fontSize: 15,
    fontWeight: '600',
  },

  // Footer
  footer: {
    textAlign: 'center',
    marginTop: 28,
    fontSize: 12,
    color: 'rgba(111,77,56,0.6)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
});

export default LandingScreen;
