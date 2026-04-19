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
import axios from 'axios';

const COLORS_TO_TEST = ['#transparent', '#FFB6C1', '#87CEFA', '#98FB98', '#FFD700', '#DDA0DD', '#F08080'];

export default function OutfitDetailsModal({ 
  visible, 
  onClose, 
  outfit, 
  isLiked, 
  onToggleLike 
}) {
  const [selectedColor, setSelectedColor] = useState('#transparent');

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

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalBackground}>
        <View style={styles.modalContainer}>
          
          {/* Header Controls */}
          <View style={styles.headerRow}>
             <TouchableOpacity style={styles.iconButton} onPress={onToggleLike}>
                 <Ionicons 
                    name={isLiked ? "heart" : "heart-outline"} 
                    size={28} 
                    color={isLiked ? "#632024" : "#25344F"} 
                 />
             </TouchableOpacity>
             <TouchableOpacity style={styles.iconButton} onPress={onClose}>
                 <Ionicons name="close" size={28} color="#25344F" />
             </TouchableOpacity>
          </View>

          {/* Image Viewer */}
          <View style={styles.imageWrapper}>
            <Image 
                source={{ uri: imageUri }}
                style={styles.largeImage}
                resizeMode="cover"
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
             <Text style={styles.title}>{outfit.type ? outfit.type.toUpperCase() : 'AI OUTFIT'}</Text>
             {outfit.category && <Text style={styles.subtitle}>Category: {outfit.category}</Text>}
             
             {/* Hue Adjuster */}
             <Text style={styles.pickerTitle}>🎨 Color Simulation Preview</Text>
             <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroller}>
                {COLORS_TO_TEST.map((hex, idx) => (
                    <TouchableOpacity 
                       key={idx}
                       onPress={() => setSelectedColor(hex)}
                       style={[
                           styles.colorCircle, 
                           { backgroundColor: hex === '#transparent' ? '#fff' : hex },
                           selectedColor === hex && styles.selectedColorRing,
                           hex === '#transparent' && styles.transparentCircle
                       ]}
                    >
                       {hex === '#transparent' && <Text style={styles.noneText}>None</Text>}
                    </TouchableOpacity>
                ))}
             </ScrollView>

             <Text style={styles.descriptionText}>
                {outfit.matchReasons || outfit.description || 'This outfit matches your style tags and color profile perfectly.'}
             </Text>
          </ScrollView>

          {/* Shop Footer */}
          <View style={styles.footer}>
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
      backgroundColor: '#FAF9F6',
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
      backgroundColor: 'rgba(255,255,255,0.85)',
      borderRadius: 20,
      padding: 8,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      elevation: 4
  },
  imageWrapper: {
      width: '100%',
      height: '55%',
      backgroundColor: '#f0f0f0',
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
      color: '#25344F',
      marginBottom: 4
  },
  subtitle: {
      fontSize: 16,
      color: '#6F4D38',
      marginBottom: 20
  },
  pickerTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#25344F',
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
      color: '#666'
  },
  selectedColorRing: {
      borderWidth: 3,
      borderColor: '#25344F'
  },
  descriptionText: {
      fontSize: 15,
      color: '#444',
      lineHeight: 22,
      marginBottom: 30
  },
  footer: {
      padding: 20,
      paddingBottom: 40,
      backgroundColor: '#fff',
      borderTopWidth: 1,
      borderColor: '#eee'
  },
  shopButton: {
      backgroundColor: '#25344F',
      flexDirection: 'row',
      paddingVertical: 15,
      justifyContent: 'center',
      alignItems: 'center',
      borderRadius: 12
  },
  shopButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '700'
  }
});
