import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      paddingHorizontal: 16,
    },
    divider: {
      backgroundColor: theme.colors.surfaceVariant,
      marginVertical: 4,
    },
    headerTitle: {
      color: theme.colors.onBackground,
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 24,
      marginTop: 24,
      textAlign: 'left',
    },
    listItemDescription: {
      color: theme.colors.onSurfaceVariant,
      fontSize: 14,
    },
    listItemTitle: {
      color: theme.colors.onSurface,
      fontSize: 16,
    },
    safeArea: {
      backgroundColor: theme.colors.background,
      flex: 1,
    },
    scrollContent: {
      paddingBottom: 16,
    },
    sectionTitle: {
      color: theme.colors.primary, // Or theme.colors.onSurfaceVariant
      fontSize: 16,
      fontWeight: '600',
      marginBottom: 4,
      marginTop: 8,
    },
    warningText: {
      color: theme.colors.error,
      fontSize: 12,
      fontStyle: 'italic',
      marginBottom: 8,
      marginHorizontal: 16,
    },
  });
