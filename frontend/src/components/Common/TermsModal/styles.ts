import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
  acceptButton: {
    flex: 1,
    marginLeft: 8,
  },
  actionSection: {
    borderTopColor: theme.colors.outline,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
  },
  cancelButton: {
    flex: 1,
    marginRight: 8,
  },
  container: {
    alignSelf: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
  },
  contentScroll: {
    maxHeight: '70%',
    padding: 20,
  },
  header: {
    borderBottomColor: theme.colors.outline,
    borderBottomWidth: 1,
    padding: 20,
  },
  paragraph: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    marginTop: 16,
  },
  spacer: {
    height: 20,
  },
  subtitle: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
  },
  title: {
    color: theme.colors.onSurface,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 