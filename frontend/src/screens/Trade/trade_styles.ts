import { StyleSheet } from 'react-native';
import { theme } from '../../utils/theme';

export const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	keyboardAvoidingView: {
		flex: 1,
	},
	scrollView: {
		flex: 1,
	},
	tradeContainer: {
		backgroundColor: theme.colors.surface,
		borderRadius: 20,
		padding: 20,
		margin: 20,
	},
	valueInfo: {
		marginTop: -8,
		marginBottom: 12,
		paddingHorizontal: 12,
	},
	valueText: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'right',
	},
	priceText: {
		fontSize: 12,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'right',
		marginTop: 2,
	},
});
