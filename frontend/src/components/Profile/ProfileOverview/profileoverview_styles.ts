import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const sendButtonStyle = {
			style: {
				backgroundColor: theme.colors.primary,
				borderRadius: theme.borderRadius.md,
				paddingVertical: theme.spacing.xs,
			}
		};
		const styles = StyleSheet.create({
			portfolioSection: {
				padding: theme.spacing['2xl'],
			},
			portfolioSubtext: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				marginBottom: theme.spacing.xl,
			},
			portfolioTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
				marginBottom: theme.spacing.xs,
			},
			portfolioValue: {
				color: theme.colors.onSurface,
				fontSize: 32,
				fontWeight: '700',
				marginBottom: theme.spacing.sm,
			},
			sendButtonContent: {
				paddingVertical: theme.spacing.sm,
			},
			sendButtonText: {
				color: theme.colors.onPrimary,
				fontSize: 16,
				fontWeight: '600',
			},
			tabContainer: {
				flex: 1,
			},
			tabContentContainer: {
				backgroundColor: theme.colors.surface,
				flex: 1,
			},
		});
		return {
			...styles,
			colors: theme.colors,
			theme,
			sendButtonStyle
		};
	}, [theme]);
};