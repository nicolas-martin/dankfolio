import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import type { AppTheme } from '@/utils/theme'; // Assuming AppTheme is correctly typed and exported

export const useStyles = () => {
  const theme = useTheme<AppTheme>(); // Specify AppTheme type

  return StyleSheet.create({
    button: {
      flex: 1,
      marginHorizontal: 4,
    },
    buttonContainer: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginBottom: theme.spacing.sm, // Use theme spacing
    },
    card: {
      margin: theme.spacing.lg, // Use theme spacing
    },
    chip: {
      marginLeft: theme.spacing.sm, // Use theme spacing
    },
    chipInvalid: {
      backgroundColor: theme.colors.error, // Use theme error color
    },
    chipValid: {
      backgroundColor: theme.colors.success, // Use theme success color
    },
    resultContainer: {
      backgroundColor: theme.colors.surface, // Use theme surface color
      borderRadius: theme.borderRadius.md, // Use theme border radius
      marginBottom: theme.spacing.md, // Use theme spacing
      padding: theme.spacing.md, // Use theme spacing
    },
    resultText: {
      fontWeight: 'bold', // Keep as is or use theme.typography if specific variant matches
    },
    statusContainer: {
      alignItems: 'center',
      flexDirection: 'row',
      marginBottom: theme.spacing.md, // Use theme spacing
    },
    title: {
      marginBottom: theme.spacing.lg, // Use theme spacing
      textAlign: 'center',
    },
    tokenContainer: {
      marginBottom: theme.spacing.md, // Use theme spacing
    },
    tokenLabel: {
      fontWeight: 'bold', // Keep as is or use theme.typography
      marginBottom: theme.spacing.xs, // Use theme spacing
    },
    tokenText: {
      backgroundColor: theme.colors.surface, // Use theme surface color
      borderRadius: theme.borderRadius.sm, // Use theme border radius
      fontFamily: theme.typography.fontFamily.regular, // Example: if monospace is needed, ensure it's in theme or handle differently
      padding: theme.spacing.sm, // Use theme spacing
    },
  });
};
