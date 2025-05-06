import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) =>
	StyleSheet.create({
		container: {
			flexDirection: 'row',
			alignItems: 'center',
			paddingVertical: 8,
			paddingHorizontal: 16,
			borderBottomWidth: 1,
			borderBottomColor: theme.colors.outlineVariant,
		},
		tokenInfo: {
			flex: 1,
			flexDirection: 'row',
			alignItems: 'center',
		},
		tokenDetails: {
			marginLeft: 12,
			flex: 1,
		},
		symbolColumn: {
			width: 100,
			marginLeft: 16,
		},
		nameRow: {
			flexDirection: 'column',
			alignItems: 'flex-start',
		},
		tokenName: {
			fontSize: 16,
			fontWeight: '600',
			color: theme.colors.onSurface,
		},
		tokenSymbol: {
			fontSize: 14,
			color: theme.colors.onSurfaceVariant,
		},
		tokenAddress: {
			fontSize: 12,
			color: theme.colors.onSurfaceVariant,
			opacity: 0.7,
			marginTop: 2,
		},
		unenrichedBadge: {
			backgroundColor: theme.colors.surfaceVariant,
			paddingHorizontal: 8,
			paddingVertical: 4,
			borderRadius: 4,
			marginLeft: 8,
		},
		unenrichedText: {
			fontSize: 12,
			color: theme.colors.onSurfaceVariant,
		},
	}); 