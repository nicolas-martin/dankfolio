import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	amount: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2,
	},
	amountContainer: { // Legacy
		alignItems: 'flex-end',
	},
	amountInfo: {
		alignItems: 'flex-end',
		flex: 1,
	},
	amountRow: { // Legacy
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
	},
	amountSection: { // Main section's amount (e.g. for 'To' token if different styling)
		alignItems: 'flex-end',
		flex: 1,
	},
	amountUsd: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
	},
	amountValue: { // Main section's amount value (e.g. for 'To' token if different styling)
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
	},
	blurViewStyle: {
		flex: 1,
	},
	bottomSheetBackground: {
		backgroundColor: theme.colors.surface,
	},
	button: { // Legacy
		flex: 1,
	},
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
	cardHeader: { // Legacy
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 12,
	},
	cardIcon: { // Legacy
		alignItems: 'center',
		backgroundColor: theme.colors.primary,
		borderRadius: 14,
		height: 28,
		justifyContent: 'center',
		marginRight: 10,
		width: 28,
	},
	cardTitle: { // Legacy
		color: theme.colors.onSurfaceVariant,
		flex: 1,
		fontSize: 14,
		fontWeight: '600',
	},
	coinDetails: { // Main Coin Details (e.g. for 'From' token)
		flex: 1,
	},
	coinIcon: { // Main Coin Icon (e.g. for 'From' token)
		borderRadius: 20,
		height: 40,
		marginRight: 12,
		width: 40,
	},
	coinInfo: { // Main Coin Info container (e.g. for 'From' token)
		alignItems: 'center',
		flexDirection: 'row',
		flex: 1,
	},
	coinName: { // Main Coin Name (e.g. for 'From' token)
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
	},
	coinSymbol: { // Main Coin Symbol (e.g. for 'From' token)
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2,
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
	divider: {
		backgroundColor: theme.colors.outline,
		height: 1,
		marginVertical: 8,
		opacity: 0.2,
	},
	exchangeHeader: { // Legacy
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 8,
	},
	exchangeIcon: { // Legacy
		marginRight: 6,
	},
	exchangeRate: { // Legacy
		color: theme.colors.primary,
		fontSize: 14,
		fontWeight: '600',
		textAlign: 'center',
	},
	exchangeSection: { // Legacy
		backgroundColor: theme.colors.surface,
		borderColor: theme.colors.outline,
		borderRadius: 12,
		borderWidth: 1,
		marginBottom: 16,
		padding: 14,
	},
	feeContainer: { // Main Fee Container
		alignItems: 'center',
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 16,
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 40,
		padding: 20,
	},
	feeHeader: { // Legacy
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
		fontWeight: '600',
		marginBottom: 10,
	},
	feeLabel: { // Main Fee Label
		color: theme.colors.onSurfaceVariant,
		fontSize: 16,
	},
	feeRow: { // Legacy
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 6,
	},
	feeSection: { // Legacy
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 12,
		marginBottom: 16,
		padding: 14,
	},
	feeValue: { // Main Fee Value
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
	},
	handleIndicator: {
		backgroundColor: theme.colors.onSurface,
	},
	header: { // Legacy
		alignItems: 'center',
		marginBottom: 24,
	},
	label: { // Legacy
		color: theme.colors.onSurfaceVariant,
	},
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
	row: { // Legacy
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 8,
	},
	section: { // Legacy
		marginBottom: 16,
	},
	recipientAddressLink: {
		textDecorationLine: 'underline',
	},
	solscanButton: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: 4,
		paddingHorizontal: 8,
		paddingVertical: 4,
	},
	solscanText: {
		fontSize: 12,
		fontWeight: '500',
	},
	subValue: { // Legacy
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
		marginTop: 2,
	},
	subtitle: { // Legacy
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		textAlign: 'center',
	},
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
	title: { // Main Title
		color: theme.colors.onSurface,
		fontSize: 24,
		fontWeight: '700',
		marginBottom: 40,
		textAlign: 'center',
	},
	tokenDetails: { // For 'To' token section
		flex: 1,
	},
	tokenIcon: { // For 'To' token section
		borderRadius: 16,
		height: 32,
		marginRight: 12,
		width: 32,
	},
	tokenInfo: { // Legacy, distinct from coinInfo
		alignItems: 'center',
		flexDirection: 'row',
		flex: 1,
	},
	tokenName: { // For 'To' token section
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
	},
	tokenSection: { // Container for 'To' token info + amount
		alignItems: 'center',
		flexDirection: 'row',
		flex: 1,
		marginRight: 16,
	},
	tokenSymbol: { // For 'To' token section
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
		marginBottom: 2,
	},
	totalFeeLabel: { // Legacy
		color: theme.colors.onSurface,
		fontSize: 13,
		fontWeight: '600',
	},
	totalFeeRow: { // Legacy
		alignItems: 'center',
		borderTopColor: theme.colors.outline,
		borderTopWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: 4,
		paddingTop: 10,
	},
	totalFeeValue: { // Legacy
		color: theme.colors.onSurface,
		fontSize: 14,
		fontWeight: '700',
	},
	tradeCard: { // Legacy
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 16,
		marginBottom: 8,
		padding: 20,
	},
	tradeCardsContainer: { // Legacy
		marginBottom: 20,
		position: 'relative',
	},
	tradeContainer: { // Main Trade Container
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 20,
		marginBottom: 32,
		padding: 24,
		position: 'relative',
	},
	tradeRow: { // Main Trade Row
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 16,
	},
	value: { // Legacy
		fontWeight: '600',
	},
	valueContainer: { // Legacy
		alignItems: 'flex-end',
	},
});
