import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	leftSection: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 3,
		minWidth: 0,
		paddingRight: 8,
	},
	rightSection: {
		alignItems: 'flex-end',
		flex: 2,
		marginLeft: 8,
		minWidth: 100,
	},
	nameSection: {
		flex: 1,
		justifyContent: 'center',
		minWidth: 0,
		marginRight: 8,
	},
	logo: {
		width: 36,
		height: 36,
		borderRadius: 18,
		marginRight: 8,
		backgroundColor: theme.colors.surface,
	},
	symbol: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: 'bold',
		letterSpacing: 0.5,
	},
	name: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		marginTop: 4,
		letterSpacing: 0.25,
		flexShrink: 1,
	},
	price: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: 'bold',
		marginBottom: 4,
		letterSpacing: 0.5,
		textAlign: 'right',
	},
	volume: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
		marginBottom: 4,
		letterSpacing: 0.25,
		textAlign: 'right',
	},
	card: {
		marginHorizontal: 8,
		marginBottom: 8,
	},
	content: {
		padding: 12,
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
	},
});
