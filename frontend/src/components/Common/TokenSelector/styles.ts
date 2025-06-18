import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		amountInput: {
			backgroundColor: 'transparent',
			borderRadius: theme.spacing.sm,
			borderWidth: 0,
			color: theme.colors.onSurface,
			fontSize: theme.typography.fontSize['2xl'],
			fontWeight: 'bold',
			height: 48,
			paddingHorizontal: 0,
			paddingVertical: 0,
			textAlign: 'right',
			width: '100%',
		},
		// New: Container for amount input section
		amountInputContainer: {
			alignItems: 'flex-end',
			flexShrink: 0,
			minWidth: '45%', // Ensure minimum space for input
		},
		blurView: {
			flex: 1,
		},
		bottomTextContainer: {
			alignItems: 'flex-end',
			marginTop: theme.spacing.xs,
		},
		cardContainer: {
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: theme.borderRadius.md,
			borderWidth: 0,
			width: '100%',
		},
		cardContent: {
			margin: 0,
			padding: theme.spacing.md,
			width: '100%',
		},
		// New: Main row container for token selector and amount input
		mainRow: {
			alignItems: 'center',
			flexDirection: 'row',
			justifyContent: 'space-between',
			minHeight: 44, // Ensure consistent height
			width: '100%',
		},
		// New: Balance row container (separate from main row)
		balanceRow: {
			alignItems: 'flex-start',
			flexDirection: 'row',
			justifyContent: 'flex-start',
			marginTop: theme.spacing.xs,
			width: '100%',
		},
		// New: Container for token selector (icon + symbol + dropdown)
		tokenSelectorContainer: {
			alignItems: 'center',
			flexDirection: 'row',
			flexShrink: 1,
			maxWidth: '50%', // Prevent it from taking too much space
		},
		equivalentValueText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.sm,
			textAlign: 'right',
		},
		helperText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.xs,
			marginTop: 2,
			textAlign: 'right',
		},
		inputContainer: {
			alignItems: 'flex-end',
			flex: 2, // Takes more space than the selector button part
			marginLeft: theme.spacing.sm,
		},
		leftSection: {
			flex: 1,
			marginRight: theme.spacing.xs,
		},
		modalContent: {
			alignSelf: 'center',
			backgroundColor: theme.colors.background,
			borderRadius: theme.borderRadius.lg,
			height: '60%',
			marginVertical: 'auto',
			padding: theme.spacing.lg,
			width: '90%',
		},
		modalOverlay: {
			backgroundColor: theme.colors.backdrop,
			flex: 1,
			justifyContent: 'center',
			padding: theme.spacing.xl,
		},
		primaryAmountInput: {
			backgroundColor: 'transparent',
			borderRadius: theme.spacing.sm,
			borderWidth: 0,
			color: theme.colors.onSurface,
			flex: 1,
			fontSize: theme.typography.fontSize.xl,
			fontWeight: 'bold',
			paddingHorizontal: 0,
			paddingVertical: 0,
			textAlign: 'right',
		},
		primaryValueContainer: {
			alignItems: 'center',
			flexDirection: 'row',
			justifyContent: 'flex-end',
			minHeight: 40,
		},
		rightSection: {
			alignItems: 'flex-end',
			flex: 2,
		},
		searchBar: {
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: theme.spacing.sm,
			elevation: 2,
			shadowColor: theme.shadows.sm.shadowColor,
			shadowOffset: theme.shadows.sm.shadowOffset,
			shadowOpacity: 0.1,
			shadowRadius: 2,
		},
		searchBarInput: {
			color: theme.colors.onSurface,
			fontSize: theme.typography.fontSize.base,
		},
		searchContainer: {
			marginBottom: theme.spacing.lg,
			paddingHorizontal: theme.spacing.lg,
			paddingTop: theme.spacing.lg,
		},
		secondaryValueText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.xs,
			marginTop: 2,
			textAlign: 'right',
		},
		selectedTokenDetails: {
			flex: 1,
			marginLeft: theme.spacing.md,
		},
		selectorButtonContainer: {
			alignItems: 'center', // Sorted
			flex: 1, // Takes less space than the input container
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginRight: theme.spacing.md, // Space between button and input area
		},
		stackedValuesContainer: {
			alignItems: 'flex-end',
			minWidth: 100,
			width: '100%',
		},
		swapButton: {
			margin: 0,
			marginLeft: theme.spacing.xs / 2,
			minWidth: 28,
			width: 28,
		},
		switchContainer: {
			alignItems: 'center',
			flexDirection: 'row',
			paddingHorizontal: theme.spacing.sm,
			paddingVertical: theme.spacing.xs,
		},
		switchLabel: {
			...theme.fonts.bodyMedium,
			color: theme.colors.onSurface,
			marginLeft: theme.spacing.xs,
		},
		switchToggle: {
			marginLeft: 'auto',
		},
		tokenAddress: {
			...theme.fonts.bodySmall,
			color: theme.colors.onSurfaceVariant,
			opacity: 0.7,
		},
		tokenAmount: {
			...theme.fonts.bodySmall,
			color: theme.colors.onSurfaceVariant,
			marginTop: 2,
		},
		tokenBalance: {
			...theme.fonts.bodySmall,
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.xs,
		},
		tokenDetails: { // This is the one from previous line 84
			flex: 1,
			marginLeft: theme.spacing.md,
		},
		tokenIcon: {
			borderRadius: 18,
			height: 24, // Smaller icon for better fit
			width: 24,
		},
		tokenInfo: {
			alignItems: 'center',
			flexDirection: 'row',
			flexShrink: 1,
			gap: theme.spacing.sm, // Add gap between icon and symbol
		},
		tokenItem: { // Properties already sorted
			alignItems: 'center',
			borderBottomColor: theme.colors.outlineVariant,
			borderBottomWidth: 1,
			flexDirection: 'row',
			height: 72,
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.lg,
		},
		tokenList: {
			flex: 1,
		},
		tokenListContent: {
			paddingBottom: theme.spacing.lg,
			paddingHorizontal: theme.spacing.lg,
		},
		tokenName: {
			...theme.fonts.bodySmall,
			color: theme.colors.onSurfaceVariant,
		},
		tokenSelectorButton: {
			alignItems: 'center',
			flexDirection: 'row',
			flexShrink: 1,
		},
		tokenSymbol: {
			...theme.fonts.titleMedium,
			color: theme.colors.onSurface,
			fontSize: theme.typography.fontSize.base,
			fontWeight: '600',
			marginRight: theme.spacing.xs,
		},
		tokenTextContainer: {
			marginLeft: theme.spacing.xs,
		},
		valueText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.sm,
			marginTop: 2,
			textAlign: 'right',
			width: '100%',
		},
	})
	return {
		...styles,
		colors,
		theme
	};
};
