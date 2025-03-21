import { StyleSheet } from 'react-native';
import { theme } from '../../../utils/theme';

export const styles = StyleSheet.create({
  container: {
    marginTop: theme.spacing.xl,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.md,
  },
  exchangeRate: {
    color: theme.colors.text,
    marginBottom: theme.spacing.sm,
  },
  feeDetail: {
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.xs,
  },
}); 