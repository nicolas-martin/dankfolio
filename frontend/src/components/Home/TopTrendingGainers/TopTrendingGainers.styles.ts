import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;

	return useMemo(() => {
		// Base style objects for composition
		const cardWrapperBase = {
			marginRight: theme.spacing.sm,
			width: 140,
		};

		const placeholderCardBase = {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
			elevation: 2,
			padding: theme.spacing.md,
			shadowColor: theme.colors.shadow,
			shadowOffset: theme.shadows.sm.shadowOffset,
			shadowOpacity: 0.1,
			shadowRadius: 2,
		};

		const styles = StyleSheet.create({
			// Use base styles directly
			cardWrapper: cardWrapperBase,
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
			// Combined style using composition - no duplication!
			placeholderCard: {
				...cardWrapperBase,
				...placeholderCardBase,
			},
			// Keep original for backward compatibility if needed
			placeholderCardContainer: placeholderCardBase,
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
			titleShimmer: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.sm,
				height: 22,
				marginBottom: theme.spacing.sm,
				marginLeft: theme.spacing.lg,
				width: 200,
			},
			trendingCardStyle: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.lg,
				paddingHorizontal: theme.spacing.sm,
				paddingVertical: theme.spacing.xs,
			},
			viewAllButton: {
				color: theme.colors.primary,
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '500',
			},
		});
		return {
			...styles,
			colors: theme.colors, // Return original theme.colors for consistency
			theme,
		};
	}, [theme]);
};
