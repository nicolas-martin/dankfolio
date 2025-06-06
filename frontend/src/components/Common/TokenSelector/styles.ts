import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) =>
	StyleSheet.create({
		cardContainer: {
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: 12,
			borderWidth: 0,
			width: '100%',
		},
		cardContent: {
			alignItems: 'flex-start',
			flexDirection: 'row',
			margin: 0,
			padding: 8,
			width: '100%',
		},
		selectorButtonContainer: {
			flex: 1, // Takes less space than the input container
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			marginRight: 12, // Space between button and input area
		},
		tokenInfo: {
			alignItems: 'center',
			flexDirection: 'row',
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
			borderRadius: 18,
			height: 36,
			marginRight: 8,
			width: 36,
		},
		tokenSymbol: {
			...theme.fonts.titleMedium,
			color: theme.colors.onSurface,
			fontSize: 18,
			fontWeight: '600',
		},
		modalContent: {
			alignSelf: 'center',
			backgroundColor: theme.colors.background,
			borderRadius: 16,
			height: '60%',
			marginVertical: 'auto',
			padding: 16,
			width: '90%',
		},
		searchContainer: {
			marginBottom: 16,
		},
		searchInput: {
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: 8,
			color: theme.colors.onSurface,
			height: 40,
			paddingHorizontal: 12,
			paddingVertical: 8,
			width: '100%',
		},
		tokenList: {
			flex: 1,
		},
		tokenItem: {
			alignItems: 'center',
			borderBottomColor: theme.colors.outlineVariant,
			borderBottomWidth: 1,
			flexDirection: 'row',
			padding: 12,
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
			backgroundColor: 'transparent',
			borderRadius: 8,
			borderWidth: 0,
			color: theme.colors.onSurface,
			fontSize: 24,
			fontWeight: 'bold',
			height: 48,
			paddingHorizontal: 0,
			paddingVertical: 0,
			textAlign: 'right',
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
			backgroundColor: 'rgba(0, 0, 0, 0.5)',
			flex: 1,
			justifyContent: 'center',
			padding: 20,
		},
	}); 
