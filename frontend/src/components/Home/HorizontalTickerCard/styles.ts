import { StyleSheet } from 'react-native';
import { theme } from '@utils/theme';

export const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.sm,
        minWidth: 120,
        ...theme.shadows.sm,
    },
    logoContainer: {
        marginBottom: 6,
        alignItems: 'center',
    },
    symbol: {
        fontSize: theme.typography.fontSize.sm,
        fontFamily: theme.typography.fontFamily.semiBold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        textAlign: 'center',
    },
    price: {
        fontSize: theme.typography.fontSize.lg,
        fontFamily: theme.typography.fontFamily.bold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        textAlign: 'center',
    },
    change: {
        fontSize: theme.typography.fontSize.sm,
        fontFamily: theme.typography.fontFamily.medium,
        textAlign: 'center',
    },
    changePositive: {
        color: theme.colors.success,
    },
    changeNegative: {
        color: theme.colors.error,
    },
    changeNeutral: {
        color: theme.colors.textSecondary,
    },
});
