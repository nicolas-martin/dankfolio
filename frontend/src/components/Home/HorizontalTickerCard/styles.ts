import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme'; // Import AppTheme

// MD3Theme and extendedThemeProperties are no longer needed directly here if AppTheme is comprehensive
// import { MD3Theme } from 'react-native-paper';
// import { extendedThemeProperties } from '@utils/theme';

export const createStyles = (theme: AppTheme) => {
    // const extendedTheme = extendedThemeProperties[themeType]; // No longer needed

    return StyleSheet.create({
        change: {
            fontFamily: theme.typography.fontFamily.medium,
            fontSize: theme.typography.fontSize.sm,
            textAlign: 'center',
        },
        changeNegative: {
            color: theme.colors.error,
        },
        changeNeutral: {
            color: theme.colors.onSurfaceVariant,
        },
        changePositive: {
            color: theme.success, // AppTheme should have 'success' directly
        },
        container: {
            alignItems: 'center',
            backgroundColor: theme.colors.surface,
            borderRadius: theme.borderRadius.md,
            justifyContent: 'center',
            marginHorizontal: theme.spacing.sm,
            minHeight: 120,
            minWidth: 130,
            padding: theme.spacing.md,
            ...theme.shadows.sm, // AppTheme has shadows
        },
        logoContainer: {
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 10, // No exact match in theme.spacing (sm=8, md=12)
        },
        symbol: {
            color: theme.colors.onSurface,
            fontFamily: theme.typography.fontFamily.semiBold,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.xs,
            textAlign: 'center',
        },
        timeAgo: {
            color: theme.colors.onSurfaceVariant,
            fontFamily: theme.typography.fontFamily.medium,
            fontSize: theme.typography.fontSize.sm,
            marginBottom: theme.spacing.xs,
            textAlign: 'center',
        },
    });
};
