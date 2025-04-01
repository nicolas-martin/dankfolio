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
    marginBottom: 16,
    position: 'relative',
    backgroundColor: theme.colors.background,
    height: Platform.select({ web: 350, ios: 250, android: 250, default: 200 }),
    overflow: 'hidden',
  },
  timeframeButtonsContainer: {
    marginHorizontal: 16,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
  },
  timeframeButtonsInnerContainer: {
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 8,
  },
  timeframeButton: {
    // Keeping some basic styles, Button props handle most visual aspects
    // alignItems: 'center', // Default Button alignment is fine
    // paddingHorizontal: 12, // Use Button's internal padding via 'compact'
    // paddingVertical: 8,
    // borderRadius: 8, // Button handles its own border radius
    // borderWidth: 1, // Button mode handles border
    // borderColor: theme.colors.outlineVariant, // Button mode handles border
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
