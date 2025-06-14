import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export type VerificationStatus = 'valid' | 'invalid' | 'checking' | 'warning' | 'idle';


export const useStyles = () => {
  const theme = useTheme() as AppTheme;

  return useMemo(() => {
    const baseCardStyle = {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.xl,
      marginBottom: theme.spacing.lg,
      borderLeftWidth: theme.spacing.xs,
    };

    return StyleSheet.create({
      cardChecking: {
        ...baseCardStyle,
        borderLeftColor: theme.colors.tertiary, // Or a specific color for checking
      },
      cardIdle: {
        ...baseCardStyle,
        borderLeftColor: theme.colors.outlineVariant, // Default/idle color
      },
      cardInvalid: {
        ...baseCardStyle,
        borderLeftColor: theme.colors.error,
      },
      cardValid: {
        ...baseCardStyle,
        borderLeftColor: theme.colors.primary, // Or a success color like theme.success
      },
      cardWarning: {
        ...baseCardStyle,
        borderLeftColor: theme.colors.warning, // Assuming theme has a warning color
      },
      header: {
        alignItems: 'center',
        flexDirection: 'row',
        marginBottom: theme.spacing.md,
      },
      iconContainer: {
        marginRight: theme.spacing.md,
      },
      message: {
        color: theme.colors.onSurfaceVariant,
        fontSize: theme.typography.fontSize.sm,
        lineHeight: theme.typography.fontSize.base * 1.4,
      },
      textChecking: { color: theme.colors.tertiary },
      textInvalid: { color: theme.colors.error },
      textValid: { color: theme.colors.primary },
      textWarning: { color: theme.colors.warning }, // Define if not inheriting well
      title: {
        color: theme.colors.onSurface,
        fontSize: theme.typography.fontSize.base,
        fontWeight: '600',
      },
    });
  }, [theme]);
};
