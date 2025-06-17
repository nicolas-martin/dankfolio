import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const styles = StyleSheet.create({
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
			title: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.xl,
				fontWeight: '600',
			},
			titleContainer: {
				alignItems: 'flex-start',
				flexDirection: 'row',
				justifyContent: 'space-between',
				marginBottom: theme.spacing.lg,
				paddingHorizontal: theme.spacing.lg,
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