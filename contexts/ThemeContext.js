import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@app_theme_mode';

const lightColors = {
  background: '#FAF9F6',
  surface: '#EAD8C5',
  card: '#FFFFFF',
  text: '#25344F',
  textSecondary: '#6F4D38',
  accent: '#632024',
  accentLight: 'rgba(99, 32, 36, 0.1)',
  border: '#f0f0f0',
  switchTrack: '#D5B893',
  chipBg: '#F5EDE3',
  chipSelected: '#632024',
  chipText: '#6F4D38',
  chipTextSelected: '#FFFFFF',
  headerBg: '#FFFFFF',
  inputBg: '#FFFFFF',
};

const darkColors = {
  background: '#1A1A2E',
  surface: '#25344F',
  card: '#2E2E48',
  text: '#F0E6D8',
  textSecondary: '#A89280',
  accent: '#C4545A',
  accentLight: 'rgba(196, 84, 90, 0.15)',
  border: '#2E2E48',
  switchTrack: '#3D3D5C',
  chipBg: '#2E2E48',
  chipSelected: '#C4545A',
  chipText: '#A89280',
  chipTextSelected: '#FFFFFF',
  headerBg: '#1E1E36',
  inputBg: '#2E2E48',
};

const ThemeContext = createContext({
  theme: lightColors,
  isDark: false,
  toggleTheme: () => {},
  setThemeMode: () => {},
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Load persisted theme on mount
    AsyncStorage.getItem(THEME_KEY).then((val) => {
      if (val === 'dark') setIsDark(true);
    }).catch(() => {});
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  };

  const setThemeMode = (mode) => {
    const dark = mode === 'dark';
    setIsDark(dark);
    AsyncStorage.setItem(THEME_KEY, mode).catch(() => {});
  };

  const value = useMemo(() => ({
    theme: isDark ? darkColors : lightColors,
    isDark,
    toggleTheme,
    setThemeMode,
  }), [isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export default ThemeContext;
