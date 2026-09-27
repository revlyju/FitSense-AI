import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert,
  Animated,
  Easing,
  FlatList,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ColorCard from '../components/ColorCard';
import DbOutfitCard from '../components/DbOutfitCard';
import OutfitCard from '../components/OutfitCard';

function normalizeColorList(list) {
  if (!Array.isArray(list)) return [];

  return list
    .map((item) => {
      if (!item) return null;

      if (typeof item === 'string') {
        let textMatch = item;
        if (!textMatch.startsWith('#') && /^[0-9a-fA-F]{3,8}$/.test(textMatch.split(' ')[0])) {
          textMatch = '#' + textMatch;
        }
        const hexMatch = textMatch.match(/#[0-9a-fA-F]{3,8}\b/i) || textMatch.match(/#[0-9a-fA-F]{3,8}/i);
        const hex = hexMatch ? hexMatch[0] : undefined;
        let nameText = hexMatch ? item.replace(hexMatch[0].replace('#', ''), '').replace(hexMatch[0], '').trim() : item.trim();
        nameText = nameText.replace(/\(\s*\)/g, '').replace(/#$/, '').trim() || hex || item;

        return {
          name: nameText,
          hex: hex || (item.startsWith('#') ? item : '#cccccc'),
          reason: '',
        };
      }

      if (typeof item === 'object') {
        let rawHex = item.hex || item.color || item.value || '';
        if (typeof rawHex === 'string' && !rawHex.startsWith('#') && /^[0-9a-fA-F]{3,8}$/.test(rawHex)) {
          rawHex = '#' + rawHex;
        }
        
        const hexMatch = typeof rawHex === 'string' ? (rawHex.match(/#[0-9a-fA-F]{3,8}\b/i) || rawHex.match(/#[0-9a-fA-F]{3,8}/i)) : null;
        const hex = hexMatch ? hexMatch[0] : (typeof rawHex === 'string' && rawHex.startsWith('#') ? rawHex : '#cccccc');

        let nameText = item.name || item.label || item.color || hex || 'Color';
        if (typeof nameText === 'string' && hex) {
          nameText = nameText.replace(hex, '').replace(hex.replace('#',''), '').replace(/\(\s*\)/g, '').trim() || nameText;
        }

        return {
          name: nameText,
          hex: hex,
          reason: item.reason || '',
        };
      }

      return null;
    })
    .filter(Boolean);
}

const ResultsScreen = ({ navigation, route }) => {
  const analysisResults = route?.params?.analysisResults;
  const userPreferences = route?.params?.userPreferences;
  const isGuestParam = route?.params?.isGuest === true;
  const [savedLooks, setSavedLooks] = useState([]);
  const [isActuallyGuest, setIsActuallyGuest] = useState(isGuestParam);

  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const handleGoToDashboard = useCallback(async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      const activeId = storedUserId || route?.params?.userId;
      if (activeId) {
        navigation.reset({ 
          index: 0,
          routes: [{
            name: 'Main',
            params: {
              screen: 'DashboardRoot',
              params: { userId: activeId }
            }
          }]
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Login' }],
        });
      }
    } catch (e) {
      console.error('Error reading userId:', e);
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    }
  }, [navigation, route?.params?.userId]);

  const handleBack = useCallback(() => {
    if (isActuallyGuest) {
      navigation.reset({
        index: 1,
        routes: [{ name: 'Login' }, { name: 'GuestOnboarding' }],
      });
    } else {
      handleGoToDashboard();
    }
  }, [isActuallyGuest, navigation, handleGoToDashboard]);

  // Handle Android hardware back press: Guest -> GuestOnboarding, Logged-in -> Dashboard
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => {
        if (subscription?.remove) {
          subscription.remove();
        } else {
          BackHandler.removeEventListener('hardwareBackPress', onBackPress);
        }
      };
    }, [handleBack])
  );

  useEffect(() => {
    // Cross-check with local storage to be safe, but prioritize the explicit flag
    if (!isActuallyGuest) {
      AsyncStorage.getItem('userId').then(id => {
        setIsActuallyGuest(!id);
      }).catch(() => setIsActuallyGuest(true));
    }

    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, easing: Easing.out(Easing.exp), useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    if (!analysisResults) {
      handleBack();
    }
  }, [analysisResults, handleBack]);

  if (!analysisResults) {
    return null;
  }

  const jewelry = analysisResults.jewelry || {
    recommended: 'Not specified',
    avoid: 'Not specified',
    reason: '',
  };

  const necklines = analysisResults.necklines || {
    recommended: [],
    avoid: [],
    reason: '',
  };

  const actualResults = analysisResults.bestNeutrals || analysisResults.bestColors || analysisResults.bestAccentColors 
    ? analysisResults 
    : (analysisResults.analysis || analysisResults);

  const bestNeutrals = normalizeColorList(actualResults.bestNeutrals || actualResults.bestColors);
  const bestAccentColors = normalizeColorList(actualResults.bestAccentColors);
  const avoidColors = normalizeColorList(actualResults.avoidColors);

  const outfits = Array.isArray(actualResults.outfits)
    ? actualResults.outfits
    : [];

  const handleSaveLook = async () => {
    try {
      await AsyncStorage.setItem('@latest_analysis', JSON.stringify(actualResults));
      setSavedLooks([...savedLooks, actualResults]);
      Alert.alert('Saved', 'This look has been saved! You can view the updated insights in your dashboard.');
    } catch (e) {
      console.error('Failed to save look locally', e);
      Alert.alert('Error', 'Could not save the look locally.');
    }
  };

  const handleShareLook = async () => {
    try {
      await Share.share({
        message: `Check out my AI-generated style profile! Color Season: ${actualResults.colorSeason}, Recommended metals: ${jewelry.recommended}`,
        title: 'AI Stylist Profile',
      });
    } catch (error) {
      console.error('Share error:', error);
    }
  };

  const handleBuyNow = (link) => {
    Linking.openURL(link).catch(() => {
      Alert.alert('Error', 'Could not open the link');
    });
  };

  return (
    <View style={styles.mainWrapper}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <TouchableOpacity 
          onPress={handleBack} 
          style={styles.backButton} 
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={22} color="#25344F" />
        </TouchableOpacity>

        <Text style={styles.title}>Your Style Profile</Text>
        
        <TouchableOpacity 
          onPress={handleBack} 
          style={styles.dashboardButton} 
          activeOpacity={0.7}
        >
          <Ionicons name="home" size={22} color="#25344F" />
        </TouchableOpacity>
      </Animated.View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>

      {/* Guest CTA Banner */}
      {isActuallyGuest && (
        <View style={styles.guestBanner}>
          <Ionicons name="lock-closed-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.guestBannerTitle}>Want to save your results?</Text>
            <Text style={styles.guestBannerSub}>Create a free account to save and track your style profile.</Text>
          </View>
          <TouchableOpacity
            style={styles.guestBannerBtn}
            onPress={() => navigation.replace('Auth')}
            activeOpacity={0.85}
          >
            <Text style={styles.guestBannerBtnText}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Style Summary</Text>
        <View style={styles.summaryCard}>
          {[
            { label: 'Face Shape', value: actualResults.faceShape || 'Not Detected' },
            { label: 'Body Shape', value: actualResults.bodyShape || 'Not Detected' },
            { label: 'Undertone',  value: actualResults.undertone },
            { label: 'Contrast',   value: actualResults.contrastLevel },
            { label: 'Color Season', value: actualResults.colorSeason },
          ].map(({ label, value }, i) => (
            <View key={i}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{label}</Text>
                <View style={styles.summaryValueChip}>
                  <Text style={styles.summaryValue}>{value}</Text>
                </View>
              </View>
              {i < 4 && <View style={styles.summaryDivider} />}
            </View>
          ))}
          {actualResults.colorSeasonConfidence ? (
            <Text style={styles.confidenceText}>Confidence: {actualResults.colorSeasonConfidence}%</Text>
          ) : null}
          {actualResults.summaryExplanation ? (
            <Text style={styles.summaryText}>{actualResults.summaryExplanation}</Text>
          ) : null}
        </View>
      </View>

      <View style={styles.colorsSection}>
        <Text style={styles.sectionTitle}>Your Color Palette</Text>

        <View style={styles.colorSubsection}>
          <Text style={styles.colorSubtitle}>Best Neutrals</Text>
          {bestNeutrals.map((color, idx) => (
            <ColorCard key={idx} color={color} />
          ))}
        </View>

        <View style={styles.colorSubsection}>
          <Text style={styles.colorSubtitle}>Best Accent Colors</Text>
          {bestAccentColors.map((color, idx) => (
            <ColorCard key={idx} color={color} />
          ))}
        </View>

        <View style={styles.colorSubsection}>
          <Text style={styles.colorSubtitle}>Colors To Avoid</Text>
          {avoidColors.map((color, idx) => (
            <ColorCard key={idx} color={color} />
          ))}
        </View>
      </View>

      <View style={styles.jewelrySection}>
        <Text style={styles.sectionTitle}>Jewelry Recommendation</Text>
        <View style={styles.jewelryCard}>
          <View style={styles.jewelryRow}>
            <Text style={styles.jewelryLabel}>Recommended Metal</Text>
            <Text style={styles.jewelryValue}>{jewelry.recommended}</Text>
          </View>
          <View style={styles.jewelryDivider} />
          <View style={styles.jewelryRow}>
            <Text style={styles.jewelryLabel}>Metal to Avoid</Text>
            <Text style={styles.jewelryValue}>{jewelry.avoid}</Text>
          </View>
          <View style={styles.jewelryDivider} />
          <Text style={styles.jewelryReason}>{jewelry.reason}</Text>
        </View>
      </View>

      {necklines && (
        <View style={styles.necklinesSection}>
          <Text style={styles.sectionTitle}>Neckline Recommendations</Text>
          <View style={styles.necklinesCard}>
            <View style={styles.necklinesSubsection}>
              <Text style={styles.necklinesSubtitle}>Recommended Necklines</Text>
              <View style={[styles.necklinesTagContainer, { marginTop: 8 }]}>
                {necklines.recommended.map((neckline, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={[styles.tagText, { paddingHorizontal: 4 }]}> {neckline}</Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.necklinesDivider} />
            <View style={styles.necklinesSubsection}>
              <Text style={styles.necklinesSubtitle}>Necklines to Avoid</Text>

              <View style={styles.necklinesTagContainer}>
                {necklines.avoid.map((neckline, idx) => (
                  <View key={idx} style={[styles.tag, styles.tagAvoid]}>
                    <Text style={[styles.tagText, styles.tagAvoidText]}>
                      {neckline}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
            <View style={styles.necklinesDivider} />
            <Text style={styles.necklinesReason}>{necklines.reason}</Text>
          </View>
        </View>
      )}

      {actualResults.dbOutfits && actualResults.dbOutfits.length > 0 && (
        <View style={styles.outfitsSection}>
          <Text style={styles.sectionTitle}>Shop Recommended Outfits</Text>
          <FlatList
            data={actualResults.dbOutfits}
            keyExtractor={(item, index) => item.id || index.toString()}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <DbOutfitCard index={index} outfit={item} onBuyPress={() => handleBuyNow(item.link || 'https://example.com/shop')} />
            )}
          />
        </View>
      )}

      <View style={styles.outfitsSection}>
        <Text style={styles.sectionTitle}>Recommended Outfits (Stylist Tips)</Text>
        <FlatList
          data={actualResults.outfits}
          keyExtractor={(item, index) => item.id || index.toString()}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <OutfitCard index={index} outfit={item} onBuyPress={() => handleBuyNow(item.link || 'https://example.com/shop')} />
          )}
        />
      </View>

      <View style={styles.actionSection}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSaveLook} activeOpacity={0.85}>
          <Ionicons name="bookmark-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={styles.actionButtonText}>Save Look</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={handleShareLook} activeOpacity={0.85}>
          <Ionicons name="share-social-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <Text style={[styles.actionButtonText, styles.shareButtonText]}>Share</Text>
        </TouchableOpacity>
      </View>

      {/* Guest bottom CTA */}
      {isActuallyGuest && (
        <View style={styles.guestBottomSection}>
          <TouchableOpacity
            style={styles.guestStartOverBtn}
            onPress={handleBack}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={18} color="#25344F" style={{ marginRight: 8 }} />
            <Text style={styles.guestStartOverText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.guestSignUpBtn}
            onPress={() => navigation.replace('Auth')}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.guestSignUpText}>Create Account & Save Profile</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.spacer} />
    </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
    backgroundColor: '#D5B893',
  },
  container: {
    flex: 1,
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 62, // Increased for visibility on notch phones
    paddingBottom: 16,
    height: 120,
    backgroundColor: '#D5B893',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 10,
  },

  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37,52,79,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  dashboardButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(37,52,79,0.10)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#25344F',
    letterSpacing: -0.5,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#25344F',
    marginBottom: 12,
    letterSpacing: -0.3,
  },

  summarySection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },

  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#25344F',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 14,
    elevation: 5,
  },

  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },

  summaryLabel: {
    fontSize: 13,
    color: '#6F4D38',
    fontWeight: '500',
  },

  summaryValueChip: {
    backgroundColor: '#F5EDE0',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#EAD8C5',
  },

  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#25344F',
  },

  summaryDivider: {
    height: 1,
    backgroundColor: '#F5EDE0',
    marginVertical: 2,
  },

  summaryText: {
    fontSize: 14,
    color: '#6F4D38',
    marginTop: 8,
  },

  confidenceText: {
    fontSize: 12,
    color: '#632024',
    fontWeight: '600',
  },

  colorsSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },

  colorSubtitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#25344F',
    marginBottom: 10,
  },

  jewelrySection: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },

  jewelryCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#25344F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },

  jewelryLabel: {
    color: '#6F4D38',
  },

  jewelryValue: {
    fontWeight: '700',
    color: '#25344F',
  },

  jewelryDivider: {
    height: 1,
    backgroundColor: '#EAD8C5',
    marginVertical: 8,
  },

  jewelryReason: {
    color: '#6F4D38',
  },

  necklinesSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },

  necklinesCard: {
    backgroundColor: '#EAD8C5',
    borderRadius: 12,
    padding: 16,
  },

  necklinesSubtitle: {
    fontWeight: '600',
    color: '#25344F',
    marginBottom: 8,
  },

  tag: {
    backgroundColor: '#25344F15',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#25344F',
    alignSelf: 'flex-start',
  },

  tagText: {
    color: '#25344F',
    fontSize: 14,
    fontWeight: '600',
  },

  tagAvoid: {
    backgroundColor: '#63202415',
    borderColor: '#632024',
  },

  tagAvoidText: {
    color: '#632024',
  },

  necklinesTagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginTop: 8,
    marginBottom: 10,
  },

  necklinesDivider: {
    height: 1,
    backgroundColor: '#EAD8C5',
    marginVertical: 12,
  },

  necklinesReason: {
    color: '#6F4D38',
  },

  outfitsSection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },

  actionSection: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 36,
  },

  actionButton: {
    flex: 1,
    backgroundColor: '#632024',
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#632024',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },

  shareButton: {
    backgroundColor: '#25344F',
    shadowColor: '#25344F',
  },

  actionButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },

  spacer: {
    height: 20,
  },

  // Guest experience styles
  guestBanner: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: '#25344F',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#25344F',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  guestBannerTitle: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    marginBottom: 3,
  },
  guestBannerSub: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    lineHeight: 16,
  },
  guestBannerBtn: {
    backgroundColor: '#632024',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    marginLeft: 10,
  },
  guestBannerBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  guestBottomSection: {
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 20,
  },
  guestStartOverBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(37,52,79,0.25)',
    backgroundColor: 'rgba(234,216,197,0.6)',
  },
  guestStartOverText: {
    color: '#25344F',
    fontWeight: '600',
    fontSize: 15,
  },
  guestSignUpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: '#632024',
    shadowColor: '#632024',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  guestSignUpText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default ResultsScreen;
