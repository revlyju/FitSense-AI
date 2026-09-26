import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Linking,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { API_BASE_URL } from '../config';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../contexts/ThemeContext';

const COLORS_TO_TEST = ['#transparent', '#FFB6C1', '#87CEFA', '#98FB98', '#FFD700', '#DDA0DD', '#F08080'];

export default function OutfitDetailsModal({ 
  visible, 
  onClose, 
  outfit, 
  isLiked, 
  onToggleLike 
}) {
  const [selectedColor, setSelectedColor] = useState('#transparent');
  const navigation = useNavigation();
  const { theme, isDark } = useTheme();

  if (!outfit) return null;

  // Determine Image URI
  const rawUrl = outfit.imageUrl || outfit.image;
  let imageUri = 'https://via.placeholder.com/400x500';
  if (rawUrl) {
      if (rawUrl.startsWith('http')) {
          imageUri = rawUrl;
      } else {
          const cleanUrl = rawUrl.startsWith('/') ? rawUrl : `/${rawUrl}`;
          imageUri = `${API_BASE_URL}${cleanUrl}`;
      }
  }

  const handleShopPress = () => {
      Linking.openURL(outfit.link || 'https://example.com/shop').catch(() => {
          Alert.alert('Error', 'Could not open the shop link');
      });
  };

  const handleVirtualTryon = () => {
      onClose(); // Close the modal first
      // Navigate to VirtualTryon tab with the outfit image pre-loaded
      navigation.navigate('Main', { screen: 'VirtualTryon', params: { garmentImageUri: imageUri } });
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          
          {/* Header Controls */}
          <View style={styles.headerRow}>
             <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(30,30,54,0.85)' : 'rgba(255,255,255,0.85)' }]} onPress={onToggleLike}>
                 <Ionicons 
                    name={isLiked ? "heart" : "heart-outline"} 
                    size={28} 
                    color={isLiked ? theme.accent : theme.text} 
                 />
             </TouchableOpacity>
             <TouchableOpacity style={[styles.iconButton, { backgroundColor: isDark ? 'rgba(30,30,54,0.85)' : 'rgba(255,255,255,0.85)' }]} onPress={onClose}>
                 <Ionicons name="close" size={28} color={theme.text} />
             </TouchableOpacity>
          </View>

          {/* Image Viewer */}
          <View style={[styles.imageWrapper, { backgroundColor: isDark ? '#2E2E48' : '#f0f0f0' }]}>
            <Image 
                source={{ uri: imageUri }}
                style={styles.largeImage}
                resizeMode="contain"
            />
            {/* Color Overlay Simulation */}
            {selectedColor !== '#transparent' && (
                <View style={[
                  StyleSheet.absoluteFillObject, 
                  { backgroundColor: selectedColor, opacity: 0.25 }
                ]} pointerEvents="none" />
            )}
          </View>

          {/* Details Scroll */}
          <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
             <Text style={[styles.title, { color: theme.text }]}>{outfit.type ? outfit.type.toUpperCase() : 'AI OUTFIT'}</Text>
             {outfit.category && <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Category: {outfit.category}</Text>}
             
             {/* Hue Adjuster */}
             <Text style={[styles.pickerTitle, { color: theme.text }]}>🎨 Color Simulation Preview</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroller}>
                {COLORS_TO_TEST.map((hex, idx) => (
                    <TouchableOpacity 
                       key={idx}
                       onPress={() => setSelectedColor(hex)}
                       style={[
                           styles.colorCircle, 
                           { backgroundColor: hex === '#transparent' ? (isDark ? '#2E2E48' : '#fff') : hex },
                           selectedColor === hex && { borderColor: theme.accent, borderWidth: 3 },
                           hex === '#transparent' && styles.transparentCircle
                       ]}
                    >
                       {hex === '#transparent' && <Text style={[styles.noneText, { color: theme.textSecondary }]}>None</Text>}
                    </TouchableOpacity>
                ))}
             </ScrollView>

             <Text style={[styles.descriptionText, { color: theme.textSecondary }]}>
                {outfit.matchReasons || outfit.description || 'This outfit matches your style tags and color profile perfectly.'}
             </Text>
          </ScrollView>

          {/* Footer with Virtual Try-On + Shop */}
          <View style={[styles.footer, { backgroundColor: theme.card, borderColor: theme.border }]}>
             <TouchableOpacity style={[styles.tryonButton, { backgroundColor: theme.accent }]} onPress={handleVirtualTryon}>
                 <Ionicons name="body-outline" size={20} color="#fff" style={{marginRight: 8}} />
                 <Text style={styles.shopButtonText}>Virtual Try-On</Text>
             </TouchableOpacity>
             <TouchableOpacity style={styles.shopButton} onPress={handleShopPress}>
                 <Ionicons name="cart" size={20} color="#fff" style={{marginRight: 8}} />
                 <Text style={styles.shopButtonText}>Shop This Look</Text>
             </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.6)',
      justifyContent: 'flex-end'
  },
  modalContainer: {
      height: '92%',
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      overflow: 'hidden'
  },
  headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      position: 'absolute',
      top: 15,
      left: 15,
      right: 15,
      zIndex: 10
  },
  iconButton: {
      borderRadius: 20,
      padding: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      elevation: 4
  },
  imageWrapper: {
      width: '100%',
      height: '50%',
      position: 'relative'
  },
  largeImage: {
      width: '100%',
      height: '100%'
  },
  detailsScroll: {
      flex: 1,
      padding: 20
  },
  title: {
      fontSize: 22,
      fontWeight: '800',
      marginBottom: 4
  },
  subtitle: {
      fontSize: 16,
      marginBottom: 20
  },
  pickerTitle: {
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 10
  },
  colorScroller: {
      marginBottom: 20,
      flexDirection: 'row'
  },
  colorCircle: {
      width: 40,
      height: 40,
      borderRadius: 20,
      marginRight: 12,
      borderWidth: 1,
      borderColor: '#ddd',
      justifyContent: 'center',
      alignItems: 'center'
  },
  transparentCircle: {
      borderWidth: 1,
      borderColor: '#ccc',
      borderStyle: 'dashed'
  },
  noneText: {
      fontSize: 10,
  },
  descriptionText: {
      fontSize: 15,
      lineHeight: 22,
      marginBottom: 30
  },
  footer: {
      padding: 16,
      paddingBottom: 36,
      borderTopWidth: 1,
      flexDirection: 'row',
      gap: 10,
  },
  tryonButton: {
      flex: 1,
      flexDirection: 'row',
      paddingVertical: 15,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12
  },
  shopButton: {
      flex: 1,
      backgroundColor: '#25344F',
      flexDirection: 'row',
      paddingVertical: 15,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12
  },
  shopButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700'
  }
});
