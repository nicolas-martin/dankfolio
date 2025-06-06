import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { extendedThemeProperties } from '@utils/theme';

export const createStyles = (theme: MD3Theme, themeType: 'light' | 'neon' = 'light') => {
    const extendedTheme = extendedThemeProperties[themeType];

    return StyleSheet.create({
        change: {
            fontFamily: extendedTheme.typography.fontFamily.medium,
            fontSize: extendedTheme.typography.fontSize.sm,
            textAlign: 'center',
        },
        changeNegative: {
            color: theme.colors.error,
        },
        changeNeutral: {
            color: theme.colors.onSurfaceVariant,
        },
        changePositive: {
            color: extendedTheme.success,
        },
        container: {
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: extendedTheme.borderRadius.md,
            justifyContent: 'center',
            marginHorizontal: extendedTheme.spacing.sm,
            minHeight: 120,
            minWidth: 130,
            padding: extendedTheme.spacing.md,
            ...extendedTheme.shadows.sm,
        },
        logoContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10,
        },
        symbol: {
            color: theme.colors.onSurface,
            fontFamily: extendedTheme.typography.fontFamily.semiBold,
            fontSize: extendedTheme.typography.fontSize.sm,
            marginBottom: extendedTheme.spacing.xs,
            textAlign: 'center',
        },
        timeAgo: {
            color: theme.colors.onSurfaceVariant,
            fontFamily: extendedTheme.typography.fontFamily.medium,
            fontSize: extendedTheme.typography.fontSize.sm,
            marginBottom: extendedTheme.spacing.xs,
            textAlign: 'center',
        },
    });
};
