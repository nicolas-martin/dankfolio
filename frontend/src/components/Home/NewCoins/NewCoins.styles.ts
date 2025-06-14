import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		// const colors = theme.colors; // Ensure colors is defined inside useMemo - REMOVED
		const styles = StyleSheet.create({
			cardWrapper: {
				marginRight: theme.spacing.sm,
				width: 140,
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
			shadowColor: theme.colors.shadow,
			shadowOffset: theme.shadows.sm.shadowOffset,
			shadowOpacity: 0.1,
			shadowRadius: 2,
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
	return {
		...styles,
		colors: theme.colors, // Return original theme.colors for consistency
		theme
	};
	}, [theme]);
}
