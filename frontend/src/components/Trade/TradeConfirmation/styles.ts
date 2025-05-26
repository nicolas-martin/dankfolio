import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		backgroundColor: theme.colors.surface,
		padding: 20,
		margin: 16,
		borderRadius: 20,
		maxWidth: 400,
		alignSelf: 'center',
		elevation: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15,
		shadowRadius: 12,
	},

	// Header Section
	header: {
		alignItems: 'center',
		marginBottom: 24,
	},
	title: {
		fontSize: 22,
		fontWeight: '700',
		color: theme.colors.onSurface,
		textAlign: 'center',
		marginBottom: 6,
	},
	subtitle: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'center',
	},

	// Trade Cards Container
	tradeCardsContainer: {
		position: 'relative',
		marginBottom: 20,
	},

	// Trade Summary Cards
	tradeCard: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 16,
		padding: 20,
		marginBottom: 8,
	},
	cardHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 12,
	},
	cardIcon: {
		width: 28,
		height: 28,
		borderRadius: 14,
		backgroundColor: theme.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 10,
	},
	cardTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: theme.colors.onSurfaceVariant,
		flex: 1,
	},
	
	// Amount Display
	amountRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
	},
	tokenInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},
	tokenIcon: {
		width: 24,
		height: 24,
		borderRadius: 12,
		backgroundColor: theme.colors.primary,
		alignItems: 'center',
		justifyContent: 'center',
		marginRight: 8,
	},
	tokenSymbol: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},
	amountContainer: {
		alignItems: 'flex-end',
	},
	amount: {
		fontSize: 18,
		fontWeight: '700',
		color: theme.colors.onSurface,
	},
	amountValue: {
		fontSize: 13,
		color: theme.colors.onSurfaceVariant,
		marginTop: 2,
	},

	// Swap Icon Container
	swapIconContainer: {
		position: 'absolute',
		top: '50%',
		left: '50%',
		transform: [{ translateX: -20 }, { translateY: -20 }],
		width: 40,
		height: 40,
		borderRadius: 20,
		backgroundColor: theme.colors.surface,
		borderWidth: 2,
		borderColor: theme.colors.outline,
		alignItems: 'center',
		justifyContent: 'center',
		zIndex: 1,
	},

	// Exchange Rate Section
	exchangeSection: {
		backgroundColor: theme.colors.surface,
		borderRadius: 12,
		padding: 14,
		marginBottom: 16,
		borderWidth: 1,
		borderColor: theme.colors.outline,
	},
	exchangeHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 8,
	},
	exchangeIcon: {
		marginRight: 6,
	},
	exchangeTitle: {
		fontSize: 13,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},
	exchangeRate: {
		fontSize: 14,
		fontWeight: '600',
		color: theme.colors.primary,
		textAlign: 'center',
	},

	// Fee Details Section
	feeSection: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		padding: 14,
		marginBottom: 16,
	},
	feeHeader: {
		fontSize: 13,
		fontWeight: '600',
		color: theme.colors.onSurfaceVariant,
		marginBottom: 10,
	},
	feeRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 6,
	},
	feeLabel: {
		fontSize: 13,
		color: theme.colors.onSurfaceVariant,
	},
	feeValue: {
		fontSize: 13,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},
	totalFeeRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingTop: 10,
		borderTopWidth: 1,
		borderTopColor: theme.colors.outline,
		marginTop: 4,
	},
	totalFeeLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},
	totalFeeValue: {
		fontSize: 14,
		fontWeight: '700',
		color: theme.colors.onSurface,
	},

	// Warning Section
	warningContainer: {
		backgroundColor: theme.colors.errorContainer,
		borderRadius: 12,
		padding: 14,
		marginBottom: 16,
		flexDirection: 'row',
		alignItems: 'flex-start',
	},
	warningIcon: {
		marginRight: 10,
		marginTop: 1,
	},
	warningText: {
		fontSize: 13,
		color: theme.colors.onErrorContainer,
		flex: 1,
		lineHeight: 18,
	},

	// Action Buttons
	buttonContainer: {
		flexDirection: 'row',
		gap: 12,
		marginTop: 4,
	},
	cancelButton: {
		flex: 1,
	},
	confirmButton: {
		flex: 1,
	},

	// Loading State
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 32,
	},
	loadingText: {
		fontSize: 15,
		color: theme.colors.onSurface,
		marginTop: 12,
		textAlign: 'center',
	},

	// Legacy styles for backward compatibility
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
	button: {
		flex: 1,
	},
}); 
