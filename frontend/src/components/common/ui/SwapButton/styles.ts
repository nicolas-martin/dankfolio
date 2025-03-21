import { StyleSheet } from 'react-native';
import { theme } from '../../../../utils/theme';

export const styles = StyleSheet.create({
  swapButton: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: theme.borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginVertical: -theme.spacing.sm,
    zIndex: 1,
  },
  disabled: {
    opacity: 0.5,
  },
}); 