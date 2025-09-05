import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const styles = StyleSheet.create({
			container: {
				flex: 1,
			},
			emptyStateContainer: {
				alignItems: 'center',
				flex: 1,
				justifyContent: 'center',
				paddingHorizontal: theme.spacing['4xl'],
				paddingVertical: 60,
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
			emptyTokensContainer: {
				padding: theme.spacing.xl,
			},
			tokensHeader: {
				alignItems: 'center',
				flexDirection: 'row',
				marginBottom: theme.spacing.lg,
			},
			tokensIcon: {
				marginRight: theme.spacing.md,
			},
			tokensTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.xl,
				fontWeight: '600',
			},
		});
		return {
			...styles,
			colors: theme.colors,
			theme
		};
	}, [theme]);
};