import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';

export default function DropdownSelector({ label, options, selected, onSelect, theme }) {
  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: theme.textSecondary }]}>{label}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.optionsRow}
      >
        {options.map((option) => {
          const isSelected = selected === option;
          return (
            <TouchableOpacity
              key={option}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? theme.chipSelected : theme.chipBg,
                  borderColor: isSelected ? theme.chipSelected : theme.border,
                },
              ]}
              onPress={() => onSelect(option)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: isSelected ? theme.chipTextSelected : theme.chipText },
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
