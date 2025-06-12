import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';

export const createStyles = (theme: AppTheme) => StyleSheet.create({
  acceptButton: {
    flex: 1,
    marginLeft: theme.spacing.sm,
  },
  actionSection: {
    borderTopColor: theme.colors.outline,
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: theme.spacing.lg,
  },
  cancelButton: {
    flex: 1,
    marginRight: theme.spacing.sm,
  },
  container: {
    alignSelf: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    margin: theme.spacing.xl,
    maxHeight: '80%',
    width: '90%',
  },
  contentScroll: {
    maxHeight: '70%',
    padding: theme.spacing.xl,
  },
  header: {
    borderBottomColor: theme.colors.outline,
    borderBottomWidth: 1,
    padding: theme.spacing.xl,
  },
  paragraph: {
    color: theme.colors.onSurfaceVariant,
    fontSize: theme.typography.fontSize.sm,
    lineHeight: theme.typography.fontSize.xl,
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    color: theme.colors.onSurface,
    fontSize: theme.typography.fontSize.base,
    fontWeight: 'bold',
    marginBottom: theme.spacing.sm,
    marginTop: theme.spacing.lg,
  },
  spacer: {
    height: theme.spacing.xl,
  },
  subtitle: {
    color: theme.colors.onSurface,
    fontSize: theme.typography.fontSize.base,
    fontWeight: '500',
    marginBottom: theme.spacing.lg,
  },
  title: {
    color: theme.colors.onSurface,
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 