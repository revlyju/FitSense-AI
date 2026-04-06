import { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export default function UploadScreen({ navigation, route }) {
  const [imageUri, setImageUri] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const userPreferences = route?.params?.userPreferences || {};
  
  const isNight = userPreferences.timeOfDay === "Night";

  const theme = {
    bg: isNight ? "#25344F" : "#D5B893",
    card: isNight ? "#617891" : "#ffffff",
    selected: isNight ? "#632024" : "#632024",
    text: isNight ? "#D5B893" : "#25344F",
    subText: isNight ? "#cbb89a" : "#6F4D38",
  };

  const pickImage = async () => {
    try {
      // Request permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Permission required',
          'Please allow access to your photos to upload an image.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => ImagePicker.requestMediaLibraryPermissionsAsync() }
          ]
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        allowsEditing: true,
        aspect: [9, 16],
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setImageUri(asset.uri);
        setImageBase64(asset.base64 || null);
      }
    } catch (error) {
      console.error('Image picker error:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const handleContinue = () => {
    if (!imageUri || !imageBase64) {
      Alert.alert('Please upload an image');
      return;
    }

    navigation.navigate('Loading', {
      userPreferences: {
        ...userPreferences,
        image: `data:image/jpeg;base64,${imageBase64}`,
      },
    });
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={{ paddingHorizontal: 20 }}>

        {/* TITLE */}
        <View style={{ marginTop: 40, marginBottom: 20 }}>
          <Text style={[styles.title, { color: theme.text }]}>Upload your photo</Text>
          <Text style={[styles.subtitle, { color: theme.subText }]}>
            Let us analyze your look and suggest outfits
          </Text>
        </View>

        {/* IMAGE AREA */}
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.preview} />

            <TouchableOpacity style={styles.changeBtn} onPress={pickImage}>
              <Text style={styles.changeText}>Change Photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={[styles.uploadBox, { borderColor: theme.subText }]} onPress={pickImage}>
            <Text style={[styles.uploadText, { color: theme.subText }]}>Tap to upload image</Text>
          </TouchableOpacity>
        )}

        {/* CONTINUE */}
        <TouchableOpacity
          style={[
            styles.continueButton,
            { backgroundColor: theme.selected },
            !imageUri && styles.disabledButton,
          ]}
          onPress={handleContinue}
        >
          <Text style={styles.continueButtonText}>
            Generate Outfit
          </Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#D5B893',
  },

  title: {
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    color: '#25344F',
  },

  subtitle: {
    textAlign: 'center',
    marginTop: 6,
    color: '#6F4D38',
  },

  uploadBox: {
    marginTop: 30,
    height: 280,
    borderRadius: 16,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#6F4D38',
    justifyContent: 'center',
    alignItems: 'center',
  },

  uploadText: {
    color: '#6F4D38',
  },

  imageContainer: {
    marginTop: 20,
    alignItems: 'center',
  },

  preview: {
    width: '100%',
    height: 320,
    borderRadius: 16,
  },

  changeBtn: {
    marginTop: 10,
    backgroundColor: '#25344F',
    padding: 10,
    borderRadius: 8,
  },

  changeText: {
    color: '#fff',
  },

  continueButton: {
    marginTop: 40,
    backgroundColor: '#632024',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  continueButtonText: {
    color: '#fff',
    fontWeight: '600',
  },

  disabledButton: {
    opacity: 0.5,
  },
});