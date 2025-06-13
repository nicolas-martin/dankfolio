import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const colors = theme.colors; // Ensure colors is defined inside useMemo if used by StyleSheet.create
		const styles = StyleSheet.create({
			card: {
				backgroundColor: theme.colors.surfaceVariant,
				borderRadius: theme.spacing.sm,
			marginBottom: theme.spacing.md,
			padding: theme.spacing.lg,
		},
		container: {
			backgroundColor: theme.colors.background,
			flex: 1,
		},
		contentPadding: {
			padding: theme.spacing.lg,
		},
		emptyContainer: {
			alignItems: 'center',
			flex: 1,
			justifyContent: 'center',
			padding: theme.spacing.lg,
		},
		emptyText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.base,
			marginTop: theme.spacing.lg,
			textAlign: 'center',
		},
		errorContainer: {
			alignItems: 'center',
			flex: 1,
			justifyContent: 'center',
			padding: theme.spacing.lg,
		},
		errorText: {
			color: theme.colors.error,
			fontSize: theme.typography.fontSize.base,
			textAlign: 'center',
		},
		filterButton: {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.lg,
			marginRight: theme.spacing.sm,
			paddingHorizontal: theme.spacing.md,
			paddingVertical: 6, // No exact match
		},
		filterButtonActive: {
			backgroundColor: theme.colors.primary,
		},
		filterButtonText: {
			color: theme.colors.onSurface,
			fontSize: theme.typography.fontSize.sm,
		},
		filterButtonTextActive: {
			color: theme.colors.onPrimary,
		},
		filtersContainer: {
			backgroundColor: theme.colors.surfaceVariant,
			flexDirection: 'row',
			paddingHorizontal: theme.spacing.lg,
			paddingVertical: theme.spacing.sm,
		},
		flex1: {
			flex: 1,
		},
		headerRow: {
			alignItems: 'center',
			flexDirection: 'row',
			gap: theme.spacing.md,
			marginBottom: theme.spacing.lg,
		},
		listContent: {
			paddingBottom: theme.spacing.lg,
			paddingHorizontal: theme.spacing.lg,
		},
		loadingContainer: {
			alignItems: 'center',
			flex: 1,
			justifyContent: 'center',
		},
		priceChangeNegative: {
			color: theme.colors.error,
			fontSize: theme.typography.fontSize.sm,
			marginLeft: 'auto',
		},
		priceChangePositive: {
			color: theme.colors.primary,
			fontSize: theme.typography.fontSize.sm,
			marginLeft: 'auto',
		},
		safeArea: {
			backgroundColor: theme.colors.background,
			flex: 1,
		},
		searchCard: {
			backgroundColor: theme.colors.surface,
			marginBottom: theme.spacing.lg,
		},
		searchInput: {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.spacing.sm,
			color: theme.colors.onSurface,
			height: theme.spacing['4xl'],
			paddingHorizontal: theme.spacing.md,
		},
		sortButton: {
			alignItems: 'center',
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: theme.spacing.xs,
			justifyContent: 'center',
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.sm,
		},
		sortButtonText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.xs,
			fontWeight: '500',
		},
		sortButtonsContainer: {
			flexDirection: 'row',
			justifyContent: 'space-around',
			paddingVertical: theme.spacing.sm,
			// paddingHorizontal: 16, // Already in contentPadding
		},
		tokenDetails: {
			marginLeft: theme.spacing.md,
		},
		tokenImage: {
			borderRadius: theme.spacing.xl,
			height: theme.spacing['4xl'],
			marginRight: theme.spacing.md,
			width: theme.spacing['4xl'],
		},
		tokenInfo: {
			flex: 1,
		},
		tokenItem: {
			alignItems: 'center',
			borderBottomColor: theme.colors.outlineVariant,
			borderBottomWidth: 1,
			flexDirection: 'row',
			padding: theme.spacing.lg,
		},
		tokenMetrics: {
			alignItems: 'center',
			flexDirection: 'row',
		},
		tokenName: {
			color: theme.colors.onSurface,
			fontSize: theme.typography.fontSize.base,
			fontWeight: '600',
		},
		tokenNameRow: {
			alignItems: 'center',
			flexDirection: 'row',
			marginBottom: theme.spacing.xs,
		},
		tokenPrice: {
			color: theme.colors.onSurface,
			fontSize: theme.typography.fontSize.sm,
			marginRight: theme.spacing.md,
		},
		tokenSymbol: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.sm,
			marginLeft: theme.spacing.sm,
		},
		tokenVolume: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.xs,
		},
	});
	return {
		...styles,
		colors: theme.colors, // Return original theme colors directly
		theme
	};
	}, [theme]);
};
