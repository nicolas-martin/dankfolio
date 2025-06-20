import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;

	const createChangeTextStyle = (isPositive: boolean) => [
		{
			fontSize: theme.typography.fontSize.base,
			fontWeight: '600' as const,
			marginRight: theme.spacing.sm,
		},
		isPositive ? { color: theme.trend.positive } : { color: theme.trend.negative }
	];
	const styles = StyleSheet.create({
		addressRow: {
			alignItems: 'center',
			flexDirection: 'row',
			marginBottom: theme.spacing.lg,
		},
		addressText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.sm,
		},
		changeNegative: {
			color: theme.trend.negative,
		},
		changePositive: {
			color: theme.trend.positive,
		},
		changeRow: {
			alignItems: 'center',
			flexDirection: 'row',
			marginTop: theme.spacing.sm,
		},
		changeText: {
			fontSize: theme.typography.fontSize.base,
			fontWeight: '600',
			marginRight: theme.spacing.sm,
		},
		coinInfoContainer: {
			flex: 1,
			justifyContent: 'center',
			paddingLeft: theme.spacing.md,
		},
		container: {
			padding: theme.spacing.lg,
		},
		copyIconStyle: {
			margin: 0,
			marginLeft: theme.spacing.sm,
			padding: 0,
		},
		headerRow: {
			alignItems: 'center',
			flexDirection: 'row',
			marginBottom: theme.spacing.sm,
		},
		icon: {
			marginRight: theme.spacing.lg,
		},
		nameText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.sm,
			fontWeight: '400',
			marginTop: 2,
		},
		odometerFontStyle: { // New style
			fontSize: theme.typography.fontSize['3xl'],
			fontVariant: ['tabular-nums'],
		},
		periodTextStyle: {
			color: colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.sm,
		},
		pricePlaceholderText: { // New style
			fontSize: theme.typography.fontSize['3xl'],
		},
		priceText: {
			color: theme.colors.onSurface,
			fontSize: theme.typography.fontSize['3xl'],
			fontWeight: 'bold',
		},
		symbolText: {
			color: theme.colors.onSurface,
			fontSize: theme.typography.fontSize.lg,
			fontWeight: '600',
		},
		timestampText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.xs,
			marginTop: theme.spacing.sm,
		},
	})
	return {
		...styles,
		colors,
		theme,
		createChangeTextStyle
	};
};
