import { StyleSheet, Platform } from 'react-native';
import { theme } from '../../utils/theme';

export const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    safeArea: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    scrollView: {
        flex: 1,
        marginBottom: 80, // Space for fixed button
    },
    header: {
        padding: theme.spacing.lg,
        backgroundColor: '#191B1F',
        borderRadius: theme.borderRadius.lg,
        margin: theme.spacing.lg,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    chartContainer: {
        height: Platform.select({
            web: 400,
            ios: 300,
            android: 300,
            default: 250
        }),
        marginVertical: theme.spacing.lg,
        backgroundColor: theme.colors.background,
        overflow: 'visible',
        position: 'relative',
        marginBottom: Platform.OS !== 'web' ? 60 : theme.spacing.lg,
    },
    timeframeRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        gap: theme.spacing.md,
        backgroundColor: theme.colors.background,
        borderRadius: theme.borderRadius.md,
        padding: theme.spacing.sm,
        marginBottom: Platform.select({
            ios: 0,
            android: 0,
            default: theme.spacing.lg
        }),
        ...Platform.select({
            ios: {
                position: 'absolute',
                bottom: theme.spacing.sm,
                left: theme.spacing.lg,
                right: theme.spacing.lg,
                ...theme.shadows.md,
                zIndex: 1000,
            },
            android: {
                position: 'absolute',
                bottom: theme.spacing.sm,
                left: theme.spacing.lg,
                right: theme.spacing.lg,
                elevation: 5,
                zIndex: 1000,
            },
            default: {
                marginTop: theme.spacing['2xl'],
            }
        })
    },
    timeframeButton: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        borderRadius: theme.borderRadius.sm,
        minWidth: 48,
        alignItems: 'center',
        backgroundColor: theme.colors.background,
    },
    timeframeButtonActive: {
        backgroundColor: theme.colors.primary,
    },
    timeframeLabel: {
        color: theme.colors.textSecondary,
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '600',
    },
    timeframeLabelActive: {
        color: theme.colors.text,
    },
    balanceSection: {
        backgroundColor: theme.colors.containerBackground,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        margin: theme.spacing.xl,
    },
    balanceTitle: {
        fontSize: theme.typography.fontSize['2xl'],
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.lg,
    },
    balanceDetails: {
        marginBottom: theme.spacing.xl,
    },
    balanceRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
    },
    balanceLabel: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.textSecondary,
    },
    balanceValue: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text,
        fontWeight: 'bold',
    },
    metadataLoader: {
        marginVertical: theme.spacing.xl,
    },
    statsContainer: {
        backgroundColor: theme.colors.containerBackground,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        margin: theme.spacing.xl,
    },
    sectionTitle: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.text,
        marginBottom: theme.spacing.lg,
    },
    statItem: {
        marginBottom: theme.spacing.lg,
    },
    statLabel: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.textSecondary,
        marginBottom: theme.spacing.xs,
    },
    statValue: {
        fontSize: theme.typography.fontSize.base,
        color: theme.colors.text,
    },
    bottomButtonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: theme.spacing.lg,
        backgroundColor: theme.colors.background,
        borderTopWidth: 1,
        borderTopColor: theme.colors.border,
    },
    bottomBuyButton: {
        backgroundColor: theme.colors.primary,
        paddingVertical: theme.spacing.lg,
        borderRadius: theme.borderRadius.md,
        alignItems: 'center',
        ...theme.shadows.md,
    },
    bottomBuyButtonText: {
        color: theme.colors.text,
        fontWeight: 'bold',
        fontSize: theme.typography.fontSize.lg,
    },
}); 