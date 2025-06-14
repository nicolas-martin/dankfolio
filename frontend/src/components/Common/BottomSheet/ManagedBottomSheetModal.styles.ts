import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react'; // Import useMemo

export const useStyles = () => {
  const theme = useTheme() as AppTheme;

  // Memoize the styles object
  return useMemo(() => {
    return StyleSheet.create({
      blurViewStyle: { // For the backdrop
        ...StyleSheet.absoluteFillObject,
      },
      bottomSheetBackground: {
        backgroundColor: theme.colors.surface,
      },
      contentContainer: { // For BottomSheetView
        flex: 1,
      },
      handleIndicator: {
        backgroundColor: theme.colors.onSurfaceVariant, // Or a specific handle color
        width: 40,
        height: 4,
        borderRadius: 2,
      },
      headerContainer: {
        alignItems: 'center',
        borderBottomColor: theme.colors.outline,
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingBottom: theme.spacing.sm,
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
      },
      headerTitle: {
        color: theme.colors.onSurface,
        fontSize: theme.typography.fontSize.xl,
        fontWeight: 'bold',
      }
    });
  }, [theme]);
};
