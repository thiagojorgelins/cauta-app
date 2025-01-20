import React from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import { ButtonCustomProps } from '@/types/ButtonProps';

export default function ButtonCustom({ title, color = '#007BFF', onPress, style }: ButtonCustomProps) {
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: color }, style]}
      onPress={onPress}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
