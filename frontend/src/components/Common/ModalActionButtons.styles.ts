import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
  const theme = useTheme() as AppTheme;

  return useMemo(() => {
    return StyleSheet.create({
      button: {
        borderRadius: theme.borderRadius.lg, // Standard button border radius
        flex: 1, // Allow buttons to grow if needed, or set specific widths
        paddingVertical: theme.spacing.xs, // Standard button padding
      },
      buttonContainer: {
        flexDirection: 'row',
        gap: theme.spacing.md, // Spacing between buttons
        justifyContent: 'flex-end', // Default to right-align, common for dialogs
        paddingTop: theme.spacing.md,
      },
      primaryButtonLabel: {
        fontSize: theme.typography.fontSize.base,
        fontWeight: '600',
        // color: theme.colors.onPrimary // This will be set by Button's mode="contained"
      },
      secondaryButton: {
        // borderColor: theme.colors.outline, // For outlined
        // color: theme.colors.primary // For text buttons
      },
      secondaryButtonLabel: {
        fontSize: theme.typography.fontSize.base,
        fontWeight: '600',
        // color: theme.colors.primary // For text/outlined buttons
      },
    });
  }, [theme]);
};
