import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';

export const createStyles = (theme: AppTheme) => StyleSheet.create({
    cardWrapper: {
        marginRight: theme.spacing.sm,
        width: 140, // Adjusted width
    },
    container: {
        paddingBottom: theme.spacing['2xl'],
        paddingTop: theme.spacing.lg,
    },
    emptyText: {
        color: theme.colors.onSurfaceVariant,
        minHeight: 100,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.lg,
        textAlign: 'center',
    },
    listContentContainer: {
        paddingLeft: theme.spacing.lg,
        paddingRight: theme.spacing.xs,
    },
    loadingContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        minHeight: 100,
        padding: theme.spacing.lg,
    },
    loadingText: {
        color: theme.colors.onSurfaceVariant,
        marginLeft: theme.spacing.sm,
    },
	placeholderCardContainer: {
		backgroundColor: theme.colors.surface,
		borderRadius: theme.borderRadius.md,
		elevation: 2,
		padding: theme.spacing.md,
		shadowColor: theme.colors.shadow, // Assuming AppTheme provides theme.colors.shadow
		shadowOffset: theme.shadows.sm.shadowOffset, // Using from AppTheme.shadows
		shadowOpacity: 0.1, // No exact match in theme.shadows
		shadowRadius: 2, // No exact match in theme.shadows
	},
	placeholderIconShimmer: {
		alignSelf: 'center',
		marginBottom: theme.spacing.sm,
	},
	placeholderTextShimmerLine1: {
		alignSelf: 'center',
		marginBottom: theme.spacing.xs,
	},
	placeholderTextShimmerLine2: {
		alignSelf: 'center',
	},
    title: {
        color: theme.colors.onSurface,
        fontSize: theme.typography.fontSize.xl,
        fontWeight: '600',
    },
    titleContainer: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: theme.spacing.sm,
        marginLeft: theme.spacing.lg,
        marginRight: theme.spacing.lg,
    },
    viewAllButton: {
        color: theme.colors.primary,
        fontSize: theme.typography.fontSize.sm,
        fontWeight: '500',
    },
});

// Helper for theme spacing (if not directly available, you might need to define it in your theme)
// For example, in your theme.ts:
// export const spacing = { xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
// And then access it as theme.spacing.md
// If your theme structure is different (e.g., theme.paddings.medium), adjust accordingly.
// For MD3Theme, `theme.spacing` is not standard. You might use `theme.paddings.medium` or define custom spacing.
// Let's assume `theme.spacing` might be custom added or use direct values.
