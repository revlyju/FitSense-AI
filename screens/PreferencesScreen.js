import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from '@expo/vector-icons';

export default function PreferencesScreen({ navigation, route }) {
  const [style, setStyle] = useState("");
  const [colors, setColors] = useState([]);
  const [fits, setFits] = useState([]);
  const [gender, setGender] = useState("");
  
  const existingPrefs = route?.params?.userPreferences || {};
  const userId = route?.params?.userId ?? null;
  const isGuest = route?.params?.isGuest || false;
  const isNight = existingPrefs.timeOfDay === "Night";

  const theme = {
    bg: isNight ? "#25344F" : "#D5B893",
    card: isNight ? "#617891" : "#ffffff",
    selected: isNight ? "#632024" : "#6F4D38",
    text: isNight ? "#D5B893" : "#25344F",
    subText: isNight ? "#cbb89a" : "#6F4D38",
    chip: isNight ? "#617891" : "#e8dccb",
  };

  const toggleSelect = (item, list, setList) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const styleOptions = [
    { label: "Casual", icon: "👕" },
    { label: "Formal", icon: "🧥" },
    { label: "Streetwear", icon: "🧢" },
    { label: "Ethnic", icon: "🪔" },
    { label: "Minimal", icon: "⚪" },
    { label: "Sporty", icon: "🏃" },
  ];

  const genderOptions = [
    { label: "Male", icon: "👨" },
    { label: "Female", icon: "👩" },
    { label: "Unisex", icon: "🧑" },
  ];

  const colorOptions = [
    "Neutral",
    "Bold",
    "Pastel",
    "Dark",
    "Warm",
    "Cool",
  ];

  const fitOptions = ["Slim", "Regular", "Oversized", "Relaxed"];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: 30 }}
    >
      <View style={{ paddingHorizontal: 20 }}>

        {/* Back Button Header */}
        <View style={{ marginTop: 50, marginBottom: -10, flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity 
            onPress={() => navigation.goBack()}
            style={{ 
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* TITLE */}
        <View style={{ marginTop: 30, marginBottom: 20 }}>
          <Text style={[styles.title, { color: theme.text }]}>Define your style</Text>
          <Text style={[styles.subtitle, { color: theme.subText }]}>
            Tell us what you love wearing
          </Text>
        </View>

        {/* GENDER */}
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
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <Text style={{ color: theme.text }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* STYLE */}
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
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <Text style={{ color: theme.text }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* COLOR */}
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
            >
              <Text style={{ color: theme.text }}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* FIT */}
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
            >
              <Text style={{ color: theme.text }}>{item}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* BUTTON */}
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.selected }]}
          onPress={() => navigation.navigate("Upload", {
            userId,
            isGuest,
            userPreferences: {
              ...existingPrefs,
              gender: gender,
              stylePreference: style,
              colorPreference: colors,
              fitPreference: fits,
            },
          })}
        >
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  title: {
    fontSize: 22,
    fontWeight: "600",
    textAlign: "center",
    color: "#25344F",
  },
  subtitle: {
    textAlign: "center",
    marginTop: 6,
    color: "#6F4D38",
  },
  section: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 20,
  },
  optionalLabel: {
    fontSize: 12,
    opacity: 0.6,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 10,
  },
  card: {
    width: "45%",
    padding: 18,
    margin: 6,
    borderRadius: 14,
    backgroundColor: "#ffffff",
    alignItems: "center",
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#e8dccb",
    margin: 5,
  },
  selected: {
    backgroundColor: "#6F4D38",
  },
  text: {
    color: "#25344F",
  },
  icon: {
    fontSize: 26,
    marginBottom: 5,
  },
  button: {
    marginTop: 40,
    backgroundColor: "#632024",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});