import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper'; // Assuming it might be used

export const useStyles = () => {
  const theme = useTheme(); // Or use provided theme if passed as prop
  return StyleSheet.create({
    container: { // Corresponds to 'percentageContainer' in Send screen
      flexDirection: 'row',
      justifyContent: 'space-around', // Or 'space-between' depending on desired layout
      paddingVertical: 8, // Example padding
    },
    percentageButton: { // Style for each button
      paddingVertical: 8,
      paddingHorizontal: 16,
      borderRadius: 20, // Example
      borderWidth: 1,
      borderColor: theme.colors.outline, // Example from react-native-paper
      alignItems: 'center',
    },
    percentageButtonText: { // Style for text inside button
      color: theme.colors.primary, // Example from react-native-paper
      fontSize: 12,
      fontWeight: 'bold',
    },
  });
};
