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

export default function GuestOnboardingScreen({ navigation }) {
  const [weather, setWeather] = useState('');
  const [time, setTime] = useState('Day');
  const [occasion, setOccasion] = useState('');

  const isNight = time === 'Night';

  const theme = {
    bg: isNight ? '#25344F' : '#D5B893',
    card: isNight ? '#617891' : '#ffffff',
    selected: isNight ? '#632024' : '#6F4D38',
    text: isNight ? '#D5B893' : '#25344F',
    subText: isNight ? '#cbb89a' : '#6F4D38',
    chip: isNight ? '#617891' : '#e8dccb',
  };

  const weatherOptions = [
    { label: 'Sunny', icon: '☀️' },
    { label: 'Rainy', icon: '🌧' },
    { label: 'Cold', icon: '❄️' },
    { label: 'Cloudy', icon: '☁️' },
  ];

  const occasionOptions = [
    { label: 'Party', icon: '🎉' },
    { label: 'Office', icon: '🏢' },
    { label: 'College', icon: '🎓' },
    { label: 'Casual', icon: '👕' },
    { label: 'Date', icon: '❤️' },
    { label: 'Travel', icon: '✈️' },
  ];

  const summaryText =
    weather || occasion
      ? `${weather || '—'} • ${time} • ${occasion || '—'}`
      : 'Choose your vibe to continue';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: 'space-between' }}
    >
      <StatusBar barStyle={isNight ? 'light-content' : 'dark-content'} />

      {/* Main Content */}
      <View style={{ paddingHorizontal: 20 }}>
        {/* Header with Back button & Guest Badge */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
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
          <Text style={[styles.title, { color: theme.text }]}>
            Set your vibe for the day
          </Text>
          <Text style={[styles.subtitle, { color: theme.subText }]}>
            Pick what matches your mood today
          </Text>
        </View>

        {/* Weather */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.section, { color: theme.text }]}>Weather</Text>
          <Text style={[styles.optionalLabel, { color: theme.subText }]}> (Optional)</Text>
        </View>
        <View style={styles.row}>
          {weatherOptions.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => setWeather(item.label)}
              style={[
                styles.card,
                { backgroundColor: theme.card },
                weather === item.label && { backgroundColor: theme.selected },
              ]}
              activeOpacity={0.8}
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <Text style={{ color: weather === item.label ? '#fff' : theme.text, fontWeight: '600' }}>
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Time */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.section, { color: theme.text }]}>Time of the day</Text>
          <Text style={[styles.optionalLabel, { color: theme.subText }]}> (Optional)</Text>
        </View>
        <View style={[styles.toggleContainer, { backgroundColor: theme.chip }]}>
          {['Day', 'Night'].map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setTime(item)}
              style={[
                styles.toggleButton,
                time === item && { backgroundColor: theme.selected },
              ]}
              activeOpacity={0.8}
            >
              <Text
                style={{
                  color: time === item ? '#fff' : theme.text,
                  fontWeight: '700',
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Occasion */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.section, { color: theme.text }]}>Occasion</Text>
          <Text style={[styles.optionalLabel, { color: theme.subText }]}> (Optional)</Text>
        </View>
        <View style={styles.row}>
          {occasionOptions.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => setOccasion(item.label)}
              style={[
                styles.chip,
                { backgroundColor: theme.chip },
                occasion === item.label && { backgroundColor: theme.selected },
              ]}
              activeOpacity={0.8}
            >
              <Text style={{ marginRight: 5 }}>{item.icon}</Text>
              <Text
                style={{
                  color: occasion === item.label ? '#fff' : theme.text,
                  fontWeight: '600',
                }}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Bottom Summary & Continue */}
      <View style={[styles.summaryBox, { backgroundColor: theme.card }]}>
        <Text style={{ color: theme.subText, marginBottom: 6, fontWeight: '600' }}>
          Your Guest Vibe
        </Text>

        <Text style={[styles.summaryText, { color: theme.text }]}>
          {summaryText}
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.selected }]}
          onPress={() =>
            navigation.navigate('GuestPreferences', {
              userPreferences: {
                timeOfDay: time,
                occasion,
                seasonOrWeather: weather,
              },
            })
          }
          activeOpacity={0.85}
        >
          <Text style={styles.buttonText}>Continue as Guest</Text>
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
    textAlign: 'center',
    fontWeight: '700',
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
    marginTop: 20,
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
    padding: 18,
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
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    margin: 5,
  },
  toggleContainer: {
    flexDirection: 'row',
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: 10,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
  },
  icon: {
    fontSize: 28,
    marginBottom: 6,
  },
  summaryBox: {
    padding: 24,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 6,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});
