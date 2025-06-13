import { StyleSheet, Dimensions } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';
import { useMemo } from 'react'; // Import useMemo

export const useStyles = () => {
  const theme = useTheme() as AppTheme;

  // Memoize the styles object
  return useMemo(() => {
    return StyleSheet.create({
      bottomSheetBackground: {
        backgroundColor: theme.colors.surface,
      },
      handleIndicator: {
        backgroundColor: theme.colors.onSurfaceVariant, // Or a specific handle color
        width: 40,
        height: 4,
        borderRadius: 2,
      },
      blurViewStyle: { // For the backdrop
        ...StyleSheet.absoluteFillObject,
      },
      headerContainer: {
        paddingHorizontal: theme.spacing.lg,
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: theme.colors.outline,
        alignItems: 'center',
      },
      headerTitle: {
        fontSize: theme.typography.fontSize.xl,
        fontWeight: 'bold',
        color: theme.colors.onSurface,
      },
      contentContainer: { // For BottomSheetView
        flex: 1,
      }
    });
  }, [theme]);
};
