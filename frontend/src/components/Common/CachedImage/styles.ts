import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { AppTheme } from '@/utils/theme';

export const useStyles = () => {
  const theme = useTheme<AppTheme>();

  return StyleSheet.create({
    placeholder: {
      backgroundColor: theme.colors.surfaceVariant, // Use a themed color
    },
    // Add any other styles for CachedImage if they were defined locally
    // and need to be part of the useStyles hook.
    // For now, only 'placeholder' is being moved from the original local StyleSheet.
  });
};
