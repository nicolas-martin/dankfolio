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
		percentageButton: { // Style for each button
			paddingVertical: 8,
			paddingHorizontal: 12, // Reduced from 16 to 12
			borderRadius: 24, // Increased from 20 to 24 for more rounded look
			borderWidth: 0, // Removed border
			backgroundColor: theme.colors.surfaceVariant, // Added background color
			alignItems: 'center',
			justifyContent: 'center',
			minWidth: 60, // Added minimum width
			marginHorizontal: 4, // Added horizontal margin between buttons
			elevation: 1, // Subtle elevation
		},
		percentageButtonText: { // Style for text inside button
			color: theme.colors.primary, // Example from react-native-paper
			fontSize: 14, // Increased from 12 to 14
			fontWeight: '600', // Changed from bold to 600
		},
	});
};
