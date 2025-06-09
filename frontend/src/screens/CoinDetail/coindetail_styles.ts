import { StyleSheet, Platform } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		backgroundColor: theme.colors.background,
		flex: 1,
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
		marginBottom: 16,
		marginHorizontal: 16,
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
		marginBottom: 16,
		marginHorizontal: 16,
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
		marginBottom: 16,
		marginHorizontal: 16,
		padding: 12,
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
		marginBottom: 16,
		marginHorizontal: 16,
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
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 16,
	},
	holdingsIcon: {
		alignItems: 'center',
		backgroundColor: theme.colors.primaryContainer,
		borderRadius: 12,
		height: 24,
		justifyContent: 'center',
		marginRight: 12,
		width: 24,
	},
	holdingsTitle: {
		color: theme.colors.onSurface,
		flex: 1,
		fontSize: 18,
		fontWeight: '600',
	},
	holdingsContent: {
		gap: 12,
	},
	holdingsRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 4,
	},
	holdingsLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 15,
		fontWeight: '500',
	},
	holdingsValue: {
		color: theme.colors.onSurface,
		fontSize: 15,
		fontWeight: '600',
	},

	// About Section Card
	aboutCard: {
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		marginBottom: 16,
		marginHorizontal: 16,
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
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 16,
	},
	aboutIcon: {
		alignItems: 'center',
		backgroundColor: theme.colors.secondaryContainer,
		borderRadius: 12,
		height: 24,
		justifyContent: 'center',
		marginRight: 12,
		width: 24,
	},
	aboutTitle: {
		color: theme.colors.onSurface,
		flex: 1,
		fontSize: 18,
		fontWeight: '600',
	},

	// Trade Button
	tradeButtonContainer: {
		backgroundColor: theme.colors.surface,
		borderTopColor: theme.colors.outline,
		borderTopWidth: 1,
		bottom: 0,
		left: 0,
		paddingBottom: Platform.select({
			ios: 34, // Account for home indicator
			android: 16,
		}),
		paddingHorizontal: 16,
		paddingTop: 16,
		position: 'absolute',
		right: 0,
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
		elevation: 10,
		paddingVertical: 4,
		shadowColor: '#00FF9F',
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.8,
		shadowRadius: 8,
	},

	// Loading States
	centered: {
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
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
