import { StyleSheet } from 'react-native';
import { theme } from '../../utils/theme';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    portfolioCard: {
        backgroundColor: theme.colors.cardBackground,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        margin: theme.spacing.lg,
    },
    portfolioTitle: {
        fontSize: theme.typography.fontSize.xl,
        color: theme.colors.text,
        fontWeight: 'bold',
        marginBottom: theme.spacing.md,
    },
    portfolioValue: {
        fontSize: theme.typography.fontSize['2xl'],
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    portfolioChange: {
        fontSize: theme.typography.fontSize.base,
        marginTop: theme.spacing.xs,
    },
    tokenCard: {
        backgroundColor: theme.colors.cardBackground,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
    },
    tokenHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: theme.spacing.md,
    },
    tokenIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: theme.spacing.md,
    },
    tokenName: {
        fontSize: theme.typography.fontSize.lg,
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    tokenBalance: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text,
        marginTop: theme.spacing.xs,
    },
    tokenValue: {
        fontSize: theme.typography.fontSize.sm,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    positive: {
        color: theme.colors.success,
    },
    negative: {
        color: theme.colors.error,
    },
}); 