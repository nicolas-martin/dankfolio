import { StyleSheet, Platform } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';

export const createStyles = (theme: AppTheme) => StyleSheet.create({
	aboutCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: theme.borderRadius.lg,
		marginBottom: theme.spacing.lg,
		marginHorizontal: theme.spacing.lg,
		padding: theme.spacing.xl,
		...Platform.select({
			ios: {
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.md.shadowOffset,
				shadowOpacity: 0.1, // No exact match
				shadowRadius: theme.spacing.sm,
			},
			android: {
				elevation: 4, // No exact match
			},
		}),
	},
	aboutHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: theme.spacing.lg,
	},
	aboutIcon: {
		alignItems: 'center',
		backgroundColor: theme.colors.secondaryContainer,
		borderRadius: theme.borderRadius.md,
		height: theme.spacing['2xl'],
		justifyContent: 'center',
		marginRight: theme.spacing.md,
		width: theme.spacing['2xl'],
	},
	aboutTitle: {
		color: theme.colors.onSurface,
		flex: 1,
		fontSize: theme.typography.fontSize.lg,
		fontWeight: '600',
	},
	activityIndicatorContainer: { // New
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: theme.spacing.sm,
	},
	activityIndicatorOverlay: { // New
		alignItems: 'center',
		bottom: 0,
		justifyContent: 'center',
		left: 0,
		marginHorizontal: theme.spacing.lg,
		marginVertical: theme.spacing.lg,
		position: 'absolute',
		right: 0,
		top: 0,
	},
	centered: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
	},
	chartCardContent: { // New
		marginHorizontal: theme.spacing.lg,
	},
	chartContainer: {
		backgroundColor: theme.colors.surface,
		borderRadius: theme.borderRadius.lg,
		marginBottom: theme.spacing.lg,
		marginHorizontal: theme.spacing.lg,
		paddingVertical: theme.spacing.lg,
		...Platform.select({
			ios: {
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.md.shadowOffset,
				shadowOpacity: 0.1, // No exact match
				shadowRadius: theme.spacing.sm,
			},
			android: {
				elevation: 4, // No exact match
			},
		}),
	},
	coinInfoContainer: { // Legacy
		// This will be replaced by aboutCard
	},
	container: {
		backgroundColor: theme.colors.background,
		flex: 1,
	},
	content: {
		flex: 1,
	},
	flex1: { // New
		flex: 1,
	},
	flexDirectionRow: { // New
		flexDirection: 'row',
	},
	holdingsCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: theme.borderRadius.lg,
		marginBottom: theme.spacing.lg,
		marginHorizontal: theme.spacing.lg,
		padding: theme.spacing.xl,
		...Platform.select({
			ios: {
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.md.shadowOffset,
				shadowOpacity: 0.1, // No exact match
				shadowRadius: theme.spacing.sm,
			},
			android: {
				elevation: 4, // No exact match
			},
		}),
	},
	holdingsContainer: { // Legacy
		// This will be replaced by holdingsCard
	},
	holdingsContent: {
		gap: theme.spacing.md,
	},
	holdingsHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: theme.spacing.lg,
	},
	holdingsIcon: {
		alignItems: 'center',
		backgroundColor: theme.colors.primaryContainer,
		borderRadius: theme.borderRadius.md,
		height: theme.spacing['2xl'],
		justifyContent: 'center',
		marginRight: theme.spacing.md,
		width: theme.spacing['2xl'],
	},
	holdingsLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 15, // No exact match
		fontWeight: '500',
	},
	holdingsRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: theme.spacing.xs,
	},
	holdingsTitle: {
		color: theme.colors.onSurface,
		flex: 1,
		fontSize: theme.typography.fontSize.lg,
		fontWeight: '600',
	},
	holdingsValue: {
		color: theme.colors.onSurface,
		fontSize: 15, // No exact match
		fontWeight: '600',
	},
	loadingChartText: { // New
		color: theme.colors.onSurfaceVariant,
		marginTop: theme.spacing.sm,
	},
	loadingContainer: {
		alignItems: 'center',
		paddingVertical: theme.spacing.xl,
	},
	loadingDetailsText: { // New
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.xs,
		marginTop: theme.spacing.sm,
	},
	marginBottomL: { // New
		marginBottom: theme.spacing.lg,
	},
	marginBottomM: { // New
		marginBottom: theme.spacing.sm,
	},
	marginBottomS: { // New
		marginBottom: theme.spacing.xs,
	},
	marginLeftS: { // New
		marginLeft: theme.spacing.sm,
	},
	placeholderChartCardContainer: { // New
		marginHorizontal: theme.spacing.lg,
		padding: theme.spacing.lg,
	},
	placeholderIconShimmer: { // New
		marginRight: theme.spacing.md,
	},
	placeholderPadding: { // New
		padding: theme.spacing.lg,
	},
	priceCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: theme.borderRadius.lg,
		marginBottom: theme.spacing.lg,
		marginHorizontal: theme.spacing.lg,
		padding: theme.spacing.xl,
		...Platform.select({
			ios: {
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.md.shadowOffset,
				shadowOpacity: 0.1, // No exact match
				shadowRadius: theme.spacing.sm,
			},
			android: {
				elevation: 4, // No exact match
			},
		}),
	},
	priceDisplayContainer: { // Legacy
		// This will be replaced by priceCard
	},
	scrollView: {
		flex: 1,
	},
	scrollViewContent: {
		paddingBottom: 100, // No exact match
		paddingTop: theme.spacing.sm,
	},
	timeframeButtonsContainer: { // Legacy
		// This will be replaced by timeframeCard
	},
	timeframeCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: theme.borderRadius.lg,
		marginBottom: theme.spacing.lg,
		marginHorizontal: theme.spacing.lg,
		padding: theme.spacing.md,
		...Platform.select({
			ios: {
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.md.shadowOffset,
				shadowOpacity: 0.1, // No exact match
				shadowRadius: theme.spacing.sm,
			},
			android: {
				elevation: 4, // No exact match
			},
		}),
	},
	tradeButton: {
		borderRadius: theme.borderRadius.md,
		elevation: 10, // No exact match
		paddingVertical: theme.spacing.xs,
		shadowColor: '#00FF9F', // Specific color
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.8, // No exact match
		shadowRadius: theme.spacing.sm,
	},
	tradeButtonContainer: {
		backgroundColor: theme.colors.surface,
		borderTopColor: theme.colors.outline,
		borderTopWidth: 1,
		bottom: 0,
		left: 0,
		paddingBottom: Platform.select({
			ios: 34, // No exact match
			android: theme.spacing.lg, // 16 is theme.spacing.lg
		}),
		paddingHorizontal: theme.spacing.lg,
		paddingTop: theme.spacing.lg,
		position: 'absolute',
		right: 0,
		...Platform.select({
			ios: {
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: { width: 0, height: -2 }, // No exact match
				shadowOpacity: 0.1, // No exact match
				shadowRadius: theme.spacing.sm,
			},
			android: {
				elevation: 8, // No exact match
			},
		}),
	},
});
