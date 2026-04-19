import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, StatusBar
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useTheme } from '../contexts/ThemeContext';

// Settings components
import SettingSection from '../components/settings/SettingSection';
import ToggleSwitch from '../components/settings/ToggleSwitch';
import MultiSelectChip from '../components/settings/MultiSelectChip';
import DropdownSelector from '../components/settings/DropdownSelector';

// Options data
const STYLE_OPTIONS = ['Casual', 'Minimal', 'Streetwear', 'Formal', 'Bohemian', 'Vintage'];
const FIT_OPTIONS = ['Fitted', 'Relaxed', 'Oversized'];
const COLOR_COMFORT_OPTIONS = ['Neutral', 'Balanced', 'Bold'];
const AVOID_COLORS = ['Neon', 'Pastels', 'Earth Tones', 'Jewel Tones', 'Bright', 'Dark'];
const AVOID_PATTERNS = ['Floral', 'Plaid', 'Animal Print', 'Polka Dots', 'Stripes', 'Abstract'];
const AVOID_FITS = ['Tight', 'Baggy', 'Cropped', 'High-Waisted', 'Low-Rise'];

export default function SettingsScreen({ navigation, route }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState({ name: '', email: '' });

  // Settings state
  const [settings, setSettings] = useState({
    stylePreferences: { styles: [], fitPreference: '', colorComfort: '' },
    avoid: { colors: [], patterns: [], fits: [] },
    privacy: { blurFace: true, storeImages: false, deleteAfterAnalysis: true },
    notifications: { ootd: true, recommendations: true },
    theme: { mode: 'light' },
  });

  // Debounce timer ref
  const debounceRef = useRef(null);

  // Get userId on mount
  useEffect(() => {
    const loadUserId = async () => {
      const id = route?.params?.userId || await AsyncStorage.getItem('userId');
      setUserId(id);
    };
    loadUserId();
  }, []);

  // Fetch settings when userId is available
  useEffect(() => {
    if (!userId) return;
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/user/settings/${userId}`);
        if (res.data.success) {
          setSettings(res.data.settings);
          setProfile(res.data.profile);
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [userId]);

  // Debounced save to backend
  const saveSettings = useCallback((updatedSettings) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      if (!userId) return;
      setSaving(true);
      try {
        await axios.put(`${API_BASE_URL}/user/settings`, {
          userId,
          settings: updatedSettings,
        });
      } catch (err) {
        console.error('Failed to save settings:', err);
      } finally {
        setSaving(false);
      }
    }, 800);
  }, [userId]);

  // Generic updater: updates local state immediately + schedules backend sync
  const updateSettings = (section, field, value) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        [section]: {
          ...prev[section],
          [field]: value,
        },
      };
      saveSettings({ [section]: { [field]: value } });
      return updated;
    });
  };

  // Multi-select toggle helper
  const toggleMultiSelect = (section, field, option) => {
    const current = settings[section][field] || [];
    const updated = current.includes(option)
      ? current.filter((v) => v !== option)
      : [...current, option];
    updateSettings(section, field, updated);
  };

  // Theme toggle handler
  const handleThemeToggle = () => {
    const newMode = isDark ? 'light' : 'dark';
    toggleTheme();
    updateSettings('theme', 'mode', newMode);
  };

  // Logout handler
  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await AsyncStorage.removeItem('userId');
          navigation.replace('Auth');
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.headerBg, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.toggleDrawer()} style={styles.menuButton}>
          <Ionicons name="menu-outline" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Settings</Text>
        {saving && (
          <View style={styles.savingBadge}>
            <ActivityIndicator size="small" color={theme.accent} />
            <Text style={[styles.savingText, { color: theme.textSecondary }]}>Saving...</Text>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Account & Profile */}
        <SettingSection title="Account & Profile" theme={theme}>
          <View style={styles.profileRow}>
            <View style={[styles.avatar, { backgroundColor: theme.accent }]}>
              <Text style={styles.avatarText}>
                {profile.name ? profile.name[0].toUpperCase() : 'U'}
              </Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.profileName, { color: theme.text }]}>{profile.name}</Text>
              <Text style={[styles.profileEmail, { color: theme.textSecondary }]}>{profile.email}</Text>
            </View>
          </View>

          <View style={styles.profileActions}>
            <TouchableOpacity
              style={[styles.profileButton, { backgroundColor: theme.accentLight }]}
              onPress={() => navigation.navigate('Onboarding', { userId })}
              activeOpacity={0.7}
            >
              <Ionicons name="create-outline" size={18} color={theme.accent} />
              <Text style={[styles.profileButtonText, { color: theme.accent }]}>Edit Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.profileButton, { backgroundColor: 'rgba(220, 53, 69, 0.1)' }]}
              onPress={handleLogout}
              activeOpacity={0.7}
            >
              <Ionicons name="log-out-outline" size={18} color="#DC3545" />
              <Text style={[styles.profileButtonText, { color: '#DC3545' }]}>Logout</Text>
            </TouchableOpacity>
          </View>
        </SettingSection>

        {/* 2. Style Preferences */}
        <SettingSection title="Style Preferences" theme={theme}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>PREFERRED STYLES</Text>
          <MultiSelectChip
            options={STYLE_OPTIONS}
            selected={settings.stylePreferences.styles}
            onToggle={(opt) => toggleMultiSelect('stylePreferences', 'styles', opt)}
            theme={theme}
          />

          <DropdownSelector
            label="Fit Preference"
            options={FIT_OPTIONS}
            selected={settings.stylePreferences.fitPreference}
            onSelect={(val) => updateSettings('stylePreferences', 'fitPreference', val)}
            theme={theme}
          />

          <DropdownSelector
            label="Color Comfort"
            options={COLOR_COMFORT_OPTIONS}
            selected={settings.stylePreferences.colorComfort}
            onSelect={(val) => updateSettings('stylePreferences', 'colorComfort', val)}
            theme={theme}
          />
        </SettingSection>

        {/* 3. Avoid These */}
        <SettingSection title="Avoid These" theme={theme}>
          <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>COLORS</Text>
          <MultiSelectChip
            options={AVOID_COLORS}
            selected={settings.avoid.colors}
            onToggle={(opt) => toggleMultiSelect('avoid', 'colors', opt)}
            theme={theme}
          />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 18 }]}>PATTERNS</Text>
          <MultiSelectChip
            options={AVOID_PATTERNS}
            selected={settings.avoid.patterns}
            onToggle={(opt) => toggleMultiSelect('avoid', 'patterns', opt)}
            theme={theme}
          />

          <Text style={[styles.fieldLabel, { color: theme.textSecondary, marginTop: 18 }]}>FITS</Text>
          <MultiSelectChip
            options={AVOID_FITS}
            selected={settings.avoid.fits}
            onToggle={(opt) => toggleMultiSelect('avoid', 'fits', opt)}
            theme={theme}
          />
        </SettingSection>

        {/* 4. Privacy Settings */}
        <SettingSection title="Privacy" theme={theme}>
          <ToggleSwitch
            label="Blur face before AI processing"
            description="Your face will be blurred before being sent to AI models"
            value={settings.privacy.blurFace}
            onValueChange={(val) => updateSettings('privacy', 'blurFace', val)}
            theme={theme}
          />
          <ToggleSwitch
            label="Store uploaded images"
            description="Keep your photos saved on our servers"
            value={settings.privacy.storeImages}
            onValueChange={(val) => updateSettings('privacy', 'storeImages', val)}
            theme={theme}
          />
          <ToggleSwitch
            label="Delete images after analysis"
            description="Automatically remove photos once analysis is complete"
            value={settings.privacy.deleteAfterAnalysis}
            onValueChange={(val) => updateSettings('privacy', 'deleteAfterAnalysis', val)}
            theme={theme}
          />
        </SettingSection>

        {/* 5. Notifications */}
        <SettingSection title="Notifications" theme={theme}>
          <ToggleSwitch
            label="Outfit of the Day"
            description="Get daily outfit recommendations"
            value={settings.notifications.ootd}
            onValueChange={(val) => updateSettings('notifications', 'ootd', val)}
            theme={theme}
          />
          <ToggleSwitch
            label="New Recommendations"
            description="Be notified when new styles match your profile"
            value={settings.notifications.recommendations}
            onValueChange={(val) => updateSettings('notifications', 'recommendations', val)}
            theme={theme}
          />
        </SettingSection>

        {/* 6. Theme */}
        <SettingSection title="Appearance" theme={theme}>
          <ToggleSwitch
            label="Dark Mode"
            description={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            value={isDark}
            onValueChange={handleThemeToggle}
            theme={theme}
          />
          <View style={[styles.themePreview, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <View style={styles.themePreviewRow}>
              <Ionicons
                name={isDark ? 'moon' : 'sunny'}
                size={20}
                color={isDark ? '#C4545A' : '#FFB347'}
              />
              <Text style={[styles.themePreviewText, { color: theme.textSecondary }]}>
                {isDark ? 'Dark mode is active' : 'Light mode is active'}
              </Text>
            </View>
          </View>
        </SettingSection>

        {/* Bottom spacing */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  menuButton: {
    marginRight: 15,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  savingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  savingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },

  // Account & Profile
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  profileInfo: {
    marginLeft: 16,
    flex: 1,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileEmail: {
    fontSize: 14,
    marginTop: 3,
  },
  profileActions: {
    flexDirection: 'row',
    gap: 12,
  },
  profileButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 8,
  },
  profileButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Field labels
  fieldLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 8,
  },

  // Theme preview
  themePreview: {
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  themePreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  themePreviewText: {
    fontSize: 13,
    fontWeight: '500',
  },
});
