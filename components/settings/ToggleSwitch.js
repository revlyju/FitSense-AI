import React from 'react';
import { View, Text, Switch, StyleSheet, Platform } from 'react-native';

export default function ToggleSwitch({ label, value, onValueChange, theme, description }) {
  return (
    <View style={styles.row}>
      <View style={styles.labelContainer}>
        <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
        {description ? (
          <Text style={[styles.description, { color: theme.textSecondary }]}>{description}</Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.switchTrack, true: theme.accent }}
        thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
        ios_backgroundColor={theme.switchTrack}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  labelContainer: {
    flex: 1,
    marginRight: 16,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  description: {
    fontSize: 12,
    marginTop: 3,
    lineHeight: 16,
  },
});
