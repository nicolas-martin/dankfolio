import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme();

	return StyleSheet.create({
		errorText: {
			color: theme.colors.error,
			padding: 16,
			textAlign: 'center',
		},
		loadingText: {
			color: theme.colors.onSurface,
			padding: 16,
			textAlign: 'center',
		},
		transactionAmount: {
			color: theme.colors.onSurface,
			fontSize: 16,
			fontWeight: 'bold',
		},
		transactionDate: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 12,
		},
		transactionItem: {
			borderBottomColor: theme.colors.outline,
			borderBottomWidth: 1,
			flexDirection: 'row',
			justifyContent: 'space-between',
			padding: 16,
		},
		transactionType: {
			color: theme.colors.onSurface,
			fontSize: 16,
			fontWeight: 'bold',
		},
	});
};