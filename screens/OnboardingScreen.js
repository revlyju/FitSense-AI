import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import SelectionButton from '../components/SelectionButton';

const OnboardingScreen = ({ navigation, route }) => {
  const userId = route?.params?.userId ?? null;
  const [selections, setSelections] = useState({
    gender: null,
    occasion: null,
    seasonOrWeather: null,
    locationClimate: null,
    timeOfDay: null,
    activityLevel: null,
    stylePreference: null,
    colorPreference: null,
    fitPreference: null,
  });

  const [image, setImage] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [activeField, setActiveField] = useState(null);
  const lastPickerTapMsRef = useRef({});

  const options = {
    gender: ['Male', 'Female', 'Non-binary', 'No Preference', 'Other'],
    occasion: ['Casual', 'Work', 'Date', 'Party', 'Travel', 'Formal', 'Workout', 'No Preference', 'Other'],
    seasonOrWeather: ['Spring', 'Summer', 'Autumn', 'Winter', 'Hot/Sunny', 'Rainy', 'Cold/Snowy', 'No Preference', 'Other'],
    locationClimate: ['Indoor (AC)', 'Indoor (Heated)', 'Outdoor (Humid)', 'Outdoor (Dry)', 'No Preference', 'Other'],
    timeOfDay: ['Morning', 'Afternoon', 'Evening', 'Night', 'No Preference'],
    activityLevel: ['Low (Sitting)', 'Moderate (Walking)', 'High (Active)', 'No Preference'],
    stylePreference: ['Minimal', 'Streetwear', 'Elegant', 'Romantic', 'Vintage', 'Edgy', 'Bohemian', 'Preppy', 'No Preference', 'Other'],
    colorPreference: ['Neutrals', 'Pastels', 'Bright Colors', 'Dark Tones', 'Earth Tones', 'No Preference', 'Other'],
    fitPreference: ['Loose', 'Regular', 'Fitted', 'Oversized', 'No Preference', 'Other']
  };

  const updateSelection = (field, value) => {
    setSelections(prev => ({ ...prev, [field]: value }));
    // Only close modal if the user picked a real option, not "Other"
    if (field === activeField && value !== 'Other') {
      setModalVisible(false);
    }
  };

  const openPicker = (field) => {
    setActiveField(field);
    setModalVisible(true);
  };

  const resetAll = () => {
    setSelections({
      gender: null,
      occasion: null,
      seasonOrWeather: null,
      locationClimate: null,
      timeOfDay: null,
      activityLevel: null,
      stylePreference: null,
      colorPreference: null,
      fitPreference: null,
    });
    setImage(null);
    setImageBase64(null);
    setLoading(false);
    setModalVisible(false);
    setActiveField(null);
  };

  const onRefresh = () => {
    setRefreshing(true);
    resetAll();
    setTimeout(() => setRefreshing(false), 400);
  };

  const handlePickerPress = (field) => {
    const now = Date.now();
    const lastTap = lastPickerTapMsRef.current[field] ?? 0;

    // double-tap to deselect (clear)
    if (now - lastTap > 0 && now - lastTap < 275) {
      lastPickerTapMsRef.current[field] = 0;
      updateSelection(field, null);
      return;
    }

    lastPickerTapMsRef.current[field] = now;
    openPicker(field);
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [3, 4],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) {
      setImage(result.assets[0].uri);
      setImageBase64(result.assets[0].base64);
    }
  };

  // --- FIXED LOGIC ---
  const handleAnalyze = () => {
    // Check if any filled field is still the literal string "Other"
    const hasUnfilledOther = Object.keys(selections).some(key => {
      return selections[key] === 'Other';
    });

    if (!image) {
      Alert.alert(
        'Missing Photo',
        'Please upload a photo for analysis. (All other fields are optional)'
      );
      return;
    }

    if (hasUnfilledOther) {
      Alert.alert(
        'Incomplete Fields',
        'Please type your specific preference for the fields where you selected "Other".'
      );
      return;
    }

    setLoading(true);
    navigation.navigate('Loading', {
      userPreferences: { ...selections, image: imageBase64, imageUri: image },
      userId,
    });
  };
  // -------------------

  const renderGridSection = (title, field) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.buttonGrid}>
        {options[field].map(option => (
          <SelectionButton
            key={option}
            label={option}
            isSelected={selections[field] === option || (option === 'Other' && selections[field] !== null && !options[field].slice(0, -1).includes(selections[field]))}
            onPress={() => updateSelection(field, option)}
            onDoubleTap={() => updateSelection(field, null)}
            width="48%"
          />
        ))}
      </View>
      {/* Show inline input for Grid sections if "Other" is selected */}
      {(selections[field] === 'Other' || (selections[field] && !options[field].includes(selections[field]))) && (field !== 'occasion' && field !== 'stylePreference') && (
        <TextInput
          style={styles.inlineInput}
          placeholder={`Enter your ${title}...`}
          value={selections[field] === 'Other' ? '' : selections[field]}
          onChangeText={(text) => updateSelection(field, text)}
        />
      )}
    </View>
  );

  const renderPickerSection = (title, field) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <TouchableOpacity style={styles.pickerTrigger} onPress={() => handlePickerPress(field)}>
        <Text style={[styles.pickerTriggerText, !selections[field] && { color: '#999' }]}>
          {selections[field] || `Select ${title}`}
        </Text>
        <Text style={styles.chevron}>▼</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.title}>AI Stylist</Text>
          <Text style={styles.subtitle}>Refine your fashion profile</Text>
        </View>

        {renderGridSection('Gender', 'gender')}
        {renderPickerSection('Occasion', 'occasion')}
        {renderPickerSection('Season & Weather', 'seasonOrWeather')}
        {renderPickerSection('Location Climate', 'locationClimate')}
        {renderPickerSection('Time of Day', 'timeOfDay')}
        {renderPickerSection('Activity Level', 'activityLevel')}
        {renderPickerSection('Style Preference', 'stylePreference')}
        {renderPickerSection('Color Preference', 'colorPreference')}
        {renderPickerSection('Fit Preference', 'fitPreference')}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Upload Your Photo</Text>
          {image ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image }} style={styles.image} />
              <TouchableOpacity style={styles.changeButton} onPress={pickImage}>
                <Text style={styles.changeButtonText}>Change Photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
              <Text style={styles.uploadButtonText}>Choose Photo</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={[styles.analyzeButton, loading && styles.analyzeButtonDisabled]}
          onPress={handleAnalyze}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.analyzeButtonText}>Generate Recommendations</Text>}
        </TouchableOpacity>
        <View style={styles.spacer} />
      </ScrollView>

      {/* SELECTION MODAL */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select {activeField}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.closeText}>Done</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={activeField ? options[activeField] : []}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => updateSelection(activeField, item)}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />

            {(selections[activeField] === 'Other' || (selections[activeField] && !options[activeField]?.includes(selections[activeField]))) && (
              <TextInput
                style={styles.modalInput}
                placeholder="Type your own..."
                value={selections[activeField] === 'Other' ? '' : selections[activeField]}
                onChangeText={(text) => updateSelection(activeField, text)}
                autoFocus
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8', paddingTop: 50 },
  header: { paddingHorizontal: 20, marginBottom: 30 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#1a1a1a' },
  subtitle: { fontSize: 16, color: '#666' },
  section: { paddingHorizontal: 20, marginBottom: 28 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a', marginBottom: 12 },
  buttonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  inlineInput: { marginTop: 10, borderBottomWidth: 1, borderColor: '#ccc', padding: 8, fontSize: 16 },
  pickerTrigger: { backgroundColor: '#fff', padding: 16, borderRadius: 12, flexDirection: 'row', justifyContent: 'space-between', borderWidth: 1, borderColor: '#eee' },
  pickerTriggerText: { fontSize: 16, color: '#1a1a1a' },
  chevron: { color: '#999', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', textTransform: 'capitalize' },
  closeText: { color: '#007AFF', fontWeight: '600' },
  modalOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  modalOptionText: { fontSize: 18 },
  modalInput: { borderBottomWidth: 2, borderBottomColor: '#1a1a1a', paddingVertical: 10, fontSize: 18, marginTop: 10, marginBottom: 20 },
  imageContainer: { alignItems: 'center' },
  image: { width: '100%', height: 350, borderRadius: 12, marginBottom: 12 },
  uploadButton: { backgroundColor: '#fff', paddingVertical: 50, borderRadius: 12, alignItems: 'center', borderStyle: 'dashed', borderWidth: 2, borderColor: '#ccc' },
  uploadButtonText: { color: '#666' },
  changeButton: { backgroundColor: '#333', padding: 10, borderRadius: 8 },
  changeButtonText: { color: '#fff' },
  analyzeButton: { backgroundColor: '#1a1a1a', marginHorizontal: 20, padding: 18, borderRadius: 12, alignItems: 'center' },
  analyzeButtonDisabled: { opacity: 0.6 },
  analyzeButtonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  spacer: { height: 40 },
});

export default OnboardingScreen;