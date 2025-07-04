import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const styles = StyleSheet.create({
			cardContainer: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.lg,
				elevation: 2,
				marginHorizontal: theme.spacing.lg,
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.sm.shadowOffset,
				shadowOpacity: 0.08,
				shadowRadius: theme.spacing.xs,
			},
			container: {
				paddingBottom: theme.spacing.lg,
				paddingTop: theme.spacing.sm,
			},
			emptyText: {
				color: theme.colors.onSurfaceVariant,
				minHeight: 100,
				paddingHorizontal: theme.spacing.lg,
				paddingVertical: theme.spacing.lg,
				textAlign: 'center',
			},
			scrollContent: {
				paddingVertical: theme.spacing.md,
			},
			title: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.xl,
				fontWeight: '600',
			},
			titleContainer: {
				paddingBottom: theme.spacing.sm,
				paddingHorizontal: theme.spacing.lg,
				paddingTop: theme.spacing.lg,
			},
			titleShimmer: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.sm,
				height: 22,
				marginBottom: theme.spacing.sm,
				marginLeft: theme.spacing.lg,
				width: 200,
			},
		});
		return {
			...styles,
			colors: theme.colors,
			theme,
		};
	}, [theme]);
};
