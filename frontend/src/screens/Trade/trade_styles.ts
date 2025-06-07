import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		backgroundColor: theme.colors.background,
		flex: 1,
	},
	noWalletContainer: {
		alignItems: 'center',
		backgroundColor: theme.colors.background,
		flex: 1,
		justifyContent: 'center',
		padding: 20,
	},
	noWalletText: {
		color: theme.colors.onSurface,
		fontSize: 16,
		marginBottom: 20,
		textAlign: 'center',
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
		color: theme.colors.onSurface,
		fontSize: 28,
		fontWeight: '700',
		marginBottom: 8,
		textAlign: 'center',
	},
	subtitle: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 16,
		textAlign: 'center',
	},

	// Trade Cards Container
	tradeContainer: {
		marginBottom: 24,
		position: 'relative',
	},

	// Trade Input Cards
	tradeCard: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 20,
		elevation: 2,
		marginBottom: 12,
		padding: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
	},
	cardLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		fontWeight: '600',
		letterSpacing: 0.5,
		marginBottom: 16,
		textTransform: 'uppercase',
	},

	// Swap Button Container
	swapButtonContainer: {
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		borderColor: theme.colors.background,
		borderRadius: 24,
		borderWidth: 2,
		elevation: 4,
		height: 48,
		justifyContent: 'center',
		left: '50%',
		position: 'absolute',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.15,
		shadowRadius: 8,
		transform: [{ translateX: -24 }],
		width: 48,
		zIndex: 10,
	},
	swapButton: {
		alignItems: 'center',
		backgroundColor: theme.colors.primary,
		borderRadius: 22,
		height: 44,
		justifyContent: 'center',
		width: 44,
	},

	// Trade Details Section
	detailsContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 16,
		marginBottom: 24,
		padding: 20,
	},
	detailsHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 16,
	},
	detailsIcon: {
		alignItems: 'center',
		backgroundColor: theme.colors.primary,
		borderRadius: 12,
		height: 24,
		justifyContent: 'center',
		marginRight: 8,
		width: 24,
	},
	detailsTitle: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
	},
	detailRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 12,
	},
	detailLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
	},
	detailValue: {
		color: theme.colors.onSurface,
		fontSize: 14,
		fontWeight: '600',
	},
	exchangeRateRow: {
		alignItems: 'center',
		borderTopColor: theme.colors.outline,
		borderTopWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 4,
		paddingTop: 12,
	},
	exchangeRateLabel: {
		alignItems: 'center',
		color: theme.colors.onSurfaceVariant,
		flexDirection: 'row',
		fontSize: 14,
	},
	exchangeRateValue: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '700',
	},

	// Action Button
	actionContainer: {
		padding: 20,
		paddingTop: 0,
	},
	tradeButton: {
		borderRadius: 16,
		elevation: 2,
		paddingVertical: 4,
		shadowColor: '#00FF9F',
		shadowOffset: { width: 0, height: 0 },
		shadowOpacity: 0.8,
		shadowRadius: 8,
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
		alignItems: 'center',
		flex: 1,
		justifyContent: 'center',
		padding: 20,
	},
	loadingText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 16,
		marginTop: 16,
		textAlign: 'center',
	},

	// Error States
	errorContainer: {
		alignItems: 'center',
		backgroundColor: theme.colors.errorContainer,
		borderRadius: 12,
		flexDirection: 'row',
		marginBottom: 20,
		padding: 16,
	},
	errorIcon: {
		marginRight: 12,
	},
	errorText: {
		color: theme.colors.onErrorContainer,
		flex: 1,
		fontSize: 14,
	},

	// Refresh Progress Bar
	refreshProgressContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		marginBottom: 20,
		padding: 16,
	},
	refreshProgressHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 12,
	},
	refreshProgressIcon: {
		marginRight: 8,
	},
	refreshProgressText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		fontWeight: '500',
	},
	refreshProgressBar: {
		borderRadius: 3,
		height: 6,
	},
	refreshProgressLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
		marginTop: 8,
		textAlign: 'center',
	},
}); 
