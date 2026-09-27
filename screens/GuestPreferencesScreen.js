import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function GuestPreferencesScreen({ navigation, route }) {
  const [style, setStyle] = useState('');
  const [colors, setColors] = useState([]);
  const [fits, setFits] = useState([]);
  const [gender, setGender] = useState('');

  const existingPrefs = route?.params?.userPreferences || {};
  const isNight = existingPrefs.timeOfDay === 'Night';

  const theme = {
    bg: isNight ? '#25344F' : '#D5B893',
    card: isNight ? '#617891' : '#ffffff',
    selected: isNight ? '#632024' : '#6F4D38',
    text: isNight ? '#D5B893' : '#25344F',
    subText: isNight ? '#cbb89a' : '#6F4D38',
    chip: isNight ? '#617891' : '#e8dccb',
  };

  const toggleSelect = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const styleOptions = [
    { label: 'Casual', icon: '👕' },
    { label: 'Formal', icon: '🧥' },
    { label: 'Streetwear', icon: '🧢' },
    { label: 'Ethnic', icon: '🪔' },
    { label: 'Minimal', icon: '⚪' },
    { label: 'Sporty', icon: '🏃' },
  ];

  const genderOptions = [
    { label: 'Male', icon: '👨' },
    { label: 'Female', icon: '👩' },
    { label: 'Unisex', icon: '🧑' },
  ];

  const colorOptions = [
    'Neutral',
    'Bold',
    'Pastel',
    'Dark',
    'Warm',
    'Cool',
  ];

  const fitOptions = ['Slim', 'Regular', 'Oversized', 'Relaxed'];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <StatusBar barStyle={isNight ? 'light-content' : 'dark-content'} />

      <View style={{ paddingHorizontal: 20 }}>
        {/* Top Header */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

          <View style={styles.guestBadge}>
            <Ionicons name="eye-outline" size={14} color="#632024" style={{ marginRight: 4 }} />
            <Text style={styles.guestBadgeText}>GUEST MODE</Text>
          </View>
        </View>

        {/* Title */}
        <View style={{ marginTop: 20, marginBottom: 20 }}>
          <Text style={[styles.title, { color: theme.text }]}>Define your style</Text>
          <Text style={[styles.subtitle, { color: theme.subText }]}>
            Tell us what you love wearing
          </Text>
        </View>

        {/* Gender */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.section, { color: theme.text }]}>Gender</Text>
          <Text style={[styles.optionalLabel, { color: theme.subText }]}> (Optional)</Text>
        </View>
        <View style={styles.row}>
          {genderOptions.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => setGender(item.label)}
              style={[
                styles.card,
                { backgroundColor: theme.card },
                gender === item.label && { backgroundColor: theme.selected },
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <Text style={{ color: gender === item.label ? '#fff' : theme.text, fontWeight: '600' }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Style */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.section, { color: theme.text }]}>Style Preference</Text>
          <Text style={[styles.optionalLabel, { color: theme.subText }]}> (Optional)</Text>
        </View>
        <View style={styles.row}>
          {styleOptions.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => setStyle(item.label)}
              style={[
                styles.card,
                { backgroundColor: theme.card },
                style === item.label && { backgroundColor: theme.selected },
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <Text style={{ color: style === item.label ? '#fff' : theme.text, fontWeight: '600' }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Colors */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.section, { color: theme.text }]}>Color Preference</Text>
          <Text style={[styles.optionalLabel, { color: theme.subText }]}> (Optional)</Text>
        </View>
        <View style={styles.row}>
          {colorOptions.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => toggleSelect(item, colors, setColors)}
              style={[
                styles.chip,
                { backgroundColor: theme.chip },
                colors.includes(item) && { backgroundColor: theme.selected },
              ]}
              activeOpacity={0.8}
            >
              <Text style={{ color: colors.includes(item) ? '#fff' : theme.text, fontWeight: '600' }}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Fits */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.section, { color: theme.text }]}>Fit Preference</Text>
          <Text style={[styles.optionalLabel, { color: theme.subText }]}> (Optional)</Text>
        </View>
        <View style={styles.row}>
          {fitOptions.map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => toggleSelect(item, fits, setFits)}
              style={[
                styles.chip,
                { backgroundColor: theme.chip },
                fits.includes(item) && { backgroundColor: theme.selected },
              ]}
              activeOpacity={0.8}
            >
              <Text style={{ color: fits.includes(item) ? '#fff' : theme.text, fontWeight: '600' }}>
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.selected }]}
          onPress={() =>
            navigation.navigate('GuestUpload', {
              userPreferences: {
                ...existingPrefs,
                gender,
                stylePreference: style,
                colorPreference: colors,
                fitPreference: fits,
              },
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Continue to Photo Upload</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  topBar: {
    marginTop: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  guestBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(99, 32, 36, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(99, 32, 36, 0.2)',
  },
  guestBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#632024',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    textAlign: 'center',
    marginTop: 6,
    fontSize: 14,
  },
  section: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 22,
  },
  optionalLabel: {
    fontSize: 12,
    opacity: 0.7,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
  },
  card: {
    width: '46%',
    padding: 16,
    margin: 6,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    margin: 5,
  },
  icon: {
    fontSize: 26,
    marginBottom: 5,
  },
  button: {
    marginTop: 36,
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#632024',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
