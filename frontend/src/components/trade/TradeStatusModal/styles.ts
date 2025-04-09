import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    padding: 20,
    margin: 20,
    borderRadius: theme.roundness,
    alignItems: 'center', // Center content horizontally
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: theme.colors.onSurface,
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: theme.colors.onSurface,
  },
  confirmationsText: {
    fontSize: 14,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 15,
  },
  hashText: {
    fontSize: 12,
    color: theme.colors.onSurfaceVariant,
    marginBottom: 10,
    textAlign: 'center',
  },
  linkButton: {
    marginTop: 10,
    marginBottom: 20,
  },
  errorText: {
    color: theme.colors.error,
    marginTop: 10,
    textAlign: 'center',
    fontSize: 14,
  },
  closeButton: {
    marginTop: 15,
  },
  loadingContainer: {
    paddingVertical: 20,
  },
});