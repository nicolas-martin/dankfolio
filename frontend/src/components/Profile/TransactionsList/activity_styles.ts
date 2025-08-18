import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;

	const styles = StyleSheet.create({
		// Row styles
		activityRow: {
			alignItems: 'center',
			backgroundColor: theme.colors.background,
			flexDirection: 'row',
			minHeight: 72,
			paddingHorizontal: 16,
			paddingVertical: 12,
		},
		activityRowSeparator: {
			height: 12,
		},
		badge: {
			alignItems: 'center',
			backgroundColor: theme.colors.background,
			borderColor: theme.colors.background,
			borderRadius: 9,
			borderWidth: 8,
			bottom: -5,
			// elevation: 3,
			justifyContent: 'center',
			position: 'absolute',
			right: -5,
		},
		badgeIconButton: {
			// margin: 0,
			// padding: 0,
		},
		badgeTokenImage: {
			// borderWidth: 10,
		},
		baseIcon: {
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: 24,
			overflow: 'hidden',
		},
		container: {
			backgroundColor: theme.colors.background,
			flex: 1,
		},
		// Right column styles
		rightColumn: {
			alignItems: 'flex-end',
			minWidth: 80,
		},
		subtitle: {
			color: theme.colors.onSurface,
			fontSize: 13,
			opacity: 0.7,
		},
		textContent: {
			flex: 1,
			marginRight: 12,
		},
		title: {
			color: theme.colors.onSurface,
			fontSize: 16,
			fontWeight: '600',
			marginBottom: 2,
		},
		timestamp: {
			color: theme.colors.onSurface,
			fontSize: 11,
			marginBottom: 2,
			opacity: 0.7,
		},
		primaryAmount: {
			color: theme.colors.onSurface,
			fontSize: 16,
			fontWeight: '500',
			marginBottom: 1,
		},
		primaryAmountPositive: {
			color: theme.trend.positive,
		},
		secondaryAmount: {
			color: theme.colors.onSurface,
			fontSize: 13,
			opacity: 0.7,
		},

		// Status styles
		statusChip: {
			borderRadius: 12,
			marginTop: 2,
			paddingHorizontal: 8,
			paddingVertical: 2,
		},
		statusPending: {
			backgroundColor: '#FFF3E0', // Amber background
		},
		statusFailed: {
			backgroundColor: '#FFEBEE', // Red background
		},
		statusText: {
			fontSize: 11,
			fontWeight: '500',
		},
		statusTextPending: {
			color: '#F57C00', // Amber text
		},
		statusTextFailed: {
			color: theme.trend.negative,
		},

		// Icon container styles
		iconContainer: {
			marginRight: 12,
			position: 'relative',
		},
		tokenImage: {
			backgroundColor: theme.colors.background,
			borderColor: theme.colors.surface,
			borderRadius: 24,
			borderWidth: 2,
		},
		listContainer: {
			paddingHorizontal: 16,
			paddingVertical: 8,
		},
		fallbackIcon: {
			alignItems: 'center',
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: 24,
			borderWidth: 2,
			justifyContent: 'center',
		},
		// Loading and error states
		centerContainer: {
			alignItems: 'center',
			flex: 1,
			justifyContent: 'center',
			paddingHorizontal: 32,
		},
		loadingText: {
			color: theme.colors.onSurface,
			fontSize: 16,
			marginTop: 16,
		},
		errorText: {
			color: theme.colors.error,
			fontSize: 16,
			marginTop: 16,
			textAlign: 'center',
		},
		errorSubtext: {
			color: theme.colors.onSurface,
			fontSize: 14,
			marginTop: 8,
			opacity: 0.7,
			textAlign: 'center',
		},
		emptyContainer: {
			alignItems: 'center',
			flex: 1,
			justifyContent: 'center',
			paddingHorizontal: 32,
		},
		emptyIcon: {
			marginBottom: 16,
		},
		emptyTitle: {
			color: theme.colors.onSurface,
			fontSize: 18,
			fontWeight: '600',
			marginBottom: 8,
			textAlign: 'center',
		},
		emptySubtext: {
			color: theme.colors.onSurface,
			fontSize: 14,
			opacity: 0.7,
			textAlign: 'center',
		},
	});

	return { ...styles, colors, theme };
};
