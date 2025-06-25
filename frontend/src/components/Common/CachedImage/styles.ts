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

  const createImageStyle = (size: number, borderRadius: number, style?: object) => [
    {
      width: size,
      height: size,
      borderRadius: borderRadius
    },
    style
  ].filter(Boolean);

  const createContainerStyle = (size: number) => ({
    width: size,
    height: size,
    position: 'relative' as const
  });

  const styles = StyleSheet.create({
    hiddenImage: {
      opacity: 0,
      position: 'absolute' as const
    },
    placeholder: {
      backgroundColor: theme.colors.surfaceVariant, // Use a themed color
    }
  });

  return {
    ...styles,
    createPlaceholderStyle,
    createImageStyle,
    createContainerStyle
  };
};
