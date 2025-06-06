import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) =>
	StyleSheet.create({
		container: {
			alignItems: 'center',
			flexDirection: 'row',
			paddingHorizontal: 16,
			paddingVertical: 8,
		},
		listedAtText: {
			fontSize: 12,
			color: theme.colors.onSurfaceVariant, // Or some other appropriate color
			marginTop: 2,
		},
		nameRow: {
			alignItems: 'flex-start',
			flexDirection: 'column',
		},
		symbolColumn: {
			marginLeft: 16,
			width: 100,
		},
		tokenAddress: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 12,
			marginTop: 2,
			opacity: 0.7,
		},
		tokenDetails: {
			flex: 1,
			marginLeft: 12,
		},
		tokenInfo: {
			alignItems: 'center',
			flex: 1,
			flexDirection: 'row',
		},
		tokenName: {
			color: theme.colors.onSurface,
			fontSize: 16,
			fontWeight: '600',
		},
		tokenSymbol: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 14,
		},
		unenrichedBadge: {
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: 4,
			marginLeft: 8,
			paddingHorizontal: 8,
			paddingVertical: 4,
		},
		unenrichedText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 12,
		},
	}); 
