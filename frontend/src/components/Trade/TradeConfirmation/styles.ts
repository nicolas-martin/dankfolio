import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	container: {
		backgroundColor: theme.colors.surface,
		padding: 32,
		margin: 16,
		borderRadius: 24,
		maxWidth: 500,
		width: '90%',
		alignSelf: 'center',
		elevation: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 16,
	},

	// Header
	title: {
		fontSize: 24,
		fontWeight: '700',
		color: theme.colors.onSurface,
		textAlign: 'center',
		marginBottom: 40,
	},

	// Trade Container
	tradeContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 20,
		padding: 24,
		marginBottom: 32,
		position: 'relative',
	},

	// Trade Row
	tradeRow: {
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		paddingVertical: 16,
	},

	// Coin Info
	coinInfo: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
	},

	coinIcon: {
		width: 40,
		height: 40,
		borderRadius: 20,
		marginRight: 12,
	},

	coinDetails: {
		flex: 1,
	},

	coinSymbol: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.onSurface,
		marginBottom: 2,
	},

	coinName: {
		fontSize: 12,
		color: theme.colors.onSurfaceVariant,
	},

	// Amount Info
	amountInfo: {
		alignItems: 'flex-end',
		flex: 1,
	},

	amount: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.onSurface,
		marginBottom: 2,
	},

	amountUsd: {
		fontSize: 12,
		color: theme.colors.onSurfaceVariant,
	},

	// Divider
	divider: {
		height: 1,
		backgroundColor: theme.colors.outline,
		opacity: 0.2,
		marginVertical: 8,
	},

	// Token Section
	tokenSection: {
		flexDirection: 'row',
		alignItems: 'center',
		flex: 1,
		marginRight: 16,
	},
	tokenIcon: {
		width: 32,
		height: 32,
		borderRadius: 16,
		marginRight: 12,
	},
	tokenSymbol: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.onSurface,
		marginBottom: 2,
	},

	tokenDetails: {
		flex: 1,
	},

	tokenName: {
		fontSize: 12,
		color: theme.colors.onSurfaceVariant,
	},

	// Amount Section
	amountSection: {
		alignItems: 'flex-end',
		flex: 1,
	},
	amountValue: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
	},

	// Swap Icon
	swapIconContainer: {
		position: 'absolute',
		top: '50%',
		left: '50%',
		transform: [{ translateX: -16 }, { translateY: -16 }],
		width: 32,
		height: 32,
		borderRadius: 16,
		backgroundColor: theme.colors.surface,
		alignItems: 'center',
		justifyContent: 'center',
		elevation: 2,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 1 },
		shadowOpacity: 0.1,
		shadowRadius: 2,
	},

	// Fee Container
	feeContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 16,
		padding: 20,
		flexDirection: 'row',
		justifyContent: 'space-between',
		alignItems: 'center',
		marginBottom: 40,
	},
	feeLabel: {
		fontSize: 16,
		color: theme.colors.onSurfaceVariant,
	},
	feeValue: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.onSurface,
	},

	// Action Buttons
	buttonContainer: {
		flexDirection: 'row',
		gap: 16,
	},
	cancelButton: {
		flex: 1,
		borderRadius: 16,
		borderColor: theme.colors.outline,
		paddingVertical: 4,
	},
	cancelButtonLabel: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.onSurfaceVariant,
	},
	confirmButton: {
		flex: 1,
		borderRadius: 16,
		backgroundColor: theme.colors.primary,
		paddingVertical: 4,
	},
	confirmButtonLabel: {
		fontSize: 16,
		fontWeight: '600',
		color: theme.colors.onPrimary,
	},

	// Loading State
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 60,
	},
	loadingText: {
		fontSize: 16,
		color: theme.colors.onSurface,
		marginTop: 20,
		textAlign: 'center',
	},

	// Legacy styles for backward compatibility (keeping unused ones for tests)
	header: {
		alignItems: 'center',
		marginBottom: 24,
	},
	subtitle: {
		fontSize: 14,
		color: theme.colors.onSurfaceVariant,
		textAlign: 'center',
	},
	tradeCardsContainer: {
		position: 'relative',
		marginBottom: 20,
	},
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
	amountContainer: {
		alignItems: 'flex-end',
	},
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
	button: {
		flex: 1,
	},
}); 
