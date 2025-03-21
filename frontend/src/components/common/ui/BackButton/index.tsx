import React from 'react';
import { TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { BackButtonProps } from './types';
import { styles } from './styles';

const BackButton: React.FC<BackButtonProps> = ({ style }) => {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      style={[styles.backButton, style]}
      onPress={() => navigation.goBack()}
    >
      <Ionicons name="arrow-back" size={24} color="#fff" />
    </TouchableOpacity>
  );
};

export default BackButton; 