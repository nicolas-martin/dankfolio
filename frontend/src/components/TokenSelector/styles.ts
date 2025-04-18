import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) =>
	StyleSheet.create({
		container: {
			flexDirection: 'row',
			alignItems: 'center',
			justifyContent: 'space-between',
			padding: 12,
			backgroundColor: 'transparent',
			borderRadius: 8,
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
	}); 