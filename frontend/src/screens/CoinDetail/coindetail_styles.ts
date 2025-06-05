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
	scrollView: {
		flex: 1,
	},
	scrollViewContent: {
		paddingBottom: 100,
		paddingTop: 8,
	},

	// Price Display Card
	priceCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		marginHorizontal: 16,
		marginBottom: 16,
		padding: 20,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 8,
			},
			android: {
				elevation: 4,
			},
		}),
	},

	// Chart Container
	chartContainer: {
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		marginHorizontal: 16,
		marginBottom: 16,
		paddingVertical: 16,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 8,
			},
			android: {
				elevation: 4,
			},
		}),
	},

	// Timeframe Buttons
	timeframeCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		marginHorizontal: 16,
		marginBottom: 16,
		padding: 16,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 8,
			},
			android: {
				elevation: 4,
			},
		}),
	},

	// Holdings Card
	holdingsCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		marginHorizontal: 16,
		marginBottom: 16,
		padding: 20,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 8,
			},
			android: {
				elevation: 4,
			},
		}),
	},
	holdingsHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	holdingsIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: theme.colors.primaryContainer,
		marginRight: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	holdingsTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: theme.colors.onSurface,
		flex: 1,
	},
	holdingsContent: {
		gap: 12,
	},
	holdingsRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 4,
	},
	holdingsLabel: {
		fontSize: 15,
		color: theme.colors.onSurfaceVariant,
		fontWeight: '500',
	},
	holdingsValue: {
		fontSize: 15,
		color: theme.colors.onSurface,
		fontWeight: '600',
	},

	// About Section Card
	aboutCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		marginHorizontal: 16,
		marginBottom: 16,
		padding: 20,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: 2 },
				shadowOpacity: 0.1,
				shadowRadius: 8,
			},
			android: {
				elevation: 4,
			},
		}),
	},
	aboutHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	aboutIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: theme.colors.secondaryContainer,
		marginRight: 12,
		justifyContent: 'center',
		alignItems: 'center',
	},
	aboutTitle: {
		fontSize: 18,
		fontWeight: '600',
		color: theme.colors.onSurface,
		flex: 1,
	},

	// Trade Button
	tradeButtonContainer: {
		position: 'absolute',
		bottom: 0,
		left: 0,
		right: 0,
		backgroundColor: theme.colors.surface,
		paddingHorizontal: 16,
		paddingTop: 16,
		paddingBottom: Platform.select({
			ios: 34, // Account for home indicator
			android: 16,
		}),
		borderTopWidth: 1,
		borderTopColor: theme.colors.outline,
		...Platform.select({
			ios: {
				shadowColor: '#000',
				shadowOffset: { width: 0, height: -2 },
				shadowOpacity: 0.1,
				shadowRadius: 8,
			},
			android: {
				elevation: 8,
			},
		}),
	},
	tradeButton: {
		borderRadius: 12,
		paddingVertical: 4,
		shadowColor: '#00FF9F',
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.8,
		shadowRadius: 8,
		elevation: 10,
	},

	// Loading States
	centered: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
	},
	loadingContainer: {
		alignItems: 'center',
		paddingVertical: 20,
	},

	// Legacy styles for compatibility
	priceDisplayContainer: {
		// This will be replaced by priceCard
	},
	timeframeButtonsContainer: {
		// This will be replaced by timeframeCard
	},
	holdingsContainer: {
		// This will be replaced by holdingsCard
	},
	coinInfoContainer: {
		// This will be replaced by aboutCard
	},
});
