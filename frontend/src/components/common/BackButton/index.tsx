import React from 'react';
import { StyleSheet } from 'react-native';
import { TouchableRipple, Icon, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { ICON_BACK } from '../../../utils/icons';
import { BackButtonProps } from './backbutton_types';

const BackButton: React.FC<BackButtonProps> = () => {
  const navigation = useNavigation();
  const theme = useTheme();

  return (
    <TouchableRipple
      onPress={() => navigation.goBack()}
      style={styles.button}
      borderless={true} // Makes the ripple circular
      rippleColor={theme.colors.surfaceVariant} // Approximation for $backgroundDark on press
    >
      <Icon
        source={ICON_BACK}
        size={24}
        color={theme.colors.onSurface} // Map $text to onSurface
      />
    </TouchableRipple>
  );
};

export default BackButton;

const styles = StyleSheet.create({
  button: {
    padding: 8, // $2
    borderRadius: 999, // $full
    // Center the icon within the ripple container
    alignItems: 'center',
    justifyContent: 'center',
    width: 40, // Ensure consistent touch target size
    height: 40,
  },
});
