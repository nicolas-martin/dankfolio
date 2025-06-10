import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) =>
	StyleSheet.create({
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
		blurView: {
			flex: 1,
		},
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
		inputContainer: {
			alignItems: 'flex-end',
			flex: 2, // Takes more space than the selector button part
			marginLeft: 8,
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
		modalOverlay: {
			backgroundColor: 'rgba(0, 0, 0, 0.5)',
			flex: 1,
			justifyContent: 'center',
			padding: 20,
		},
		searchBar: {
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: 8,
			elevation: 2,
			shadowColor: '#000',
			shadowOffset: { width: 0, height: 1 },
			shadowOpacity: 0.1,
			shadowRadius: 2,
		},
		searchBarInput: {
			color: theme.colors.onSurface,
			fontSize: 16,
		},
		searchContainer: {
			marginBottom: 16,
			paddingHorizontal: 16,
			paddingTop: 16,
		},
		selectedTokenDetails: {
			flex: 1,
			marginLeft: 12,
		},
		selectorButtonContainer: {
			alignItems: 'center', // Sorted
			flex: 1, // Takes less space than the input container
			flexDirection: 'row',
			justifyContent: 'space-between',
			marginRight: 12, // Space between button and input area
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
			...theme.fonts.bodyMedium,
			color: theme.colors.onSurface,
			textAlign: 'right',
		},
		tokenDetails: { // This is the one from previous line 84
			flex: 1,
			marginLeft: 12,
		},
		tokenIcon: {
			borderRadius: 18,
			height: 36,
			marginRight: 8,
			width: 36,
		},
		tokenInfo: {
			alignItems: 'center',
			flexDirection: 'row',
		},
		tokenItem: { // Properties already sorted
			alignItems: 'center',
			borderBottomColor: theme.colors.outlineVariant,
			borderBottomWidth: 1,
			flexDirection: 'row',
			height: 72,
			paddingHorizontal: 12,
			paddingVertical: 16,
		},
		tokenList: {
			flex: 1,
		},
		tokenListContent: {
			paddingBottom: 16,
			paddingHorizontal: 16,
		},
		tokenName: {
			...theme.fonts.bodySmall,
			color: theme.colors.onSurfaceVariant,
		},
		tokenSymbol: {
			...theme.fonts.titleMedium,
			color: theme.colors.onSurface,
			fontSize: 18,
			fontWeight: '600',
		},
		valueText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 14,
			marginTop: 2,
			textAlign: 'right',
			width: '100%',
		},
	}); 
