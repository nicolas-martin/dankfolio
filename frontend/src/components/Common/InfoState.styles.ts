import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme'; // Assuming AppTheme is your extended theme type
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
  const theme = useTheme() as AppTheme;
  return StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.lg,
    },
    iconContainer: {
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: 'bold',
      color: theme.colors.onSurface,
      marginBottom: theme.spacing.sm,
      textAlign: 'center',
    },
    message: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.onSurfaceVariant,
      textAlign: 'center',
      lineHeight: theme.typography.fontSize.lg * 1.2,
    },
    errorText: {
      color: theme.colors.error,
    }
  });
};
