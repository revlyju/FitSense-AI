import React, { useRef } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

const DOUBLE_TAP_DELAY_MS = 275;

const SelectionButton = ({
  label,
  isSelected,
  onPress,
  onDoubleTap,
  width = '100%',
}) => {
  const lastTapMsRef = useRef(0);

  const handlePress = () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapMsRef.current;

    if (timeSinceLastTap > 0 && timeSinceLastTap < DOUBLE_TAP_DELAY_MS) {
      lastTapMsRef.current = 0;
      onDoubleTap?.();
      return;
    }

    lastTapMsRef.current = now;
    onPress?.();
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        isSelected && styles.buttonSelected,
        { width },
      ]}
      onPress={handlePress}
    >
      <Text
        style={[
          styles.buttonText,
          isSelected && styles.buttonTextSelected,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSelected: {
    backgroundColor: '#1a1a1a',
    borderColor: '#1a1a1a',
  },
  buttonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  buttonTextSelected: {
    color: '#fff',
  },
});

export default SelectionButton;
