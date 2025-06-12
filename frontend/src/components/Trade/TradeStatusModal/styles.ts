import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper'; // Keep for type safety if some parts of AppTheme don't overlap
import { AppTheme } from '@/utils/theme';

export const createStyles = (theme: AppTheme) => StyleSheet.create({
	actionSection: {
		marginTop: theme.spacing.sm,
		width: '100%',
	},
	amount: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
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
		padding: theme.spacing.xl,
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
		borderRadius: 14,
		height: 28,
		justifyContent: 'center',
		marginRight: 10,
		width: 28,
	},
	cardTitle: { // Legacy
		color: theme.colors.onSurfaceVariant,
		flex: 1,
		fontSize: theme.typography.fontSize.sm,
		fontWeight: '600',
	},
	closeButton: { // Properties are already sorted
		backgroundColor: '#4CAF50', // Consider theme.colors.success if appropriate
		borderRadius: theme.borderRadius.lg,
		elevation: 3,
		paddingVertical: theme.spacing.sm,
		shadowColor: theme.shadows.sm.shadowColor,
		shadowOffset: theme.shadows.md.shadowOffset, // {0,2} is md
		shadowOpacity: 0.1,
		shadowRadius: theme.spacing.xs,
	},
	coinDetails: {
		flex: 1,
	},
	coinIcon: {
		borderRadius: theme.spacing.xl,
		height: theme.spacing['4xl'],
		marginRight: theme.spacing.md,
		width: theme.spacing['4xl'],
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
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
		marginBottom: 2,
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
	confirmationsText: {
		// color: '#4CAF50',
		fontSize: theme.typography.fontSize.sm,
		fontWeight: '700',
		// backgroundColor: '#E8F5E8',
		paddingHorizontal: theme.spacing.md,
		paddingVertical: theme.spacing.xs,
		borderRadius: theme.borderRadius.md,
		overflow: 'hidden',
	},
	container: {
		alignSelf: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: theme.spacing.xl, // 20 is theme.spacing.xl
		elevation: 8,
		margin: theme.spacing.lg, // 16 is theme.spacing.lg
		maxWidth: 400,
		padding: theme.spacing.xl, // 20 is theme.spacing.xl
		shadowColor: theme.shadows.sm.shadowColor,
		shadowOffset: { width: 0, height: 4 }, // No exact match
		shadowOpacity: 0.15,
		shadowRadius: theme.spacing.md, // 12 is theme.spacing.md
		width: 360,
	},
	divider: {
		backgroundColor: theme.colors.outline,
		height: 1,
		marginVertical: theme.spacing.sm,
		opacity: 0.2,
	},
	errorHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: theme.spacing.sm,
	},
	errorIcon: {
		marginRight: theme.spacing.sm,
	},
	errorSection: {
		backgroundColor: theme.colors.errorContainer,
		borderRadius: theme.borderRadius.md,
		marginBottom: theme.spacing.lg,
		padding: 14, // No exact match
		width: '100%',
	},
	errorText: {
		color: theme.colors.onErrorContainer,
		fontSize: 13, // No exact match
		lineHeight: theme.typography.fontSize.lg, // 18 is theme.typography.fontSize.lg
	},
	errorTitle: {
		color: theme.colors.onErrorContainer,
		fontSize: 13, // No exact match
		fontWeight: '600',
		letterSpacing: 0.5,
		textTransform: 'uppercase',
	},
	exchangeHeader: { // Legacy
		alignItems: 'center',
		flexDirection: 'row',
		marginBottom: theme.spacing.sm,
	},
	exchangeIcon: { // Legacy
		marginRight: 6, // No exact match
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
		padding: 14, // No exact match
	},
	feeContainer: {
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
		fontSize: 13, // No exact match
		fontWeight: '600',
		marginBottom: 10, // No exact match
	},
	feeLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.base,
	},
	feeRow: { // Legacy
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: 6, // No exact match
	},
	feeSection: { // Legacy
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: theme.borderRadius.md,
		marginBottom: theme.spacing.lg,
		padding: 14, // No exact match
	},
	feeValue: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
	},
	handleIndicator: {
		backgroundColor: theme.colors.onSurface,
	},
	hashContainer: {
		backgroundColor: theme.colors.surface,
		borderColor: theme.colors.outline,
		borderRadius: theme.spacing.sm,
		borderWidth: 1,
		marginBottom: 10, // No exact match
		padding: 10, // No exact match
	},
	hashLabel: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 11, // No exact match
		letterSpacing: 0.5,
		marginBottom: theme.spacing.xs,
		textTransform: 'uppercase',
	},
	hashText: {
		color: theme.colors.onSurface,
		fontFamily: 'monospace',
		fontSize: 13, // No exact match
		fontWeight: '500',
	},
	header: {
		alignItems: 'center',
		marginBottom: theme.spacing['2xl'],
	},
	label: { // Legacy
		color: theme.colors.onSurfaceVariant,
	},
	linkButton: {
		backgroundColor: 'transparent',
		borderColor: theme.colors.primary,
		borderRadius: theme.borderRadius.md,
		borderWidth: 1,
		marginHorizontal: 0,
	},
	loadingContainer: { // Main loading state for modal content
		alignItems: 'center',
		justifyContent: 'center',
		paddingVertical: 60, // No exact match
	},
	loadingDescription: { // Legacy
		color: theme.colors.onSurfaceVariant,
		fontSize: 13, // No exact match
		marginTop: 6, // No exact match
		opacity: 0.8,
		textAlign: 'center',
	},
	loadingText: { // Main loading text
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		marginTop: theme.spacing.xl,
		textAlign: 'center',
	},
	progressBar: {
		backgroundColor: theme.colors.outline,
		borderRadius: theme.borderRadius.sm,
		height: theme.spacing.md,
		overflow: 'hidden',
	},
	progressDot: { // Legacy, but might be used by progressIndicator if that's generic
		backgroundColor: theme.colors.primary,
		borderRadius: 3, // No exact match
		height: 6, // No exact match
		marginRight: theme.spacing.xs,
		width: 6, // No exact match
	},
	progressFill: {
		backgroundColor: theme.colors.primary,
		borderRadius: theme.borderRadius.sm,
		height: '100%',
	},
	progressHeader: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginBottom: theme.spacing.lg,
		minHeight: theme.spacing.xl,
	},
	progressIndicator: {
		alignItems: 'center',
		flexDirection: 'row',
		marginTop: theme.spacing.sm,
	},
	progressLabel: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.sm,
		fontWeight: '600',
		marginRight: theme.spacing.lg,
	},
	progressSection: {
		backgroundColor: theme.colors.surface,
		borderColor: theme.colors.outline,
		borderRadius: theme.borderRadius.lg,
		borderWidth: 1,
		marginBottom: theme.spacing['2xl'],
		padding: theme.spacing.xl,
		width: '100%',
	},
	progressText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.xs,
		marginLeft: theme.spacing.xs,
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
	statusDescription: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.sm,
		lineHeight: theme.typography.fontSize.xl,
		opacity: 0.8,
		textAlign: 'center',
	},
	statusIconContainer: {
		alignItems: 'center',
		borderRadius: theme.spacing['4xl'],
		elevation: 4, // No exact match
		height: 80, // No exact match
		justifyContent: 'center',
		marginBottom: theme.spacing.xl,
		shadowColor: theme.shadows.sm.shadowColor,
		shadowOffset: theme.shadows.md.shadowOffset, // {0,2} is md
		shadowOpacity: 0.1, // No exact match
		shadowRadius: theme.spacing.sm,
		width: 80, // No exact match
	},
	statusIconError: {
		backgroundColor: theme.colors.error,
	},
	statusIconLoading: {
		backgroundColor: theme.colors.surfaceVariant,
	},
	statusIconSuccess: {
		backgroundColor: theme.colors.success,
	},
	statusIconWarning: {
		backgroundColor: theme.colors.warning,
	},
	statusSection: {
		alignItems: 'center',
		marginBottom: theme.spacing['3xl'],
		paddingHorizontal: theme.spacing.xl,
	},
	statusText: {
		fontSize: theme.typography.fontSize.xl,
		fontWeight: '700',
		marginBottom: theme.spacing.sm,
		textAlign: 'center',
	},
	statusTextError: {
		color: theme.colors.error,
	},
	statusTextLoading: {
		color: theme.colors.onSurface,
	},
	statusTextSuccess: {
		color: theme.colors.success,
	},
	statusTextWarning: {
		color: theme.colors.warning,
	},
	subValue: { // Legacy
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.xs,
		marginTop: 2, // No exact match
	},
	subtitle: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.sm,
		textAlign: 'center',
	},
	swapIconContainer: {
		alignItems: 'center',
		backgroundColor: theme.colors.surface,
		borderRadius: theme.borderRadius.lg,
		elevation: 2, // No exact match
		height: theme.spacing['3xl'],
		justifyContent: 'center',
		left: '50%',
		position: 'absolute',
		shadowColor: theme.shadows.sm.shadowColor,
		shadowOffset: theme.shadows.sm.shadowOffset,
		shadowOpacity: 0.1, // No exact match
		shadowRadius: 2, // No exact match
		top: '50%',
		transform: [{ translateX: -theme.spacing.lg }, { translateY: -theme.spacing.lg }],
		width: theme.spacing['3xl'],
	},
	title: {
		color: theme.colors.onSurface,
		fontSize: 22,
		fontWeight: '700',
		marginBottom: theme.spacing['2xl'],
		textAlign: 'center',
	},
	tokenDetails: { // From "Token Section" context, distinct from "Coin Details"
		flex: 1,
	},
	tokenIcon: { // From "Token Section" context
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
	tokenName: { // From "Token Section" context
		color: theme.colors.onSurfaceVariant,
		fontSize: 12,
	},
	tokenSection: {
		alignItems: 'center',
		flexDirection: 'row',
		flex: 1,
		marginRight: theme.spacing.lg,
	},
	tokenSymbol: { // From "Token Section" context
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.base,
		fontWeight: '600',
		marginBottom: 2, // No exact match
	},
	totalFeeLabel: { // Legacy
		color: theme.colors.onSurface,
		fontSize: 13, // No exact match
		fontWeight: '600',
	},
	totalFeeRow: { // Legacy
		alignItems: 'center',
		borderTopColor: theme.colors.outline,
		borderTopWidth: 1,
		flexDirection: 'row',
		justifyContent: 'space-between',
		marginTop: theme.spacing.xs,
		paddingTop: 10, // No exact match
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
	tradeContainer: {
		backgroundColor: theme.colors.surfaceVariant,
		borderRadius: theme.spacing.xl,
		marginBottom: theme.spacing['3xl'],
		padding: theme.spacing['2xl'],
		position: 'relative',
	},
	tradeRow: {
		alignItems: 'center',
		flexDirection: 'row',
		justifyContent: 'space-between',
		paddingVertical: theme.spacing.lg,
	},
	transactionHeader: {
		color: theme.colors.onSurfaceVariant,
		fontSize: 13, // No exact match
		fontWeight: '600',
		letterSpacing: 0.5,
		marginBottom: 10, // No exact match
		textTransform: 'uppercase',
	},
	transactionSection: {
		marginBottom: theme.spacing['2xl'],
		width: '100%',
	},
	value: { // Legacy
		fontWeight: '600',
	},
	valueContainer: { // Legacy
		alignItems: 'flex-end',
	},
});
