import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.roundness,
    padding: 12,
    paddingVertical: 16,
    marginHorizontal: 8,
    marginBottom: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    minHeight: 48,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 2,
    minWidth: 0,
    paddingRight: 8,
  },
  rightSection: {
    alignItems: 'flex-end',
    flex: 1,
    marginLeft: 8,
  },
  nameSection: {
    flex: 1,
    justifyContent: 'center',
    minWidth: 0,
    marginRight: 8,
  },
  logo: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
    backgroundColor: theme.colors.surface,
  },
  symbol: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  name: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 14,
    marginTop: 4,
    maxWidth: '90%',
    letterSpacing: 0.25,
  },
  price: {
    color: theme.colors.onSurface,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  volume: {
    color: theme.colors.onSurfaceVariant,
    fontSize: 12,
    marginBottom: 4,
    letterSpacing: 0.25,
  },
  priceChange: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.25,
  },
  positive: {
    color: theme.colors.primary,
  },
  negative: {
    color: theme.colors.error,
  },
  card: {
    marginHorizontal: 8,
    marginBottom: 8,
  },
  content: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
