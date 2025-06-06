import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		alignSelf: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: 24,
		elevation: 8,
		margin: 16,
		maxWidth: 500,
		padding: 32,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 16,
		width: '90%',
	},

	// Header
	title: {
		color: theme.colors.onSurface,
		fontSize: 24,
		fontWeight: '700',
		marginBottom: 40,
		textAlign: 'center',
	},

	// Trade Container
	tradeContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 20,
		marginBottom: 32,
		padding: 24,
		position: 'relative',
	},

	// Trade Row
	tradeRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 16,
	},

	// Coin Info
	coinInfo: {
		alignItems: 'center',
		flexDirection: 'row',
		flex: 1,
	},

	coinIcon: {
		borderRadius: 20,
		height: 40,
		marginRight: 12,
		width: 40,
	},

	coinDetails: {
		flex: 1,
	},

	coinSymbol: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2,
	},

	coinName: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
	},

	// Amount Info
	amountInfo: {
		alignItems: 'flex-end',
		flex: 1,
	},

	amount: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2,
	},

	amountUsd: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
	},

	// Divider
	divider: {
		backgroundColor: theme.colors.outline,
		height: 1,
		marginVertical: 8,
		opacity: 0.2,
	},

	// Token Section
	tokenSection: {
		alignItems: 'center',
		flexDirection: 'row',
		flex: 1,
		marginRight: 16,
	},
	tokenIcon: {
		borderRadius: 16,
		height: 32,
		marginRight: 12,
		width: 32,
	},
	tokenSymbol: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2,
	},

	tokenDetails: {
		flex: 1,
	},

	tokenName: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
	},

	// Amount Section
	amountSection: {
		alignItems: 'flex-end',
		flex: 1,
	},
	amountValue: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
	},

	// Swap Icon
	swapIconContainer: {
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: 16,
		elevation: 2,
		height: 32,
		justifyContent: 'center',
		left: '50%',
		position: 'absolute',
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
		top: '50%',
		transform: [{ translateX: -16 }, { translateY: -16 }],
		width: 32,
	},

	// Fee Container
	feeContainer: {
		alignItems: 'center',
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 16,
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 40,
		padding: 20,
	},
	feeLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 16,
	},
	feeValue: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
	},

	// Action Buttons
	buttonContainer: {
		flexDirection: 'row',
		gap: 16,
	},
	cancelButton: {
		borderColor: theme.colors.outline,
		borderRadius: 16,
		flex: 1,
		paddingVertical: 4,
	},
	cancelButtonLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 16,
		fontWeight: '600',
	},
	confirmButton: {
		backgroundColor: theme.colors.primary,
		borderRadius: 16,
		flex: 1,
		paddingVertical: 4,
	},
	confirmButtonLabel: {
		color: theme.colors.onPrimary,
		fontSize: 16,
		fontWeight: '600',
	},

	// Loading State
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 60,
	},
	loadingText: {
		color: theme.colors.onSurface,
		fontSize: 16,
		marginTop: 20,
		textAlign: 'center',
	},

	// Legacy styles for backward compatibility (keeping unused ones for tests)
	header: {
		alignItems: 'center',
		marginBottom: 24,
	},
	subtitle: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		textAlign: 'center',
	},
	tradeCardsContainer: {
		marginBottom: 20,
		position: 'relative',
	},
	tradeCard: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 16,
		marginBottom: 8,
		padding: 20,
	},
	cardHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 12,
	},
	cardIcon: {
		alignItems: 'center',
		backgroundColor: theme.colors.primary,
		borderRadius: 14,
		height: 28,
		justifyContent: 'center',
		marginRight: 10,
		width: 28,
	},
	cardTitle: {
		color: theme.colors.onSurfaceVariant,
		flex: 1,
		fontSize: 14,
		fontWeight: '600',
	},
	amountRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	tokenInfo: {
		alignItems: 'center',
		flexDirection: 'row',
		flex: 1,
	},
	amountContainer: {
		alignItems: 'flex-end',
	},
	exchangeSection: {
		backgroundColor: theme.colors.surface,
		borderColor: theme.colors.outline,
		borderRadius: 12,
		borderWidth: 1,
		marginBottom: 16,
		padding: 14,
	},
	exchangeHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 8,
	},
	exchangeIcon: {
		marginRight: 6,
	},
	exchangeTitle: {
		color: theme.colors.onSurface,
		fontSize: 13,
		fontWeight: '600',
	},
	exchangeRate: {
		color: theme.colors.primary,
		fontSize: 14,
		fontWeight: '600',
		textAlign: 'center',
	},
	feeSection: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		marginBottom: 16,
		padding: 14,
	},
	feeHeader: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 10,
	},
	feeRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 6,
	},
	totalFeeRow: {
		alignItems: 'center',
		borderTopColor: theme.colors.outline,
		borderTopWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 4,
		paddingTop: 10,
	},
	totalFeeLabel: {
		color: theme.colors.onSurface,
		fontSize: 13,
		fontWeight: '600',
	},
	totalFeeValue: {
		color: theme.colors.onSurface,
		fontSize: 14,
		fontWeight: '700',
	},
	section: {
		marginBottom: 16,
	},
	row: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
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
	button: {
		flex: 1,
	},
}); 
