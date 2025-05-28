import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) =>
	StyleSheet.create({
		cardContainer: {
			width: '100%',
			borderRadius: 12,
			backgroundColor: theme.colors.surfaceVariant,
			borderWidth: 0,
		},
		cardContent: {
			flexDirection: 'row',
			alignItems: 'flex-start',
			width: '100%',
			padding: 8,
			margin: 0,
		},
		selectorButtonContainer: {
			flex: 1, // Takes less space than the input container
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginRight: 12, // Space between button and input area
		},
		tokenInfo: {
			flexDirection: 'row',
			alignItems: 'center',
		},
		selectedTokenDetails: {
			flex: 1,
			marginLeft: 12,
		},
		tokenAmount: {
			...theme.fonts.bodySmall,
			color: theme.colors.onSurfaceVariant,
			marginTop: 2,
		},
		tokenIcon: {
			width: 36,
			height: 36,
			borderRadius: 18,
			marginRight: 8,
		},
		tokenSymbol: {
			...theme.fonts.titleMedium,
			fontSize: 18,
			fontWeight: '600',
			color: theme.colors.onSurface,
		},
		modalContent: {
			backgroundColor: theme.colors.background,
			padding: 16,
			borderRadius: 16,
			height: '60%',
			width: '90%',
			alignSelf: 'center',
			marginVertical: 'auto',
		},
		searchContainer: {
			marginBottom: 16,
		},
		searchInput: {
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: 8,
			paddingHorizontal: 12,
			paddingVertical: 8,
			color: theme.colors.onSurface,
			height: 40,
			width: '100%',
		},
		tokenList: {
			flex: 1,
		},
		tokenItem: {
			flexDirection: 'row',
			alignItems: 'center',
			padding: 12,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.outlineVariant,
		},
		tokenDetails: {
			flex: 1,
			marginLeft: 12,
		},
		tokenName: {
			...theme.fonts.bodySmall,
			color: theme.colors.onSurfaceVariant,
		},
		tokenAddress: {
			...theme.fonts.bodySmall,
			color: theme.colors.onSurfaceVariant,
			opacity: 0.7,
		},
		tokenBalance: {
			...theme.fonts.bodyMedium,
			color: theme.colors.onSurface,
			textAlign: 'right',
		},
		// Styles for integrated input/value
		inputContainer: {
			flex: 2, // Takes more space than the selector button part
			alignItems: 'flex-end',
			marginLeft: 8,
		},
		amountInput: {
			height: 48,
			paddingHorizontal: 0,
			paddingVertical: 0,
			borderRadius: 8,
			color: theme.colors.onSurface,
			fontSize: 24,
			fontWeight: 'bold',
			textAlign: 'right',
			backgroundColor: 'transparent',
			borderWidth: 0,
			width: '100%',
		},
		valueText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 14,
			marginTop: 2,
			textAlign: 'right',
			width: '100%',
		},
		modalOverlay: {
			flex: 1,
			backgroundColor: 'rgba(0, 0, 0, 0.5)',
			justifyContent: 'center',
			padding: 20,
		},
	}); 
