import { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";

export default function OnboardingScreen({ navigation }) {
  const [weather, setWeather] = useState("");
  const [time, setTime] = useState("Day");
  const [occasion, setOccasion] = useState("");

  const isNight = time === "Night";

  const theme = {
    bg: isNight ? "#25344F" : "#D5B893",
    card: isNight ? "#617891" : "#ffffff",
    selected: isNight ? "#632024" : "#6F4D38",
    text: isNight ? "#D5B893" : "#25344F",
    subText: isNight ? "#cbb89a" : "#6F4D38",
    chip: isNight ? "#617891" : "#e8dccb",
  };

  const weatherOptions = [
    { label: "Sunny", icon: "☀️" },
    { label: "Rainy", icon: "🌧" },
    { label: "Cold", icon: "❄️" },
    { label: "Cloudy", icon: "☁️" },
  ];

  const occasionOptions = [
    { label: "Party", icon: "🎉" },
    { label: "Office", icon: "🏢" },
    { label: "College", icon: "🎓" },
    { label: "Casual", icon: "👕" },
    { label: "Date", icon: "❤️" },
    { label: "Travel", icon: "✈️" },
  ];

  const summaryText =
    weather || occasion
      ? `${weather || "—"} • ${time} • ${occasion || "—"}`
      : "Choose your vibe to continue";

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ flexGrow: 1, justifyContent: "space-between" }}
    >
      {/* MAIN CONTENT */}
      <View style={{ paddingHorizontal: 20 }}>
        
        {/* TITLE */}
        <View style={{ marginTop: 40, marginBottom: 20 }}>
          <Text style={[styles.title, { color: theme.text }]}>
            Set your vibe for the day
          </Text>
          <Text style={[styles.subtitle, { color: theme.subText }]}>
            Pick what matches your mood today
          </Text>
        </View>

        {/* WEATHER */}
        <Text style={[styles.section, { color: theme.text }]}>Weather</Text>
        <View style={styles.row}>
          {weatherOptions.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => setWeather(item.label)}
              style={[
                styles.card,
                { backgroundColor: theme.card },
                weather === item.label && {
                  backgroundColor: theme.selected,
                },
              ]}
            >
              <Text style={styles.icon}>{item.icon}</Text>
              <Text style={{ color: theme.text }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* TIME */}
        <Text style={[styles.section, { color: theme.text }]}>
          Time of the day
        </Text>
        <View style={[styles.toggleContainer, { backgroundColor: theme.chip }]}>
          {["Day", "Night"].map((item) => (
            <TouchableOpacity
              key={item}
              onPress={() => setTime(item)}
              style={[
                styles.toggleButton,
                time === item && { backgroundColor: theme.selected },
              ]}
            >
              <Text
                style={{
                  color: time === item ? "#fff" : theme.text,
                  fontWeight: "600",
                }}
              >
                {item}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* OCCASION */}
        <Text style={[styles.section, { color: theme.text }]}>
          Occasion
        </Text>
        <View style={styles.row}>
          {occasionOptions.map((item) => (
            <TouchableOpacity
              key={item.label}
              onPress={() => setOccasion(item.label)}
              style={[
                styles.chip,
                { backgroundColor: theme.chip },
                occasion === item.label && {
                  backgroundColor: theme.selected,
                },
              ]}
            >
              <Text style={{ marginRight: 5 }}>{item.icon}</Text>
              <Text style={{ color: theme.text }}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* BOTTOM PANEL */}
      <View style={[styles.summaryBox, { backgroundColor: theme.card }]}>
        <Text style={{ color: theme.subText, marginBottom: 8 }}>
          Your vibe
        </Text>

        <Text style={[styles.summaryText, { color: theme.text }]}>
          {summaryText}
        </Text>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.selected }]}
          onPress={() => navigation.navigate("Preferences", {
            userPreferences: {
              timeOfDay: time,
              occasion,
              seasonOrWeather: weather,
            }
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
    textAlign: "center",
    fontWeight: "600",
  },
  subtitle: {
    textAlign: "center",
    marginTop: 6,
  },
  section: {
    marginTop: 20,
    fontSize: 16,
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
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 5,
  },
  toggleContainer: {
    flexDirection: "row",
    borderRadius: 25,
    overflow: "hidden",
    marginTop: 10,
  },
  toggleButton: {
    flex: 1,
    padding: 10,
    alignItems: "center",
  },
  icon: {
    fontSize: 26,
    marginBottom: 5,
  },
  summaryBox: {
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  summaryText: {
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});