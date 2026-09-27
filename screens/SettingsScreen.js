import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { API_BASE_URL } from '../config';
import { useTheme } from '../contexts/ThemeContext';

// Settings components
import DropdownSelector from '../components/settings/DropdownSelector';
import MultiSelectChip from '../components/settings/MultiSelectChip';
import SettingSection from '../components/settings/SettingSection';
import ToggleSwitch from '../components/settings/ToggleSwitch';

// Options data
const STYLE_OPTIONS = ['Casual', 'Minimal', 'Streetwear', 'Formal', 'Bohemian', 'Vintage'];
const FIT_OPTIONS = ['Fitted', 'Relaxed', 'Oversized'];
const COLOR_COMFORT_OPTIONS = ['Neutral', 'Balanced', 'Bold'];
const AVOID_COLORS = ['Neon', 'Pastels', 'Earth Tones', 'Jewel Tones', 'Bright', 'Dark'];
const AVOID_PATTERNS = ['Floral', 'Plaid', 'Animal Print', 'Polka Dots', 'Stripes', 'Abstract'];
const AVOID_FITS = ['Tight', 'Baggy', 'Cropped', 'High-Waisted', 'Low-Rise'];
import useRequireAuth from '../hooks/useRequireAuth';

export default function SettingsScreen({ navigation, route }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { isAuthenticated, userId: authUserId, isVerifying } = useRequireAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState({ name: '', email: '' });

  // Custom Gemini API Key state
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [testingKey, setTestingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState(null);

  // Settings state
  const [settings, setSettings] = useState({
    stylePreferences: { styles: [], fitPreference: '', colorComfort: '' },
    avoid: { colors: [], patterns: [], fits: [] },
    privacy: { blurFace: true, storeImages: false, deleteAfterAnalysis: true },
    notifications: { ootd: true, recommendations: true },
    theme: { mode: 'light' },
    geminiApiKey: '',
  });

  // Debounce timer ref
  const debounceRef = useRef(null);

  useEffect(() => {
    if (authUserId) {
      setUserId(authUserId);
    }
  }, [authUserId]);

  // Fetch settings when userId is available
  useEffect(() => {
    if (!userId) return;
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/user/settings/${userId}`);
        if (res.data.success) {
          setSettings(res.data.settings);
          setProfile(res.data.profile);
          const savedKey = res.data.settings?.geminiApiKey;
          if (savedKey) {
            setApiKeyInput(savedKey);
            await AsyncStorage.setItem('geminiApiKey', savedKey);
          } else {
            const localKey = await AsyncStorage.getItem('geminiApiKey');
            if (localKey) setApiKeyInput(localKey);
          }
        }
      } catch (err) {
        console.error('Failed to fetch settings:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [userId]);

  const handleVerifyApiKey = async () => {
    if (!apiKeyInput.trim()) {
      Alert.alert('Empty Key', 'Please enter a Gemini API Key to verify.');
      return;
    }
    setTestingKey(true);
    setKeyStatus(null);
    try {
      const res = await axios.post(`${API_BASE_URL}/api/verify-gemini-key`, {
        apiKey: apiKeyInput.trim(),
      });
      if (res.data.success) {
        setKeyStatus({ valid: true, message: 'Valid! Verified with Google Gemini.' });
        await handleSaveApiKey(apiKeyInput.trim(), true);
      }
    } catch (e) {
      const msg = e.response?.data?.error || e.message || 'Key verification failed';
      setKeyStatus({ valid: false, message: msg });
    } finally {
      setTestingKey(false);
    }
  };

  const handleSaveApiKey = async (key, silent = false) => {
    const keyToSave = key !== undefined ? key : apiKeyInput.trim();
    try {
      if (keyToSave) {
        await AsyncStorage.setItem('geminiApiKey', keyToSave);
      } else {
        await AsyncStorage.removeItem('geminiApiKey');
      }
      if (userId) {
        await axios.put(`${API_BASE_URL}/user/settings`, {
          userId,
          settings: { geminiApiKey: keyToSave },
        });
      }
      setSettings((prev) => ({ ...prev, geminiApiKey: keyToSave }));
      if (!silent) {
        Alert.alert('Settings Saved', keyToSave ? 'Custom Gemini API Key saved!' : 'Reverted to default server Gemini API Key.');
      }
    } catch (err) {
      console.error('Failed to save API key:', err);
      if (!silent) Alert.alert('Error', 'Failed to save API key settings.');
    }
  };

  const handleClearApiKey = async () => {
    setApiKeyInput('');
    setKeyStatus(null);
    await handleSaveApiKey('', false);
  };

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
          try {
            await AsyncStorage.removeItem('userId');
            await AsyncStorage.removeItem('@latest_analysis');
          } catch (e) {
            console.error('Logout error:', e);
          }
          const rootNav = navigation.getParent() || navigation;
          rootNav.reset({
            index: 0,
            routes: [{ name: 'Login' }],
          });
        },
      },
    ]);
  };

  if (isVerifying || !isAuthenticated || loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          {isVerifying ? 'Verifying security...' : 'Loading settings...'}
        </Text>
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

        {/* 6. Custom Gemini API Key (Optional) */}
        <SettingSection title="Custom Gemini API Key (Optional)" theme={theme}>
          <Text style={[styles.sectionDescription, { color: theme.textSecondary }]}>
            Optionally use your personal Google Gemini API key for image analysis & outfit generation. If left blank, the app uses the server default key.
          </Text>

          <View style={[styles.apiKeyInputWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#fff', borderColor: theme.border }]}>
            <Ionicons name="key-outline" size={18} color={theme.accent} style={{ marginRight: 10 }} />
            <TextInput
              style={[styles.apiKeyInput, { color: theme.text }]}
              placeholder="Paste your Gemini API Key"
              placeholderTextColor={theme.textSecondary}
              value={apiKeyInput}
              onChangeText={(t) => {
                setApiKeyInput(t);
                setKeyStatus(null);
              }}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              onPress={() => setShowApiKey(!showApiKey)}
              style={{ padding: 6 }}
              activeOpacity={0.7}
            >
              <Ionicons
                name={showApiKey ? 'eye-outline' : 'eye-off-outline'}
                size={20}
                color={theme.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {keyStatus && (
            <View style={[
              styles.statusBox,
              {
                backgroundColor: keyStatus.valid ? 'rgba(46, 125, 50, 0.12)' : 'rgba(211, 47, 47, 0.12)',
                borderColor: keyStatus.valid ? '#2e7d32' : '#d32f2f'
              }
            ]}>
              <Ionicons
                name={keyStatus.valid ? 'checkmark-circle' : 'alert-circle'}
                size={18}
                color={keyStatus.valid ? '#2e7d32' : '#d32f2f'}
                style={{ marginRight: 6 }}
              />
              <Text style={[styles.statusText, { color: keyStatus.valid ? '#2e7d32' : '#d32f2f' }]}>
                {keyStatus.message}
              </Text>
            </View>
          )}

          <View style={styles.apiActionsRow}>
            <TouchableOpacity
              style={[styles.apiActionBtn, { backgroundColor: theme.accent }]}
              onPress={handleVerifyApiKey}
              disabled={testingKey}
              activeOpacity={0.8}
            >
              {testingKey ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="shield-checkmark-outline" size={16} color="#fff" style={{ marginRight: 6 }} />
                  <Text style={styles.apiActionBtnText}>Test & Save Key</Text>
                </>
              )}
            </TouchableOpacity>

            {apiKeyInput.trim() !== '' && (
              <TouchableOpacity
                style={[styles.clearBtn, { borderColor: theme.border }]}
                onPress={handleClearApiKey}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={16} color={theme.textSecondary} style={{ marginRight: 4 }} />
                <Text style={[styles.clearBtnText, { color: theme.textSecondary }]}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={[styles.keyHint, { color: theme.textSecondary }]}>
            Tip: You can get a free key from Google AI Studio (aistudio.google.com)
          </Text>
        </SettingSection>

        {/* 7. Theme */}
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
  sectionDescription: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  apiKeyInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  apiKeyInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 2,
  },
  statusBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  apiActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  apiActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  apiActionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  clearBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  keyHint: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
  },
});
