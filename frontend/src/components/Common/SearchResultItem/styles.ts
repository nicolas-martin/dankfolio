import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';

export const createStyles = (theme: AppTheme) =>
	StyleSheet.create({
		container: {
			alignItems: 'center',
			flexDirection: 'row',
			paddingHorizontal: theme.spacing.lg,
			paddingVertical: theme.spacing.sm,
		},
		listedAtText: {
			fontSize: theme.typography.fontSize.xs,
			color: theme.colors.onSurfaceVariant, // Or some other appropriate color
			marginTop: 2,
		},
		nameRow: {
			alignItems: 'flex-start',
			flexDirection: 'column',
		},
		symbolColumn: {
			marginLeft: theme.spacing.lg,
			width: 100,
		},
		tokenAddress: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.xs,
			marginTop: 2,
			opacity: 0.7,
		},
		tokenDetails: {
			flex: 1,
			marginLeft: theme.spacing.md,
		},
		tokenInfo: {
			alignItems: 'center',
			flex: 1,
			flexDirection: 'row',
		},
		tokenName: {
			color: theme.colors.onSurface,
			fontSize: theme.typography.fontSize.base,
			fontWeight: '600',
		},
		tokenSymbol: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.sm,
		},
		unenrichedBadge: {
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: theme.spacing.xs,
			marginLeft: theme.spacing.sm,
			paddingHorizontal: theme.spacing.sm,
			paddingVertical: theme.spacing.xs,
		},
		unenrichedText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.xs,
		},
	}); 
