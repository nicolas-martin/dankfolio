import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		padding: 20,
		backgroundColor: theme.colors.surface,
		borderRadius: 12,
	},
	title: {
		fontSize: 20,
		fontWeight: 'bold',
		marginBottom: 20,
		textAlign: 'center',
	},
	section: {
		marginBottom: 16,
	},
	row: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 8,
	},
	label: {
		color: theme.colors.onSurfaceVariant,
	},
	valueContainer: {
		alignItems: 'flex-end',
	},
	value: {
		fontWeight: '600',
	},
	subValue: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
		marginTop: 2,
	},
	divider: {
		height: 1,
		backgroundColor: theme.colors.outlineVariant,
		marginVertical: 16,
	},
	buttonContainer: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 20,
		gap: 12,
	},
	button: {
		flex: 1,
	},
	warningText: {
		color: theme.colors.error,
		fontSize: 12,
		marginTop: 8,
	},
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 20,
	},
}); 
