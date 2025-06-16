import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;

	// StyleSheet.create is already optimized, no need for useMemo
	return StyleSheet.create({
		cardWrapper: {
			marginRight: theme.spacing.sm,
			width: 140,
		},
		container: {
			paddingBottom: theme.spacing['2xl'],
			paddingTop: theme.spacing.lg,
		},
		emptyText: {
			color: theme.colors.onSurfaceVariant,
			minHeight: 100,
			paddingHorizontal: theme.spacing.lg,
			paddingVertical: theme.spacing.lg,
			textAlign: 'center',
		},
		listContentContainer: {
			paddingLeft: theme.spacing.lg,
			paddingRight: theme.spacing.xs,
		},
		placeholderCard: {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.md,
			elevation: 2,
			padding: theme.spacing.md,
			shadowColor: theme.colors.shadow,
			shadowOffset: theme.shadows.sm.shadowOffset,
			shadowOpacity: 0.1,
			shadowRadius: theme.shadows.sm.shadowRadius,
			width: 140,
		},
		placeholderIconShimmer: {
			alignSelf: 'center',
			borderRadius: theme.borderRadius.full,
			height: 40,
			marginBottom: theme.spacing.sm,
			width: 40,
		},
		placeholderTextShimmerLine1: {
			borderRadius: theme.borderRadius.sm,
			height: 16,
			marginBottom: theme.spacing.xs,
			width: '80%',
		},
		placeholderTextShimmerLine2: {
			borderRadius: theme.borderRadius.sm,
			height: 14,
			width: '60%',
		},
		title: {
			color: theme.colors.onBackground,
			fontFamily: theme.typography.fontFamily.bold,
			fontSize: theme.typography.fontSize.xl,
			marginBottom: theme.spacing.md,
			paddingHorizontal: theme.spacing.lg,
		},
		titleContainer: {
			alignItems: 'flex-start',
			flexDirection: 'row',
			justifyContent: 'space-between',
			paddingHorizontal: theme.spacing.lg,
		},
		titleShimmer: {
			backgroundColor: theme.colors.surface,
			borderRadius: theme.borderRadius.sm,
			height: 22,
			marginBottom: theme.spacing.sm,
			marginLeft: theme.spacing.lg,
			width: 200,
		},
	});
}
