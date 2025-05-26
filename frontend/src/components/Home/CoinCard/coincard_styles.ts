import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	card: {
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		marginBottom: 12,
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 1,
		},
		shadowOpacity: 0.08,
		shadowRadius: 4,
		elevation: 2,
	},
	content: {
		padding: 16,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
	leftSection: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		minWidth: 0,
		paddingRight: 12,
	},
	coinIcon: {
		width: 44,
		height: 44,
		borderRadius: 22,
		marginRight: 16,
		backgroundColor: theme.colors.surfaceVariant,
		justifyContent: 'center',
		alignItems: 'center',
	},
	logo: {
		width: 44,
		height: 44,
		borderRadius: 22,
		marginRight: 16,
	},
	nameSection: {
		flex: 1,
		justifyContent: 'center',
		minWidth: 0,
	},
	symbol: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
		letterSpacing: 0.2,
		marginBottom: 2,
	},
	balance: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
		fontWeight: '400',
		letterSpacing: 0.1,
	},
	name: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
		fontWeight: '400',
		letterSpacing: 0.1,
		flexShrink: 1,
	},
	rightSection: {
		alignItems: 'flex-end',
		justifyContent: 'center',
		minWidth: 80,
	},
	price: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
		letterSpacing: 0.2,
		marginBottom: 2,
		textAlign: 'right',
	},
	volume: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
		fontWeight: '400',
		letterSpacing: 0.1,
		textAlign: 'right',
	},
	changePositive: {
		color: '#2E7D32',
		fontSize: 13,
		fontWeight: '500',
		textAlign: 'right',
	},
	changeNegative: {
		color: '#D32F2F',
		fontSize: 13,
		fontWeight: '500',
		textAlign: 'right',
	},
	changeNeutral: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
		fontWeight: '400',
		textAlign: 'right',
	},
});
