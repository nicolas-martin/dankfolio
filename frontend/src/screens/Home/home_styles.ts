import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		alignFlexEnd: {
			alignItems: 'flex-end',
		},
		coinCardContainerStyle: {
			marginBottom: theme.spacing.md,
			paddingHorizontal: theme.spacing.lg,
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
		placeholderCoinCardContainerMargin: {
			marginBottom: theme.spacing.md,
		},
		placeholderCoinCardContent: {
			alignItems: 'center',
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
			elevation: 2,
			flexDirection: 'row',
			padding: theme.spacing.lg,
			shadowColor: theme.colors.shadow,
			shadowOffset: theme.shadows.sm.shadowOffset,
			shadowOpacity: 0.1,
			shadowRadius: 2,
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
	})
	return {
		...styles,
		colors,
		theme
	};
};
