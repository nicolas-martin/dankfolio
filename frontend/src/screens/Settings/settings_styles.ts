import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      paddingBottom: 16,
    },
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    headerTitle: {
      fontSize: 28,
      fontWeight: 'bold',
      color: theme.colors.onBackground,
      marginTop: 24,
      marginBottom: 24,
      textAlign: 'left',
    },
    sectionTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.primary, // Or theme.colors.onSurfaceVariant
      marginTop: 8,
      marginBottom: 4,
    },
    listItemTitle: {
      fontSize: 16,
      color: theme.colors.onSurface,
    },
    listItemDescription: {
      fontSize: 14,
      color: theme.colors.onSurfaceVariant,
    },
    warningText: {
      fontSize: 12,
      color: theme.colors.error,
      marginHorizontal: 16,
      marginBottom: 8,
      fontStyle: 'italic',
    },
    divider: {
      backgroundColor: theme.colors.surfaceVariant,
      marginVertical: 4,
    },
  });
