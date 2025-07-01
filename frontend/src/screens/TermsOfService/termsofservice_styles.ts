import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
  const theme = useTheme() as AppTheme;
  return useMemo(() => {
    const styles = StyleSheet.create({
      acceptButton: {
        alignItems: 'center',
        borderRadius: theme.borderRadius.md,
        margin: theme.spacing.lg,
        padding: theme.spacing.lg,
      },
      acceptButtonDisabled: {
        backgroundColor: theme.colors.surface,
        opacity: 0.5,
      },
      acceptButtonEnabled: {
        backgroundColor: theme.colors.primary,
      },
      acceptButtonText: {
        color: theme.colors.onPrimary,
        fontSize: 18,
        fontWeight: 'bold',
      },
      checkbox: {
        alignItems: 'center',
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
        borderRadius: theme.borderRadius.sm,
        borderWidth: 2,
        height: 24,
        justifyContent: 'center',
        marginRight: theme.spacing.md,
        width: 24,
      },
      checkboxContainer: {
        alignItems: 'center',
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        flexDirection: 'row',
        margin: theme.spacing.md,
        padding: theme.spacing.lg,
      },
      checkboxText: {
        color: theme.colors.onSurface,
        flex: 1,
        fontSize: 16,
      },
      container: {
        backgroundColor: theme.colors.background,
        flex: 1,
      },
      contentContainer: {
        padding: theme.spacing.lg,
      },
      flex: {
        flex: 1,
      },
      header: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing.md,
      },
      lastUpdated: {
        color: theme.colors.onSurfaceVariant,
        fontSize: 14,
        marginBottom: theme.spacing.lg,
        textAlign: 'center',
      },
      sectionContent: {
        color: theme.colors.onSurfaceVariant,
        fontSize: 16,
        lineHeight: 24,
        marginBottom: theme.spacing.md,
      },
      sectionTitle: {
        color: theme.colors.onSurface,
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: theme.spacing.md,
        marginTop: theme.spacing.lg,
      },
      title: {
        color: theme.colors.onSurface,
        fontSize: 20,
        fontWeight: 'bold',
      },
    });
    return { ...styles, theme, colors: theme.colors };
  }, [theme]);
};