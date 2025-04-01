import { StyleSheet, Platform } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    paddingBottom: 80,
  },
  priceDisplayContainer: {
    padding: 16,
    borderRadius: 8,
    margin: 16,
    backgroundColor: theme.colors.surfaceVariant,
  },
  chartSection: {
    marginHorizontal: 16,
    position: 'relative',
    backgroundColor: theme.colors.background,
    height: Platform.select({ web: 400, ios: 300, android: 300, default: 250 }),
    overflow: 'hidden',
  },
  timeframeButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 16,
    right: 16,
    marginTop: 8,
    borderRadius: 4,
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: theme.colors.background,
  },
  timeframeButtonsInnerContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
  },
  timeframeButton: {
    minWidth: 48,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  timeframeButtonText: {
    fontWeight: '600',
  },
  holdingsContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 32,
  },
  holdingsTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: theme.colors.onSurface,
  },
  holdingsDetails: {
    marginBottom: 32,
  },
  holdingsDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  holdingsDetailLabel: {
    fontSize: 16,
    color: theme.colors.onSurfaceVariant,
  },
  holdingsDetailValue: {
    fontSize: 16,
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  coinInfoContainer: {
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    padding: 16,
    marginHorizontal: 32,
    marginBottom: 160,
  },
  loadingContainer: {
    alignItems: 'center',
  },
  tradeButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  tradeButton: {
    backgroundColor: theme.colors.primary,
  },
  tradeButtonLabel: {
    color: theme.colors.onPrimary,
  },
});
