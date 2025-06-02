import { StyleSheet } from 'react-native';
import { theme } from '@utils/theme';

export const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.colors.surface,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.md,
        marginHorizontal: theme.spacing.sm,
        minWidth: 130,
        minHeight: 120,
        justifyContent: 'center',
        alignItems: 'center',
        ...theme.shadows.sm,
    },
    logoContainer: {
        marginBottom: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    symbol: {
        fontSize: theme.typography.fontSize.sm,
        fontFamily: theme.typography.fontFamily.semiBold,
        color: theme.colors.text,
        marginBottom: theme.spacing.xs,
        textAlign: 'center',
    },
    timeAgo: {
        fontSize: theme.typography.fontSize.sm,
        fontFamily: theme.typography.fontFamily.medium,
        color: theme.colors.textSecondary,
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
