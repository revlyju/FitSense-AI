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

  const handleSaveLook = () => {
    setSavedLooks([...savedLooks, analysisResults]);
    Alert.alert('Saved', 'This look has been saved!');
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

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Your Style Profile</Text>
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
              <View style={styles.necklinesTagContainer}>
                {necklines.recommended.map((neckline, idx) => (
                  <View key={idx} style={styles.tag}>
                    <Text style={styles.tagText}>{neckline}</Text>
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
                    <Text style={[styles.tagText, styles.tagAvoidText]}>{neckline}</Text>
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
            keyExtractor={(item, index) => item._id || index.toString()}
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
    backgroundColor: '#f8f8f8',
    paddingTop: 50,
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 30,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 15,
  },
  backButtonText: {
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '600',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  summarySection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 15,
  },
  summaryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  summaryText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 8,
  },
  confidenceText: {
    fontSize: 12,
    color: '#2e7d32', // Green for positive/confidence
    fontWeight: '600',
    marginTop: 2,
  },
  colorsSection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  colorSubsection: {
    marginBottom: 20,
  },
  colorSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 12,
  },
  jewelrySection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  jewelryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  jewelryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  jewelryLabel: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  jewelryValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  jewelryDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 8,
  },
  jewelryReason: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 8,
  },
  necklinesSection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  necklinesCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  necklinesSubsection: {
    marginBottom: 12,
  },
  necklinesSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 10,
  },
  necklinesTagContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  tagAvoid: {
    backgroundColor: '#ffe8e8',
  },
  tagAvoidText: {
    color: '#d32f2f',
  },
  necklinesDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 12,
  },
  necklinesReason: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginTop: 8,
  },
  outfitsSection: {
    paddingHorizontal: 20,
    marginBottom: 28,
  },
  actionSection: {
    paddingHorizontal: 20,
    marginBottom: 28,
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: '#e8e8e8',
  },
  shareButtonText: {
    color: '#1a1a1a',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  spacer: {
    height: 20,
  },
});

export default ResultsScreen;
