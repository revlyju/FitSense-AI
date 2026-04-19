import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

export default function MultiSelectChip({ options, selected, onToggle, theme }) {
  return (
    <View style={styles.container}>
      {options.map((option) => {
        const isSelected = selected.includes(option);
        return (
          <TouchableOpacity
            key={option}
            style={[
              styles.chip,
              {
                backgroundColor: isSelected ? theme.chipSelected : theme.chipBg,
                borderColor: isSelected ? theme.chipSelected : theme.border,
              },
            ]}
            onPress={() => onToggle(option)}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.chipText,
                { color: isSelected ? theme.chipTextSelected : theme.chipText },
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
