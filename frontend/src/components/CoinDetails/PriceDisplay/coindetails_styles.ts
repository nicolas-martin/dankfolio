import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { TREND_COLORS } from '@/components/Chart/CoinChart/scripts';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		padding: 16,
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	icon: {
		marginRight: 12,
	},
	nameText: {
		fontSize: 18,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},
	addressRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	addressText: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
	},
	priceText: {
		fontSize: 32,
		fontWeight: 'bold',
		color: theme.colors.onSurface,
	},
	changeRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginTop: 8,
	},
	changeText: {
		fontSize: 16,
		fontWeight: '600',
		marginRight: 8,
	},
	changePositive: {
		color: TREND_COLORS.positive,
	},
	changeNegative: {
		color: TREND_COLORS.negative,
	},
	periodText: {
		fontSize: 14,
	},
	timestampText: {
		fontSize: 12,
		color: theme.colors.onSurfaceVariant,
		marginTop: 8,
	},
});
