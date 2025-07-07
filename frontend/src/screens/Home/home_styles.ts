import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const refreshControlColors = [theme.colors.primary];
		// const colors = theme.colors; // This variable was unused
		const styles = StyleSheet.create({
			alignFlexEnd: {
				alignItems: 'flex-end',
			},
			center: {
				alignItems: 'center',
				justifyContent: 'center',
			},
			coinsList: {
				paddingBottom: 100,
			},
			coinsSection: {
				flex: 1,
				paddingHorizontal: theme.spacing.xl,
				paddingTop: theme.spacing.xl,
			},
			coinsSectionScrollView: {
				flex: 1,
			},
			connectButton: {
				backgroundColor: theme.colors.primary,
				borderRadius: theme.borderRadius.md,
				paddingHorizontal: theme.spacing['2xl'],
				paddingVertical: theme.spacing.md,
			},
			connectButtonText: {
				color: theme.colors.onPrimary,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
			},
			container: {
				backgroundColor: theme.colors.background,
				flex: 1,
			},
			content: {
				flex: 1,
			},
			emptyStateContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
				paddingHorizontal: theme.spacing['4xl'],
			},
			emptyStateIcon: {
				marginBottom: theme.spacing.lg,
				opacity: 0.6,
			},
			emptyStateText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				lineHeight: theme.typography.fontSize.xl,
				textAlign: 'center',
			},
			emptyStateTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.lg,
				fontWeight: '600',
				marginBottom: theme.spacing.sm,
				textAlign: 'center',
			},
			flex1: { // New
				flex: 1,
			},
			headerContainer: {
				padding: theme.spacing.xl,
				paddingBottom: theme.spacing.lg,
			},
			loadingContainer: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'center',
				padding: theme.spacing.xl,
			},
			loadingTrendingText: { // New
				color: theme.colors.onSurfaceVariant,
				marginTop: theme.spacing.sm,
			},
			newCoinsPlaceholderCard: { // New
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.md,
				elevation: 2,
				height: 120,
				marginRight: theme.spacing.sm,
				padding: theme.spacing.md,
				shadowColor: theme.colors.shadow,
				shadowOffset: theme.shadows.sm.shadowOffset,
				shadowOpacity: 0.1,
				shadowRadius: 2,
				width: 140,
			},
			newCoinsPlaceholderContainer: {
				marginBottom: theme.spacing['2xl'],
			},
			newCoinsPlaceholderIconShimmer: {
				alignSelf: 'center',
				marginBottom: theme.spacing.sm,
			},
			newCoinsPlaceholderScrollContent: {
				paddingHorizontal: theme.spacing.lg,
			},
			newCoinsPlaceholderText1Shimmer: {
				alignSelf: 'center',
				marginBottom: theme.spacing.xs,
			},
			newCoinsPlaceholderText2Shimmer: {
				alignSelf: 'center',
			},
			newCoinsPlaceholderTitleContainer: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
				marginBottom: theme.spacing.lg,
				paddingHorizontal: theme.spacing.lg,
			},
			noWalletCard: {
				alignItems: 'center',
				backgroundColor: theme.colors.surface,
				borderRadius: theme.spacing.xl,
				elevation: 4,
				padding: theme.spacing['3xl'],
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.md.shadowOffset,
				shadowOpacity: 0.1,
				shadowRadius: theme.spacing.sm,
			},
			noWalletContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
				paddingHorizontal: theme.spacing['4xl'],
			},
			noWalletIcon: {
				marginBottom: theme.spacing.xl,
				opacity: 0.7,
			},
			noWalletText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				lineHeight: theme.typography.fontSize.xl,
				marginBottom: theme.spacing['2xl'],
				textAlign: 'center',
			},
			noWalletTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.xl,
				fontWeight: '600',
				marginBottom: theme.spacing.sm,
				textAlign: 'center',
			},
			placeholderCoinIconShimmer: {
				marginRight: theme.spacing.md,
			},
			placeholderSparklineShimmer: {
				marginHorizontal: theme.spacing.md,
			},
			placeholderTextMarginBottomS: {
				marginBottom: theme.spacing.xs,
			},
			// New placeholder styles to match TokenListCard layout
			placeholderTrendingColumnHeader: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
				paddingBottom: theme.spacing.sm,
				paddingHorizontal: theme.spacing.lg,
			},
			placeholderTrendingContainer: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.lg,
				elevation: 2,
				marginBottom: theme.spacing.lg,
				marginHorizontal: theme.spacing.lg,
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.sm.shadowOffset,
				shadowOpacity: 0.08,
				shadowRadius: theme.spacing.xs,
			},
			placeholderTrendingHeader: {
				paddingBottom: theme.spacing.sm,
				paddingHorizontal: theme.spacing.lg,
				paddingTop: theme.spacing.lg,
			},
			placeholderColumnHeaderText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: 12,
				fontWeight: '500',
				letterSpacing: 0.5,
				textAlign: 'center',
				textTransform: 'uppercase',
			},
			placeholderTrendingListContainer: {
				paddingBottom: theme.spacing.sm,
			},
			placeholderItemContainer: {
				paddingHorizontal: theme.spacing.lg,
				paddingVertical: theme.spacing.lg,
			},
			placeholderItemContent: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
			},
			placeholderLeftSection: {
				alignItems: 'center',
				flex: 0.5,
				flexDirection: 'row',
				minWidth: 0,
				paddingRight: theme.spacing.sm,
			},
			placeholderNameSection: {
				flex: 1,
				justifyContent: 'center',
				minWidth: 0,
			},
			placeholderSparklineContainer: {
				alignItems: 'center',
				flex: 0.3,
				height: 40,
				justifyContent: 'center',
				paddingHorizontal: theme.spacing.sm,
			},
			placeholderRightSection: {
				alignItems: 'flex-end',
				flex: 0.3,
				justifyContent: 'center',
				minWidth: 0,
			},
			placeholderTrendingLeftSection: {
				alignItems: 'center',
				flex: 0.5,
				flexDirection: 'row',
				minWidth: 0,
				paddingRight: theme.spacing.sm,
			},
			placeholderTrendingSparklineSection: {
				alignItems: 'center',
				flex: 0.3,
				height: 40,
				justifyContent: 'center',
				paddingHorizontal: theme.spacing.sm,
			},
			placeholderTrendingRightSection: {
				alignItems: 'flex-end',
				flex: 0.3,
				justifyContent: 'center',
				minWidth: 0,
			},
			placeholderDivider: {
				backgroundColor: theme.colors.surfaceVariant,
				height: 0.5,
				marginHorizontal: theme.spacing.lg,
			},
			sectionHeader: {
				marginBottom: theme.spacing.lg,
				paddingHorizontal: theme.spacing.lg,
			},
			sectionTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.xl,
				fontWeight: '600',
			},
			subtitleText: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '400',
			},
			welcomeText: {
				color: theme.colors.onSurface,
				fontSize: 28,
				fontWeight: '700',
				marginBottom: theme.spacing.xs,
			},
		});
		return {
			...styles,
			colors: theme.colors, // Return original theme colors directly
			theme,
			refreshControlColors
		};
	}, [theme]);
};
