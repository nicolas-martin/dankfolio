import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: theme.colors.background,
	},
	noWalletContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: theme.colors.background,
		padding: 20,
	},
	noWalletText: {
		fontSize: 16,
		color: theme.colors.onSurface,
		textAlign: 'center',
		marginBottom: 20,
	},
	scrollView: {
		flex: 1,
	},
	content: {
		padding: 20,
	},

	// Header Section
	header: {
		alignItems: 'center',
		marginBottom: 32,
	},
	title: {
		fontSize: 28,
		fontWeight: '700',
		color: theme.colors.onSurface,
		textAlign: 'center',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 16,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'center',
	},

	// Trade Cards Container
	tradeContainer: {
		position: 'relative',
		marginBottom: 24,
	},

	// Trade Input Cards
	tradeCard: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 20,
		padding: 20,
		marginBottom: 12,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	cardLabel: {
		fontSize: 14,
		fontWeight: '600',
		color: theme.colors.onSurfaceVariant,
		marginBottom: 16,
		textTransform: 'uppercase',
		letterSpacing: 0.5,
	},

	// Swap Button Container
	swapButtonContainer: {
		position: 'absolute',
		top: '50%',
		left: '50%',
		transform: [{ translateX: -24 }, { translateY: -24 }],
		zIndex: 10,
		backgroundColor: theme.colors.surface,
		borderRadius: 24,
		width: 48,
		height: 48,
		justifyContent: 'center',
		alignItems: 'center',
		elevation: 4,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		borderWidth: 2,
		borderColor: theme.colors.background,
	},
	swapButton: {
		width: 44,
		height: 44,
		borderRadius: 22,
		backgroundColor: theme.colors.primary,
		justifyContent: 'center',
		alignItems: 'center',
	},

	// Trade Details Section
	detailsContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 16,
		padding: 20,
		marginBottom: 24,
	},
	detailsHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 16,
	},
	detailsIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: theme.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
	},
	detailsTitle: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},
	detailRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 12,
	},
	detailLabel: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
	},
	detailValue: {
		fontSize: 14,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},
	exchangeRateRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingTop: 12,
		borderTopWidth: 1,
		borderTopColor: theme.colors.outline,
		marginTop: 4,
	},
	exchangeRateLabel: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		flexDirection: 'row',
		alignItems: 'center',
	},
	exchangeRateValue: {
		fontSize: 16,
		fontWeight: '700',
		color: theme.colors.onSurface,
	},

	// Action Button
	actionContainer: {
		padding: 20,
		paddingTop: 0,
	},
	tradeButton: {
		borderRadius: 16,
		paddingVertical: 4,
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	tradeButtonContent: {
		paddingVertical: 12,
	},
	tradeButtonLabel: {
		fontSize: 18,
		fontWeight: '700',
	},

	// Loading States
	loadingContainer: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		padding: 20,
	},
	loadingText: {
		fontSize: 16,
		color: theme.colors.onSurfaceVariant,
		marginTop: 16,
		textAlign: 'center',
	},

	// Error States
	errorContainer: {
		backgroundColor: theme.colors.errorContainer,
		borderRadius: 12,
		padding: 16,
		marginBottom: 20,
		flexDirection: 'row',
		alignItems: 'center',
	},
	errorIcon: {
		marginRight: 12,
	},
	errorText: {
		flex: 1,
		fontSize: 14,
		color: theme.colors.onErrorContainer,
	},

	// Price Impact Warning
	warningContainer: {
		backgroundColor: '#FFF3E0',
		borderRadius: 12,
		padding: 16,
		marginBottom: 20,
		flexDirection: 'row',
		alignItems: 'center',
		borderLeftWidth: 4,
		borderLeftColor: '#FF9800',
	},
	warningIcon: {
		marginRight: 12,
	},
	warningText: {
		flex: 1,
		fontSize: 14,
		color: '#E65100',
		fontWeight: '500',
	},

	// Refresh Progress Bar
	refreshProgressContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		padding: 16,
		marginBottom: 20,
	},
	refreshProgressHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	refreshProgressIcon: {
		marginRight: 8,
	},
	refreshProgressText: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		fontWeight: '500',
	},
	refreshProgressBar: {
		height: 6,
		borderRadius: 3,
	},
	refreshProgressLabel: {
		fontSize: 12,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'center',
		marginTop: 8,
	},
}); 
