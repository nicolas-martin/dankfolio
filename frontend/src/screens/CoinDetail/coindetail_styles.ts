import { StyleSheet, Platform } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
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
		flexDirection: 'row',
		justifyContent: 'center',
		marginVertical: 16,
	},
	timeframeButtonsInnerContainer: {
		justifyContent: 'center',
		gap: 12,
		paddingHorizontal: 8,
	},
	timeframeButton: {
		paddingVertical: 8,
		paddingHorizontal: 8,
		alignItems: 'center',
	},
	timeframeButtonText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		fontWeight: '500',
	},
	timeframeButtonTextSelected: {
		color: theme.colors.primary,
	},
	timeframeButtonUnderline: {
		height: 2,
		width: '80%',
		backgroundColor: theme.colors.primary,
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
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		padding: 16,
		borderTopWidth: 1,
		borderTopColor: theme.colors.outline,
		shadowColor: "#000",
		shadowOffset: {
			width: 0,
			height: -3,
		},
		shadowOpacity: 0.3,
		shadowRadius: 4,
		elevation: 5,
	},
	tradeButton: {
		backgroundColor: theme.colors.primary,
	},
	tradeButtonLabel: {
		color: theme.colors.onPrimary,
	},
});
