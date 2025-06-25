import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;

	return useMemo(() => {
		const styles = StyleSheet.create({
			card: {
				alignItems: 'center',
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.lg,
				flexDirection: 'row',
				justifyContent: 'flex-start',
				marginRight: theme.spacing.lg,
				minHeight: 44,
				paddingHorizontal: theme.spacing.sm,
				paddingVertical: theme.spacing.xs,
				// width: 140,
				...theme.shadows.sm,
			},
			iconContainer: {
				alignItems: 'center',
				height: 20,
				justifyContent: 'center',
				marginRight: theme.spacing.xs,
				width: 20,
			},
			shimmerIcon: {
				borderRadius: 10,
				height: 20,
				width: 20,
			},
			shimmerSymbol: {
				borderRadius: theme.borderRadius.sm,
				flex: 1,
				height: 12,
			},
			symbol: {
				color: theme.colors.onSurface,
				flex: 1,
				fontFamily: theme.typography.fontFamily.semiBold,
				fontSize: 12,
				textAlign: 'left',
			},
		});

		return {
			...styles,
			colors: theme.colors,
			theme,
		};
	}, [theme]);
}; 
