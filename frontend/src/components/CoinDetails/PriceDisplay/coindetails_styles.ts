import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		// Remove padding since it's now handled by the card
	},
	headerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	icon: {
		width: 40,
		height: 40,
		borderRadius: 20,
	},
	nameText: {
		marginLeft: 12,
		fontSize: 20,
		fontWeight: '600',
	},
	addressRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 20,
	},
	addressText: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		fontFamily: 'monospace',
	},
	priceText: {
		marginBottom: 8,
		fontSize: 32,
		fontWeight: '700',
		letterSpacing: -0.5,
	},
	changeRow: {
		flexDirection: 'row',
		alignItems: 'baseline',
		gap: 8,
	},
	changeText: {
		fontSize: 16,
		fontWeight: '600',
	},
	changePositive: {
		color: '#2E7D32',
	},
	changeNegative: {
		color: '#D32F2F',
	},
	periodText: {
		fontSize: 14,
		fontWeight: '500',
	},
	timestampText: {
		marginTop: 8,
		fontSize: 12,
		color: theme.colors.onSurfaceVariant,
	},
});
