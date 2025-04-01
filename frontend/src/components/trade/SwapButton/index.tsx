import React from 'react';
import { StyleSheet } from 'react-native';
import { TouchableRipple, Icon, useTheme } from 'react-native-paper';
import { ICON_SWAP } from '../../../utils/icons';
import { SwapButtonProps } from './swapbutton_types';

const SwapButton: React.FC<SwapButtonProps> = ({ onPress }) => {
  const theme = useTheme();
  const styles = createStyles(theme);
  return (
    <TouchableRipple
      onPress={onPress}
      style={[styles.button, { backgroundColor: theme.colors.surfaceVariant }]}
      borderless={true}
      rippleColor={theme.colors.surface} // Approximation for $background on press
    >
      <Icon
        source={ICON_SWAP}
        size={24}
        color={theme.colors.onSurface}
      />
    </TouchableRipple>
  );
};

export default SwapButton;

const createStyles = (theme: any) => StyleSheet.create({
  button: {
    alignSelf: 'center',
    padding: 12, // p="$3"
    marginVertical: 8, // my="$2"
    borderRadius: 999, // rounded="$full"
  },
});
