import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';

export const createStyles = (theme: MD3Theme) => StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentPadding: {
    padding: 16,
  },
  card: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  portfolioValueCard: {
    marginBottom: 16,
  },
  cardTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  tokenCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  tokenIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tokenImage: {
    width: 40,
    height: 40,
  },
  tokenInfoMiddle: {
    flex: 1,
    gap: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tokenBalance: {
    alignItems: 'flex-end',
    gap: 4,
  },
  profileHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  profileHeaderTextContainer: {
    gap: 4,
  },
  balanceDetailsRow: {
    marginTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  balanceDetailItem: {
    flex: 1,
    gap: 4,
  },
  balanceDetailItemEnd: {
    alignItems: 'flex-end',
  },
  yourTokensHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  tokenHeaderText: {
    marginLeft: 8,
  },
  tokenBalanceText: {
    color: theme.colors.onSurface,
    fontWeight: 'bold',
  },
  tokenValueText: {
    color: theme.colors.onSurfaceVariant,
  },
  addressText: {
    color: theme.colors.onSurfaceVariant,
  },
  // Styles for the address copy Button
  addressButtonContent: {
    justifyContent: 'flex-start', // Align icon and text to the left
    marginLeft: -8, // Reduce default left padding
  },
  addressButtonLabel: {
    fontSize: 12, // Match previous Text variant="bodySmall"
    color: theme.colors.onSurfaceVariant,
    textTransform: 'none', // Prevent uppercase default
    marginLeft: -4, // Adjust spacing between icon and text
    letterSpacing: 0, // Remove default letter spacing
  },
});
