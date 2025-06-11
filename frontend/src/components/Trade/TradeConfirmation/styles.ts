import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	amount: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
		marginBottom: theme.spacing.xs,
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
		fontSize: theme.typography.fontSize.xs,
	},
	amountValue: { // Main section's amount value (e.g. for 'To' token if different styling)
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.sm,
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
		gap: theme.spacing.lg,
	},
	cancelButton: {
		borderColor: theme.colors.outline,
		borderRadius: theme.borderRadius.lg,
		flex: 1,
		paddingVertical: theme.spacing.xs,
	},
	cancelButtonLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
	},
	cardHeader: { // Legacy
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: theme.spacing.md,
	},
	cardIcon: { // Legacy
		alignItems: 'center',
		backgroundColor: theme.colors.primary,
		borderRadius: theme.borderRadius.md,
		height: theme.spacing['3xl'],
		justifyContent: 'center',
		marginRight: theme.spacing.md,
		width: theme.spacing['3xl'],
	},
	cardTitle: { // Legacy
		color: theme.colors.onSurfaceVariant,
		flex: 1,
		fontSize: theme.typography.fontSize.sm,
		fontWeight: '600',
	},
	coinDetails: { // Main Coin Details (e.g. for 'From' token)
		flex: 1,
	},
	coinIcon: { // Main Coin Icon (e.g. for 'From' token)
		borderRadius: theme.spacing.xl,
		height: theme.spacing['4xl'],
		marginRight: theme.spacing.md,
		width: theme.spacing['4xl'],
	},
	coinInfo: { // Main Coin Info container (e.g. for 'From' token)
		alignItems: 'center',
		flexDirection: 'row',
		flex: 1,
	},
	coinName: { // Main Coin Name (e.g. for 'From' token)
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.xs,
	},
	coinSymbol: { // Main Coin Symbol (e.g. for 'From' token)
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
		marginBottom: theme.spacing.xs,
	},
	confirmButton: {
		backgroundColor: theme.colors.primary,
		borderRadius: theme.borderRadius.lg,
		flex: 1,
		paddingVertical: theme.spacing.xs,
	},
	confirmButtonLabel: {
		color: theme.colors.onPrimary,
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
	},
	container: {
		alignSelf: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: theme.spacing['2xl'],
		elevation: 8,
		margin: theme.spacing.lg,
		maxWidth: 500,
		padding: theme.spacing['3xl'],
		shadowColor: theme.colors.onBackground,
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.1,
		shadowRadius: 16,
		width: '90%',
	},
	divider: {
		backgroundColor: theme.colors.outline,
		height: 1,
		marginVertical: theme.spacing.sm,
		opacity: 0.2,
	},
	exchangeHeader: { // Legacy
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: theme.spacing.sm,
	},
	exchangeIcon: { // Legacy
		marginRight: theme.spacing.sm,
	},
	exchangeRate: { // Legacy
		color: theme.colors.primary,
		fontSize: theme.typography.fontSize.sm,
		fontWeight: '600',
		textAlign: 'center',
	},
	exchangeSection: { // Legacy
		backgroundColor: theme.colors.surface,
		borderColor: theme.colors.outline,
		borderRadius: theme.borderRadius.md,
		borderWidth: 1,
		marginBottom: theme.spacing.lg,
		padding: theme.spacing.lg,
	},
	feeContainer: { // Main Fee Container
		alignItems: 'center',
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: theme.borderRadius.lg,
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: theme.spacing['4xl'],
		padding: theme.spacing.xl,
	},
	feeHeader: { // Legacy
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.xs,
		fontWeight: '600',
		marginBottom: theme.spacing.md,
	},
	feeLabel: { // Main Fee Label
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.base,
	},
	feeRow: { // Legacy
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: theme.spacing.sm,
	},
	feeSection: { // Legacy
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: theme.borderRadius.md,
		marginBottom: theme.spacing.lg,
		padding: theme.spacing.lg,
	},
	feeValue: { // Main Fee Value
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
	},
	handleIndicator: {
		backgroundColor: theme.colors.onSurface,
	},
	header: { // Legacy
		alignItems: 'center',
		marginBottom: theme.spacing['2xl'],
	},
	label: { // Legacy
		color: theme.colors.onSurfaceVariant,
	},
	loadingContainer: {
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: theme.spacing['4xl'], // Was 60, 4xl is 40. Closest available.
	},
	loadingText: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		marginTop: theme.spacing.xl,
		textAlign: 'center',
	},
	recipientAddressLink: {
		textDecorationLine: 'underline',
	},
	row: { // Legacy
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: theme.spacing.sm,
	},
	section: { // Legacy
		marginBottom: theme.spacing.lg,
	},
	solscanButton: {
		alignItems: 'center',
		flexDirection: 'row',
		gap: theme.spacing.xs,
		paddingHorizontal: theme.spacing.sm,
		paddingVertical: theme.spacing.xs,
	},
	solscanText: {
		fontSize: theme.typography.fontSize.xs,
		fontWeight: '500',
	},
	subValue: { // Legacy
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.xs,
		marginTop: theme.spacing.xs,
	},
	subtitle: { // Legacy
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.sm,
		textAlign: 'center',
	},
	swapIconContainer: {
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: theme.borderRadius.lg,
		elevation: 2, // Left as is, MD3Theme.elevation.levelX are colors.
		height: theme.spacing['3xl'],
		justifyContent: 'center',
		left: '50%',
		position: 'absolute',
		shadowColor: theme.colors.onBackground,
		shadowOffset: { width: 0, height: 1 }, // Left as is
		shadowOpacity: 0.1, // Left as is
		shadowRadius: 2, // Left as is
		top: '50%',
		transform: [{ translateX: -theme.spacing.lg }, { translateY: -theme.spacing.lg }],
		width: theme.spacing['3xl'],
	},
	title: { // Main Title
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize['2xl'],
		fontWeight: '700',
		marginBottom: theme.spacing['4xl'],
		textAlign: 'center',
	},
	tokenDetails: { // For 'To' token section
		flex: 1,
	},
	tokenIcon: { // For 'To' token section
		borderRadius: theme.borderRadius.lg,
		height: theme.spacing['3xl'],
		marginRight: theme.spacing.md,
		width: theme.spacing['3xl'],
	},
	tokenInfo: { // Legacy, distinct from coinInfo
		alignItems: 'center',
		flexDirection: 'row',
		flex: 1,
	},
	tokenName: { // For 'To' token section
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.xs,
	},
	tokenSection: { // Container for 'To' token info + amount
		alignItems: 'center',
		flexDirection: 'row',
		flex: 1,
		marginRight: theme.spacing.lg,
	},
	tokenSymbol: { // For 'To' token section
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
		marginBottom: theme.spacing.xs,
	},
	totalFeeLabel: { // Legacy
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.xs,
		fontWeight: '600',
	},
	totalFeeRow: { // Legacy
		alignItems: 'center',
		borderTopColor: theme.colors.outline,
		borderTopWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: theme.spacing.xs,
		paddingTop: theme.spacing.md,
	},
	totalFeeValue: { // Legacy
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.sm,
		fontWeight: '700',
	},
	tradeCard: { // Legacy
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: theme.borderRadius.lg,
		marginBottom: theme.spacing.sm,
		padding: theme.spacing.xl,
	},
	tradeCardsContainer: { // Legacy
		marginBottom: theme.spacing.xl,
		position: 'relative',
	},
	tradeContainer: { // Main Trade Container
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: theme.spacing.xl,
		marginBottom: theme.spacing['3xl'],
		padding: theme.spacing['2xl'],
		position: 'relative',
	},
	tradeRow: { // Main Trade Row
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: theme.spacing.lg,
	},
	value: { // Legacy
		fontWeight: '600',
	},
	valueContainer: { // Legacy
		alignItems: 'flex-end',
	},
});
