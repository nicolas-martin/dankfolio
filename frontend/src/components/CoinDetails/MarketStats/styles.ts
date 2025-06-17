import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;

	return useMemo(() => {
		const styles = StyleSheet.create({
			container: {
				backgroundColor: theme.colors.surface,
				borderRadius: 12,
				marginBottom: 16,
				padding: 24,
			},
			header: {
				alignItems: 'center',
				flexDirection: 'row',
				marginBottom: 16,
			},
			headerIcon: {
				alignItems: 'center',
				backgroundColor: theme.colors.secondaryContainer,
				borderRadius: 12,
				height: 24,
				justifyContent: 'center',
				marginRight: 8,
				width: 24,
			},
			headerTitle: {
				color: theme.colors.onSurface,
				fontSize: 16,
				fontWeight: '600',
			},
			statChange: {
				fontSize: 12,
				fontWeight: '500',
			},
			statChangeNegative: {
				color: theme.trend.negative,
			},
			statChangePositive: {
				color: theme.trend.positive,
			},
			statHeader: {
				alignItems: 'center',
				flexDirection: 'row',
				marginBottom: 4,
			},
			statIcon: {
				alignItems: 'center',
				height: 20,
				justifyContent: 'center',
				marginRight: 6,
				width: 20,
			},
			statItem: {
				marginBottom: 16,
				width: '48%',
			},
			statLabel: {
				color: theme.colors.onSurfaceVariant,
				fontSize: 12,
				fontWeight: '500',
			},
			statValue: {
				color: theme.colors.onSurface,
				fontSize: 14,
				fontWeight: '600',
				marginRight: 6,
			},
			statValueContainer: {
				alignItems: 'center',
				flexDirection: 'row',
				flexWrap: 'wrap',
			},
			statsGrid: {
				flexDirection: 'row',
				flexWrap: 'wrap',
				justifyContent: 'space-between',
			},
		});
		return {
			...styles,
			colors: theme.colors, // Return original theme.colors for consistency
			theme,
			trend: trend,
		};
	}, [theme]);
};
