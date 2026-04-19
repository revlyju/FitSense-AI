import { useEffect, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
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
        const hexMatch = item.match(/#[0-9a-fA-F]{3,8}\b/i) || item.match(/#[0-9a-fA-F]{3,8}/i);
        const hex = hexMatch ? hexMatch[0] : undefined;
        let nameText = hexMatch ? item.replace(hexMatch[0], '').trim() : item.trim();
        nameText = nameText.replace(/\(\s*\)/g, '').trim() || hex || item;

        return {
          name: nameText,
          hex: hex || (item.startsWith('#') ? item : '#cccccc'),
          reason: '',
        };
      }

      if (typeof item === 'object') {
        const rawHex = item.hex || item.color || item.value || '';
        const hexMatch = typeof rawHex === 'string' ? (rawHex.match(/#[0-9a-fA-F]{3,8}\b/i) || rawHex.match(/#[0-9a-fA-F]{3,8}/i)) : null;
        const hex = hexMatch ? hexMatch[0] : (typeof rawHex === 'string' && rawHex.startsWith('#') ? rawHex : '#cccccc');

        let nameText = item.name || item.label || item.color || hex || 'Color';
        if (typeof nameText === 'string' && hex) {
          nameText = nameText.replace(hex, '').replace(/\(\s*\)/g, '').trim() || nameText;
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
  const [savedLooks, setSavedLooks] = useState([]);

  useEffect(() => {
    if (!analysisResults || !userPreferences) {
      navigation.replace('Onboarding');
    }
  }, [analysisResults, userPreferences, navigation]);

  if (!analysisResults || !userPreferences) {
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

  const bestNeutrals = normalizeColorList(analysisResults.bestNeutrals);

  const bestAccentColors = normalizeColorList(analysisResults.bestAccentColors);

  const avoidColors = normalizeColorList(analysisResults.avoidColors);

  const outfits = Array.isArray(analysisResults.outfits)
    ? analysisResults.outfits
    : [];

  const handleSaveLook = async () => {
    try {
      await AsyncStorage.setItem('@latest_analysis', JSON.stringify(analysisResults));
      setSavedLooks([...savedLooks, analysisResults]);
      Alert.alert('Saved', 'This look has been saved! You can view the updated insights in your dashboard.');
    } catch (e) {
      console.error('Failed to save look locally', e);
      Alert.alert('Error', 'Could not save the look locally.');
    }
  };

  const handleShareLook = async () => {
    try {
      await Share.share({
        message: `Check out my AI-generated style profile! Color Season: ${analysisResults.colorSeason}, Recommended metals: ${jewelry.recommended}`,
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

  const handleBack = () => {
    navigation.navigate('Onboarding');
  };

  const handleGoToDashboard = async () => {
    try {
      const storedUserId = await AsyncStorage.getItem('userId');
      if (storedUserId) {
        navigation.replace('Main', { 
          screen: 'DashboardRoot',
          params: { userId: storedUserId }
        });
      } else {
        navigation.replace('Auth');
      }
    } catch (e) {
      console.error('Error reading userId:', e);
      navigation.replace('Auth');
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Style Profile</Text>
        <View style={{ flex: 1 }} />
        <TouchableOpacity onPress={handleGoToDashboard} style={styles.dashboardButton}>
          <Ionicons name="home" size={24} color="#25344F" />
        </TouchableOpacity>
      </View>

      <View style={styles.summarySection}>
        <Text style={styles.sectionTitle}>Style Summary</Text>
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Face Shape</Text>
            <Text style={styles.summaryValue}>{analysisResults.faceShape || 'Not Detected'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Body Shape</Text>
            <Text style={styles.summaryValue}>{analysisResults.bodyShape || 'Not Detected'}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Undertone</Text>
            <Text style={styles.summaryValue}>{analysisResults.undertone}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Contrast Level</Text>
            <Text style={styles.summaryValue}>{analysisResults.contrastLevel}</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Color Season</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.summaryValue}>{analysisResults.colorSeason}</Text>
              {analysisResults.colorSeasonConfidence ? (
                <Text style={styles.confidenceText}>Confidence: {analysisResults.colorSeasonConfidence}%</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.summaryDivider} />
          <Text style={styles.summaryText}>{analysisResults.summaryExplanation}</Text>
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

      <View style={styles.outfitsSection}>
        <Text style={styles.sectionTitle}>Recommended Outfits (Stylist Tips)</Text>
        <FlatList
          data={analysisResults.outfits}
          keyExtractor={(item, index) => item.id || index.toString()}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <OutfitCard index={index} outfit={item} onBuyPress={() => handleBuyNow(item.link || 'https://example.com/shop')} />
          )}
        />
      </View>

      {analysisResults.dbOutfits && analysisResults.dbOutfits.length > 0 && (
        <View style={styles.outfitsSection}>
          <Text style={styles.sectionTitle}>Shop Recommended Outfits</Text>
          <FlatList
            data={analysisResults.dbOutfits}
            keyExtractor={(item, index) => item.id || index.toString()}
            scrollEnabled={false}
            renderItem={({ item, index }) => (
              <DbOutfitCard index={index} outfit={item} onBuyPress={() => handleBuyNow(item.link || 'https://example.com/shop')} />
            )}
          />
        </View>
      )}

      <View style={styles.actionSection}>
        <TouchableOpacity style={styles.actionButton} onPress={handleSaveLook}>
          <Text style={styles.actionButtonText}>Save Look</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.actionButton, styles.shareButton]} onPress={handleShareLook}>
          <Text style={[styles.actionButtonText, styles.shareButtonText]}>Share Look</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.spacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
  flex: 1,
  backgroundColor: '#D5B893',
  paddingTop: 50,
},

  header: {
  paddingHorizontal: 20,
  paddingTop: 20,
  marginBottom: 25,
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
},

  backButtonText: {
    fontSize: 16,
    color: '#25344F',
    fontWeight: '600',
  },

  title: {
  fontSize: 22,
  fontWeight: '700',
  color: '#25344F',
  marginLeft: 10,
},

  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#25344F',
    marginBottom: 12,
  },

  summarySection: {
    paddingHorizontal: 20,
    marginBottom: 25,
  },

  summaryCard: {
    backgroundColor: '#EAD8C5',
    borderRadius: 14,
    padding: 16,
  },

  summaryLabel: {
    fontSize: 14,
    color: '#6F4D38',
  },

  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#25344F',
  },

  summaryDivider: {
    height: 1,
    backgroundColor: '#EAD8C5',
    marginVertical: 8,
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
    marginBottom: 25,
  },

  jewelryCard: {
    backgroundColor: '#EAD8C5',
    borderRadius: 14,
    padding: 16,
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
    gap: 10,
    marginBottom: 30,
  },

  actionButton: {
    flex: 1,
    backgroundColor: '#632024',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },

  shareButton: {
    backgroundColor: '#25344F',
  },

  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  spacer: {
    height: 20,
  },
});

export default ResultsScreen;
