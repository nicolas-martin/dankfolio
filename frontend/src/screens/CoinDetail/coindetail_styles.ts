import { StyleSheet, Platform } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	content: {
		flex: 1,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 16,
		paddingTop: 8,
		paddingBottom: 8,
	},
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	scrollView: {
		flex: 1,
	},
	scrollViewContent: {
		paddingBottom: 80,
	},
	priceDisplayContainer: {
		padding: 16,
		borderRadius: 8,
		margin: 16,
		backgroundColor: theme.colors.surfaceVariant,
	},
	timeframeButtonsContainer: {
		marginHorizontal: 16,
		marginVertical: 16,
	},
	holdingsContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 8,
		padding: 16,
		marginHorizontal: 32,
		marginBottom: 32,
	},
	holdingsTitle: {
		fontSize: 24,
		fontWeight: 'bold',
		marginBottom: 16,
		color: theme.colors.onSurface,
	},
	holdingsDetails: {
		marginBottom: 8,
	},
	holdingsDetailRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	holdingsDetailLabel: {
		fontSize: 16,
		color: theme.colors.onSurfaceVariant,
	},
	holdingsDetailValue: {
		fontSize: 16,
		color: theme.colors.onSurface,
		fontWeight: 'bold',
	},
	coinInfoContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 8,
		padding: 16,
		marginHorizontal: 32,
		marginBottom: 160,
	},
	loadingContainer: {
		alignItems: 'center',
	},
	tradeButtonContainer: {
		padding: 16,
	},
	tradeButton: {
		backgroundColor: theme.colors.primary,
	},
	tradeButtonLabel: {
		color: theme.colors.onPrimary,
	},
});
