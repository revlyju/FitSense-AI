import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SettingSection({ title, children, theme }) {
  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      {title ? (
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
});
