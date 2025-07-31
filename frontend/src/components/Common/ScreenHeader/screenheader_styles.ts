import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const styles = StyleSheet.create({
			fixedHeader: {
				backgroundColor: theme.colors.background,
				paddingBottom: theme.spacing.lg,
				paddingHorizontal: theme.spacing.xl,
				paddingTop: theme.spacing.xl,
			},
			headerContent: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
			},
			headerSubtitle: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '400',
				marginTop: theme.spacing.xs,
			},
			headerTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize['2xl'],
				fontWeight: '700',
			},
			rightActionButton: {
				marginRight: -8,
			},
			titleContainer: {
				flex: 1,
			},
		});

		return {
			...styles,
			colors: theme.colors,
			theme,
		};
	}, [theme]);
};