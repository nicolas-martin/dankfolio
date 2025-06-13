import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
  const theme = useTheme() as AppTheme;

  return useMemo(() => {
    return StyleSheet.create({
      container: {
        flexDirection: 'row',
        alignItems: 'center',
      },
      icon: {
        // Styles for CachedImage or Icon component can be passed via props if needed
        // marginRight: theme.spacing.md, // Default spacing
      },
      textContainer: {
        flexDirection: 'column',
        justifyContent: 'center',
        marginLeft: theme.spacing.md, // Default spacing if icon is present
      },
      primaryText: {
        fontSize: theme.typography.fontSize.base,
        fontWeight: '600',
        color: theme.colors.onSurface,
      },
      secondaryText: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.onSurfaceVariant,
        marginTop: 2, // Small spacing between primary and secondary text
      },
    });
  }, [theme]);
};
