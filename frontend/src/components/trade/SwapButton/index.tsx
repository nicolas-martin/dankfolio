import React from 'react';
import { TouchableRipple, Icon, useTheme } from 'react-native-paper';
import { ICON_SWAP } from '../../../utils/icons';
import { SwapButtonProps } from './swapbutton_types';
import { createStyles } from './swapbutton_styles';

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
