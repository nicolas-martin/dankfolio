import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	return useMemo(() => {
		// const colors = theme.colors; // This variable was unused
		const styles = StyleSheet.create({
			container: {
				flex: 1,
				paddingHorizontal: theme.spacing.lg,
			},
			divider: {
				backgroundColor: theme.colors.surfaceVariant,
				marginVertical: theme.spacing.xs,
			},
			headerTitle: {
				color: theme.colors.onBackground,
				fontSize: 28, // No exact match
				fontWeight: 'bold',
				marginBottom: theme.spacing['2xl'],
				marginTop: theme.spacing['2xl'],
				textAlign: 'left',
			},
			listItemDescription: {
				color: theme.colors.onSurfaceVariant,
				fontSize: theme.typography.fontSize.sm,
			},
			listItemTitle: {
				color: theme.colors.onSurface,
				fontSize: theme.typography.fontSize.base,
			},
			privateKeyActions: {
				alignItems: 'center',
				flexDirection: 'row',
				gap: theme.spacing.xs,
			},
			privateKeyContainer: {
				justifyContent: 'center',
				minHeight: 60, // Fixed height to prevent layout shift
			},
			privateKeyError: {
				color: theme.colors.error,
				fontStyle: 'italic',
			},
			privateKeyVisible: {
				color: theme.colors.onSurface,
				flexShrink: 1,
				flexWrap: 'wrap',
				fontFamily: 'monospace',
				fontSize: theme.typography.fontSize.xs,
				lineHeight: theme.typography.fontSize.xs * 1.4,
			},
			safeArea: {
				backgroundColor: theme.colors.background,
				flex: 1,
			},
			scrollContent: {
				paddingBottom: theme.spacing.lg,
			},
			sectionTitle: {
				color: theme.colors.primary, // Or theme.colors.onSurfaceVariant
				fontSize: theme.typography.fontSize.base,
				fontWeight: '600',
				marginBottom: theme.spacing.xs,
				marginTop: theme.spacing.sm,
			},
			warningText: {
				color: theme.colors.error,
				fontSize: theme.typography.fontSize.xs,
				fontStyle: 'italic',
				marginBottom: theme.spacing.sm,
				marginHorizontal: theme.spacing.lg,
			},
		});
		return {
			...styles,
			colors: theme.colors, // Return original theme.colors for consistency
			theme
		};
	}, [theme]);
};
