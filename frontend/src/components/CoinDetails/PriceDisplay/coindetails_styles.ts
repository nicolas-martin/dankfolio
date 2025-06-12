import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { TREND_COLORS } from '@/components/Chart/CoinChart/scripts';
import { AppTheme } from '@/utils/theme';

export const createStyles = (theme: AppTheme) => StyleSheet.create({
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
		color: TREND_COLORS.negative,
	},
	changePositive: {
		color: TREND_COLORS.positive,
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
	container: {
		padding: theme.spacing.lg,
	},
	copyIconStyle: { // New style
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
		marginRight: theme.spacing.md,
	},
	nameText: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.lg,
		fontWeight: '600',
	},
	odometerFontStyle: { // New style
		fontSize: theme.typography.fontSize['3xl'], // 30 is closest to 32
		fontVariant: ['tabular-nums'],
	},
	periodText: {
		fontSize: theme.typography.fontSize.sm,
	},
	pricePlaceholderText: { // New style
		fontSize: theme.typography.fontSize['3xl'], // 30 is closest to 32
	},
	priceText: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize['3xl'], // 30 is closest to 32
		fontWeight: 'bold',
	},
	timestampText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.xs,
		marginTop: theme.spacing.sm,
	},
});
