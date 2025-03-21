import { StyleSheet } from 'react-native';
import { theme } from '../../utils/theme';

export const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    loadingContainer: {
        flex: 1,
        backgroundColor: theme.colors.background,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: theme.spacing.lg,
    },
    coinInfo: {
        flex: 1,
        marginLeft: theme.spacing.lg,
    },
    coinName: {
        fontSize: theme.typography.fontSize.xl,
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    coinSymbol: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.textSecondary,
        marginTop: theme.spacing.xs,
    },
    coinLogo: {
        width: 48,
        height: 48,
        borderRadius: 24,
    },
    timeframeRow: {
        flexDirection: 'row',
        backgroundColor: `${theme.colors.background}E6`,
        padding: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        justifyContent: 'space-between',
    },
    timeframeButton: {
        paddingVertical: theme.spacing.sm,
        paddingHorizontal: theme.spacing.md,
        borderRadius: theme.borderRadius.full,
    },
    timeframeButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    timeframeText: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.fontSize.sm,
    },
    timeframeTextActive: {
        color: theme.colors.text,
        fontWeight: '600',
    },
    priceSection: {
        padding: theme.spacing.lg,
    },
    currentPrice: {
        fontSize: theme.typography.fontSize['3xl'],
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    priceChange: {
        fontSize: theme.typography.fontSize.lg,
        marginTop: theme.spacing.sm,
    },
    positive: {
        color: theme.colors.success,
    },
    negative: {
        color: theme.colors.error,
    },
    bottomButtonContainer: {
        backgroundColor: theme.colors.background,
        borderTopColor: theme.colors.border,
        borderTopWidth: 1,
        padding: theme.spacing.lg,
    },
    bottomBuyButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.lg,
        borderRadius: theme.borderRadius.lg,
        alignItems: 'center',
        shadowColor: theme.colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 8,
    },
    bottomBuyButtonText: {
        color: theme.colors.text,
        fontSize: theme.typography.fontSize.lg,
        fontWeight: 'bold',
    },
}); 