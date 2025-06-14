import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

// Calculate default cardWidth here if not passed, or expect it to be passed
// For placeholder, it might be better to pass it if it's dynamically calculated in the component
// const defaultCardWidth = Dimensions.get('window').width * 0.45;

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		const colors = theme.colors; // Ensure colors is defined inside useMemo
		const horizontalChangeStyle = (change24h: number | undefined) => ({
			fontSize: 11,
			fontWeight: '500' as const,
			marginTop: theme.spacing.xs,
			textAlign: 'center' as const,
			color: (change24h ?? 0) > 0 ? '#2E7D32' :
				(change24h ?? 0) < 0 ? '#D32F2F' :
					theme.colors.onSurfaceVariant
		});
		const styles = StyleSheet.create({
			balance: {
				color: colors.onSurfaceVariant, // Use the local colors variable
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '400',
				letterSpacing: 0.1,
			},
			card: {
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.lg,
				elevation: 2,
				marginBottom: theme.spacing.md,
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.sm.shadowOffset,
				shadowOpacity: 0.08,
				shadowRadius: theme.spacing.xs,
			},
			changeNegative: {
				color: '#D32F2F',
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '500',
				textAlign: 'right',
			},
			changeNegativeSmall: { color: '#D32F2F' },
			changeNeutral: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '400',
				textAlign: 'right',
			},
			changeNeutralSmall: { color: theme.colors.onSurfaceVariant },
			changePositive: {
				color: '#2E7D32',
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '500',
				textAlign: 'right',
			},
			changePositiveSmall: { color: '#2E7D32' },
			content: {
				alignItems: 'center',
				flexDirection: 'row',
				justifyContent: 'space-between',
				padding: theme.spacing.md,
			},
			horizontalCard: {
				alignItems: 'center',
				backgroundColor: theme.colors.surface,
				borderRadius: theme.borderRadius.md,
				elevation: 1,
				height: 120,
				justifyContent: 'center',
				padding: 10,
				shadowColor: theme.shadows.sm.shadowColor,
				shadowOffset: theme.shadows.sm.shadowOffset,
				shadowOpacity: 0.05,
				shadowRadius: 2,
				width: '100%',
			},
			horizontalChange: {
				fontSize: 11,
				fontWeight: '500',
				marginTop: theme.spacing.xs,
				textAlign: 'center',
			},
			horizontalLogoContainer: {
				marginBottom: theme.spacing.sm,
			},
			horizontalPrice: {
				color: theme.colors.onSurface,
				fontSize: 13, // Smaller font
				fontWeight: '500',
				marginTop: 2,
				textAlign: 'center',
			},
			horizontalSymbol: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.sm,
				fontWeight: '600',
				textAlign: 'center',
			},
			leftSection: {
				alignItems: 'center',
				flex: 0.35,
				flexDirection: 'row',
				minWidth: 0,
				paddingRight: theme.spacing.sm,
			},
			logo: {
				borderRadius: 18,
				height: 36,
				marginRight: 10,
				width: 36,
			},
			name: {
				color: theme.colors.onSurfaceVariant,
				flexShrink: 1,
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '400',
				letterSpacing: 0.1,
			},
			nameSection: {
				flex: 1,
				justifyContent: 'center',
				minWidth: 0,
			},
			price: {
				color: theme.colors.onSurface,
				fontSize: 15,
				fontWeight: '600',
				letterSpacing: 0.2,
				marginBottom: 1,
				textAlign: 'right',
			},
			rightSection: {
				alignItems: 'flex-end',
				flex: 0.25,
				justifyContent: 'center',
				minWidth: 0,
			},
			sparklineContainer: {
				alignItems: 'center',
				flex: 0.4,
				height: 36,
				justifyContent: 'center',
			},
			symbol: {
				color: theme.colors.onSurface,
				fontSize: 15,
				fontWeight: '600',
				letterSpacing: 0.2,
				marginBottom: 1,
			},
			volume: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.xs,
				fontWeight: '400',
				letterSpacing: 0.1,
				textAlign: 'right',
			},
		});
		return {
			...styles,
			colors: theme.colors, // Return original theme.colors for consistency
			theme,
			horizontalChangeStyle
		};
	}, [theme]);
};
