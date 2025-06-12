import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';

export const createStyles = (theme: AppTheme) =>
	StyleSheet.create({
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
		blurView: {
			flex: 1,
		},
		cardContainer: {
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: theme.borderRadius.md,
			borderWidth: 0,
			width: '100%',
		},
		cardContent: {
			alignItems: 'flex-start',
			flexDirection: 'row',
			margin: 0,
			padding: theme.spacing.sm,
			width: '100%',
		},
		inputContainer: {
			alignItems: 'flex-end',
			flex: 2, // Takes more space than the selector button part
			marginLeft: theme.spacing.sm,
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
		marginLeft: theme.spacing.md,
		},
		tokenIcon: {
			borderRadius: 18,
			height: 36,
		marginRight: theme.spacing.sm,
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
		tokenSymbol: {
			...theme.fonts.titleMedium,
			color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.lg,
			fontWeight: '600',
		},
		valueText: {
			color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.sm,
			marginTop: 2,
			textAlign: 'right',
			width: '100%',
		},
	}); 
