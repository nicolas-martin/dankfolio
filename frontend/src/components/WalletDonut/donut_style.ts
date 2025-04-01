import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
    container: {
      flex: 1,
    },
    chartContainer: {
      height: 400,
      padding: 25,
      position: "relative",
    },
    tooltip: {
      backgroundColor: theme.colors.surface,
      padding: 10,
      borderRadius: 8,
      shadowColor: theme.colors.shadow,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      transform: [{ translateX: -100 }, { translateY: -80 }],
      minWidth: 200,
    },
    tokenSymbol: {
      fontSize: 16,
      fontWeight: "bold",
      marginBottom: 4,
      color: theme.colors.onSurface,
    },
    tokenBalance: {
      fontSize: 14,
      marginBottom: 2,
      color: theme.colors.onSurface,
    },
    tokenValue: {
      fontSize: 14,
      marginBottom: 2,
      color: theme.colors.onSurface,
    },
    tokenPercentage: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
    },
  });