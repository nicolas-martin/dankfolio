import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper'; // Assuming it might be used

export const useStyles = () => {
	const theme = useTheme(); // Or use provided theme if passed as prop
	return StyleSheet.create({
		container: { // Corresponds to 'percentageContainer' in Send screen
			flexDirection: 'row',
			justifyContent: 'space-between', // Changed from space-around to space-between
			paddingVertical: 16, // Increased from 8 to 16
			paddingHorizontal: 8, // Added horizontal padding
			marginTop: 8, // Added top margin
		},
		percentageButton: {
			alignItems: 'center',
			backgroundColor: theme.colors.surfaceVariant,
			borderRadius: 8,
			elevation: 1,
			flex: 1,
			justifyContent: 'center',
			marginHorizontal: 4,
			paddingHorizontal: 12,
			paddingVertical: 8,
		},
		activeButton: {
			backgroundColor: theme.colors.primary,
			elevation: 2,
		},
		percentageButtonText: {
			color: theme.colors.onSurfaceVariant,
			fontSize: 14,
			fontWeight: '600',
		},
	});
};
