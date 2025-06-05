import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { extendedThemeProperties } from '@utils/theme';

export const createStyles = (theme: MD3Theme, themeType: 'light' | 'neon' = 'light') => {
    const extendedTheme = extendedThemeProperties[themeType];

    return StyleSheet.create({
        container: {
            backgroundColor: theme.colors.surface,
            borderRadius: extendedTheme.borderRadius.md,
            padding: extendedTheme.spacing.md,
            marginHorizontal: extendedTheme.spacing.sm,
            minWidth: 130,
            minHeight: 120,
            justifyContent: 'center',
            alignItems: 'center',
            ...extendedTheme.shadows.sm,
        },
        logoContainer: {
            marginBottom: 10,
            alignItems: 'center',
            justifyContent: 'center',
        },
        symbol: {
            fontSize: extendedTheme.typography.fontSize.sm,
            fontFamily: extendedTheme.typography.fontFamily.semiBold,
            color: theme.colors.onSurface,
            marginBottom: extendedTheme.spacing.xs,
            textAlign: 'center',
        },
        timeAgo: {
            fontSize: extendedTheme.typography.fontSize.sm,
            fontFamily: extendedTheme.typography.fontFamily.medium,
            color: theme.colors.onSurfaceVariant,
            marginBottom: extendedTheme.spacing.xs,
            textAlign: 'center',
        },
        change: {
            fontSize: extendedTheme.typography.fontSize.sm,
            fontFamily: extendedTheme.typography.fontFamily.medium,
            textAlign: 'center',
        },
        changePositive: {
            color: extendedTheme.success,
        },
        changeNegative: {
            color: theme.colors.error,
        },
        changeNeutral: {
            color: theme.colors.onSurfaceVariant,
        },
    });
};
