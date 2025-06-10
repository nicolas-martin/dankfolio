import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
	actionSection: {
		marginTop: 8,
		width: '100%',
	},
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
	amountSection: {
		alignItems: 'flex-end',
		flex: 1,
	},
	amountUsd: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
	},
	amountValue: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
	},
	blurViewStyle: {
		flex: 1,
	},
	bottomSheetBackground: {
		backgroundColor: theme.colors.surface,
	},
	bottomSheetViewContainer: {
		flex: 1,
		padding: 20,
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
	closeButton: { // Properties are already sorted
		backgroundColor: '#4CAF50',
		borderRadius: 16,
		elevation: 3,
		paddingVertical: 8,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
	},
	coinDetails: {
		flex: 1,
	},
	coinIcon: {
		borderRadius: 20,
		height: 40,
		marginRight: 12,
		width: 40,
	},
	coinInfo: {
		alignItems: 'center',
		flexDirection: 'row',
		flex: 1,
	},
	coinName: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
	},
	coinSymbol: {
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
	confirmationsText: {
		// color: '#4CAF50',
		fontSize: 14,
		fontWeight: '700',
		// backgroundColor: '#E8F5E8',
		paddingHorizontal: 12,
		paddingVertical: 4,
		borderRadius: 12,
		overflow: 'hidden',
	},
	container: {
		alignSelf: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: 20, // Corrected from 24 to 20 to match modalContainer in another file if intended for consistency, or keep 24 if specific. Assuming 20 for now.
		elevation: 8,
		margin: 16,
		maxWidth: 400, // Example: Changed from 500
		padding: 20, // Example: Changed from 32
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 4 },
		shadowOpacity: 0.15, // Example: Changed from 0.1
		shadowRadius: 12, // Example: Changed from 16
		width: 360, // Example: Changed from '90%'
	},
	divider: {
		backgroundColor: theme.colors.outline,
		height: 1,
		marginVertical: 8,
		opacity: 0.2,
	},
	errorHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: 8,
	},
	errorIcon: {
		marginRight: 8,
	},
	errorSection: {
		backgroundColor: theme.colors.errorContainer,
		borderRadius: 12,
		marginBottom: 16,
		padding: 14,
		width: '100%',
	},
	errorText: {
		color: theme.colors.onErrorContainer,
		fontSize: 13,
		lineHeight: 18,
	},
	errorTitle: {
		color: theme.colors.onErrorContainer,
		fontSize: 13,
		fontWeight: '600',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
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
	feeContainer: {
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
	feeLabel: {
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
	feeValue: {
		color: theme.colors.onSurface,
		fontSize: 16,
		fontWeight: '600',
	},
	handleIndicator: {
		backgroundColor: theme.colors.onSurface,
	},
	hashContainer: {
		backgroundColor: theme.colors.surface,
		borderColor: theme.colors.outline,
		borderRadius: 8,
		borderWidth: 1,
		marginBottom: 10,
		padding: 10,
	},
	hashLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 11,
		letterSpacing: 0.5,
		marginBottom: 4,
		textTransform: 'uppercase',
	},
	hashText: {
		color: theme.colors.onSurface,
		fontFamily: 'monospace',
		fontSize: 13,
		fontWeight: '500',
	},
	header: {
		alignItems: 'center',
		marginBottom: 24,
	},
	label: { // Legacy
		color: theme.colors.onSurfaceVariant,
	},
	linkButton: {
		backgroundColor: 'transparent',
		borderColor: '#2196F3', // Consider theme color
		borderRadius: 12,
		borderWidth: 1,
		marginHorizontal: 0,
	},
	loadingContainer: { // Main loading state for modal content
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 60, // Adjusted from legacy
	},
	loadingDescription: { // Legacy
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
		marginTop: 6,
		opacity: 0.8,
		textAlign: 'center',
	},
	loadingText: { // Main loading text
		color: theme.colors.onSurface,
		fontSize: 16, // Adjusted from legacy
		marginTop: 20, // Adjusted from legacy
		textAlign: 'center',
	},
	progressBar: {
		backgroundColor: '#E0E0E0', // Consider theme color
		borderRadius: 6,
		height: 12,
		overflow: 'hidden',
	},
	progressDot: { // Legacy, but might be used by progressIndicator if that's generic
		backgroundColor: theme.colors.primary,
		borderRadius: 3,
		height: 6,
		marginRight: 4,
		width: 6,
	},
	progressFill: {
		backgroundColor: '#4CAF50', // Consider theme color (e.g. theme.colors.primary)
		borderRadius: 6,
		height: '100%',
	},
	progressHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 16,
		minHeight: 20,
	},
	progressIndicator: {
		alignItems: 'center',
		flexDirection: 'row',
		marginTop: 8,
	},
	progressLabel: {
		color: theme.colors.onSurface,
		fontSize: 14,
		fontWeight: '600',
		marginRight: 16,
	},
	progressSection: {
		backgroundColor: theme.colors.surface,
		borderColor: theme.colors.outline,
		borderRadius: 16,
		borderWidth: 1,
		marginBottom: 24,
		padding: 20,
		width: '100%',
	},
	progressText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
		marginLeft: 4,
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
	statusDescription: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 14,
		lineHeight: 20,
		opacity: 0.8,
		textAlign: 'center',
	},
	statusIconContainer: {
		alignItems: 'center',
		borderRadius: 40,
		elevation: 4,
		height: 80,
		justifyContent: 'center',
		marginBottom: 20,
		shadowColor: '#000',
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 8,
		width: 80,
	},
	statusIconError: {
		backgroundColor: theme.colors.error,
	},
	statusIconLoading: {
		backgroundColor: theme.colors.surfaceVariant,
	},
	statusIconSuccess: {
		backgroundColor: '#4CAF50', // Consider theme.colors.primary or a success color from theme
	},
	statusIconWarning: {
		backgroundColor: '#FF9800', // Consider a warning color from theme
	},
	statusSection: {
		alignItems: 'center',
		marginBottom: 32,
		paddingHorizontal: 20,
	},
	statusText: {
		fontSize: 20,
		fontWeight: '700',
		marginBottom: 8,
		textAlign: 'center',
	},
	statusTextError: {
		color: theme.colors.error,
	},
	statusTextLoading: {
		color: theme.colors.onSurface,
	},
	statusTextSuccess: {
		color: '#4CAF50', // Consider theme.colors.primary or a success color
	},
	statusTextWarning: {
		color: '#FF9800', // Consider a warning color
	},
	subValue: { // Legacy
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
		marginTop: 2,
	},
	subtitle: {
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
	title: {
		color: theme.colors.onSurface,
		fontSize: 22, // Example: Changed from 24
		fontWeight: '700',
		marginBottom: 24, // Example: Changed from 40
		textAlign: 'center',
	},
	tokenDetails: { // From "Token Section" context, distinct from "Coin Details"
		flex: 1,
	},
	tokenIcon: { // From "Token Section" context
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
	tokenName: { // From "Token Section" context
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
	},
	tokenSection: {
		alignItems: 'center',
		flexDirection: 'row',
		flex: 1,
		marginRight: 16,
	},
	tokenSymbol: { // From "Token Section" context
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
	tradeContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: 20,
		marginBottom: 32,
		padding: 24,
		position: 'relative',
	},
	tradeRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: 16,
	},
	transactionHeader: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 13,
		fontWeight: '600',
		letterSpacing: 0.5,
		marginBottom: 10,
		textTransform: 'uppercase',
	},
	transactionSection: {
		marginBottom: 24,
		width: '100%',
	},
	value: { // Legacy
		fontWeight: '600',
	},
	valueContainer: { // Legacy
		alignItems: 'flex-end',
	},
});
