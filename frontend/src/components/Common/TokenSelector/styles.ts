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
		// New: Balance container for left side of secondary row
		balanceContainer: {
			alignItems: 'flex-start',
			flex: 1,
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
			padding: theme.spacing.md, // Increased back to md for better spacing
			width: '100%',
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
		// New: Main row container for token selector and amount input
		mainRow: {
			alignItems: 'center',
			flexDirection: 'row',
			justifyContent: 'space-between',
			minHeight: 44, // Increased from 40 to 44 for more breathing room
			width: '100%',
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
			flexShrink: 1,
			fontSize: theme.typography.fontSize.lg, // Reduced from xl to lg
			fontWeight: 'bold',
			paddingHorizontal: 0,
			paddingVertical: 0,
			textAlign: 'right',
		},
		primaryValueContainer: {
			alignItems: 'center',
			flexDirection: 'row',
			justifyContent: 'flex-end',
			minHeight: 40, // Increased from 36 to 40 for better spacing
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
			marginBottom: theme.spacing.md, // Reduced from lg to md
			paddingHorizontal: theme.spacing.md, // Reduced from lg to md
			paddingTop: theme.spacing.md, // Reduced from lg to md
		},
		secondaryRow: {
			alignItems: 'center',
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginTop: theme.spacing.xs, // Increased from xs/2 to xs for better spacing
			width: '100%',
		},
		secondaryValueContainer: {
			alignItems: 'flex-end',
			flex: 1,
		},
		secondaryValueText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.xs, // Keep xs for secondary text
			textAlign: 'right',
		},
		selectedTokenDetails: {
			flex: 1,
			marginLeft: theme.spacing.md,
		},
		selectorButtonContainer: {
			alignItems: 'center',
			flex: 1, // Takes less space than the input container
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginRight: theme.spacing.md, // Space between button and input area
		},
		swapButton: {
			margin: 0,
			marginLeft: theme.spacing.xs / 2,
			minWidth: 28,
			width: 28,
		},
		swapIcon: {
			padding: theme.spacing.xs,
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
			fontSize: theme.typography.fontSize.xs, // Keep xs for balance text
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
			height: 64, // Reduced from 72 to 64
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.sm, // Reduced from lg to sm
		},
		tokenList: {
			flex: 1,
		},
		tokenListContent: {
			paddingBottom: theme.spacing.md, // Reduced from lg to md
			paddingHorizontal: theme.spacing.md, // Reduced from lg to md
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
		tokenSelectorContainer: {
			alignItems: 'center',
			flex: 1,
			flexDirection: 'row',
			maxWidth: '50%', // Added this line
			paddingVertical: theme.spacing.xs, // Add some padding for better touch target
		},
		tokenSymbol: {
			...theme.fonts.titleMedium,
			color: theme.colors.onSurface,
			fontSize: theme.typography.fontSize.sm, // Reduced from base to sm
			fontWeight: '600',
			marginRight: theme.spacing.xs,
		},
		currencyLabel: {
			...theme.fonts.bodyMedium,
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.sm, // Reduced from base to sm
			fontWeight: '600',
			marginLeft: theme.spacing.xs,
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
