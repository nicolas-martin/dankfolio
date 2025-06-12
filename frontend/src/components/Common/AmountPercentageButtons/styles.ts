import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper'; // Assuming it might be used

export const useStyles = () => {
	const theme = useTheme(); // Or use provided theme if passed as prop
	return StyleSheet.create({
		activeButton: {
			backgroundColor: theme.colors.primary,
			elevation: 2,
		},
		button: {
			alignItems: 'center',
			borderRadius: theme.spacing.sm,
			flex: 1,
			justifyContent: 'center',
			marginHorizontal: theme.spacing.xs,
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.sm,
		},
		container: { // Corresponds to 'percentageContainer' in Send screen
			flexDirection: 'row',
			justifyContent: 'space-between', // Changed from space-around to space-between
			paddingVertical: theme.spacing.lg, // Increased from 8 to 16
			paddingHorizontal: theme.spacing.sm, // Added horizontal padding
			marginTop: theme.spacing.sm, // Added top margin
		},
		percentageButton: {
			alignItems: 'center',
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: theme.spacing.sm,
			elevation: 1,
			flex: 1,
			justifyContent: 'center',
			marginHorizontal: theme.spacing.xs,
			paddingHorizontal: theme.spacing.md,
			paddingVertical: theme.spacing.sm,
		},
		percentageButtonText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: theme.typography.fontSize.sm,
			fontWeight: '600',
		},
	});
};
