import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { AppTheme } from '@/utils/theme';

export const useStyles = () => {
  const theme = useTheme<AppTheme>();

  const createPlaceholderStyle = (size: number, borderRadius: number) => [
    {
      backgroundColor: theme.colors.surfaceVariant,
    },
    {
      width: size,
      height: size,
      borderRadius: borderRadius
    }
  ];

  const createImageStyle = (size: number, borderRadius: number, style?: any) => [
    {
      width: size,
      height: size,
      borderRadius: borderRadius
    },
    style
  ].filter(Boolean);

  const styles = StyleSheet.create({
    placeholder: {
      backgroundColor: theme.colors.surfaceVariant, // Use a themed color
    },
    // Add any other styles for CachedImage if they were defined locally
    // and need to be part of the useStyles hook.
    // For now, only 'placeholder' is being moved from the original local StyleSheet.
  });

  return {
    ...styles,
    createPlaceholderStyle,
    createImageStyle
  };
};
