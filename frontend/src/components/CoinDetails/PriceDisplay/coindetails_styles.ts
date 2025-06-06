import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { TREND_COLORS } from '@/components/Chart/CoinChart/scripts';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	addressRow: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 16,
	},
	addressText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
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
		marginTop: 8,
	},
	changeText: {
		fontSize: 16,
		fontWeight: '600',
		marginRight: 8,
	},
	container: {
		padding: 16,
	},
	headerRow: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 8,
	},
	icon: {
		marginRight: 12,
	},
	nameText: {
		color: theme.colors.onSurface,
		fontSize: 18,
		fontWeight: '600',
	},
	periodText: {
		fontSize: 14,
	},
	priceText: {
		color: theme.colors.onSurface,
		fontSize: 32,
		fontWeight: 'bold',
	},
	timestampText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
		marginTop: 8,
	},
});
