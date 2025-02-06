import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { TermsModal } from "./TermsModal";

interface TermsRadioButtonProps {
  selected: boolean;
  onPress?: (selected: boolean) => void;
  style?: any;
}

export default function TermsRadioButton({ onPress, style }: TermsRadioButtonProps) {
  const [selected, setSelected] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  const handlePress = () => {
    const newValue = !selected;
    setSelected(newValue);
    if (onPress) {
      onPress(newValue);
    }
  }
  
  const handleTextPress = () => {
    setModalVisible(true);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handlePress} style={styles.radioContainer}>
        <View style={[styles.buttonRadio, style]}>
          {selected && <View style={styles.buttonStatus} />}
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity onPress={handleTextPress}>
        <Text style={styles.termsText}>
          Li e estou de acordo com os Termos de Uso e Política de Privacidade
        </Text>
      </TouchableOpacity>

      <TermsModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 10,
    maxWidth: '95%',
    flexDirection: 'row',
  },
  radioContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  buttonRadio: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  buttonStatus: {
    height: 16,
    width: 16,
    borderRadius: 12,
    backgroundColor: '#000',
  },
  termsText: {
    textDecorationLine: 'underline',
    color: '#000',
  },
});