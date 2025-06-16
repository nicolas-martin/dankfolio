import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { moderateScale, verticalScale } from '@/utils/responsive';
import { FONTS } from '@/utils/fonts';
import { COLORS } from '@/utils/colors'; // Keep direct color imports if some are not theme-dependent
import { AppTheme } from '@/utils/theme'; // Import AppTheme

export const useStyles = () => {
  const theme = useTheme() as AppTheme;

  return useMemo(() => StyleSheet.create({
    container: {
      paddingVertical: verticalScale(16),
      // Example of using theme color: backgroundColor: theme.colors.background,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(16),
    marginBottom: verticalScale(12),
  },
  title: {
    fontFamily: FONTS.BOLD,
    fontSize: moderateScale(18),
    color: COLORS.WHITE,
  },
  listContentContainer: {
    paddingLeft: moderateScale(16), // Start list from the left edge
    paddingRight: moderateScale(16 - 8), // Adjust for the last item's margin
  },
  cardWrapper: {
    marginRight: moderateScale(8), // Space between cards
  },
  emptyText: {
    fontFamily: FONTS.REGULAR,
    fontSize: moderateScale(14),
    color: COLORS.GRAY_LIGHT,
    textAlign: 'center',
    paddingHorizontal: moderateScale(16),
    marginTop: verticalScale(10),
  },
  // Placeholder styles
  placeholderCard: {
    width: moderateScale(140), // Based on CARD_WIDTH
    height: verticalScale(100), // Approximate height of HorizontalTickerCard
    borderRadius: moderateScale(8),
    backgroundColor: COLORS.CHARCOAL, // Shimmer base color
    marginRight: moderateScale(8),
    justifyContent: 'center',
    alignItems: 'center',
    padding: moderateScale(10),
  },
  placeholderIconShimmer: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    marginBottom: verticalScale(8),
  },
  placeholderTextShimmerLine1: {
    width: '80%',
    height: verticalScale(10),
    borderRadius: moderateScale(4),
    marginBottom: verticalScale(6),
  },
  placeholderTextShimmerLine2: {
    width: '60%',
    height: verticalScale(10),
    borderRadius: moderateScale(4),
  },
  titleShimmer: {
    width: moderateScale(200),
    height: verticalScale(22), // Approx height of title
    borderRadius: moderateScale(4),
    backgroundColor: COLORS.CHARCOAL, // Shimmer base color
    marginBottom: verticalScale(12), // Match titleContainer margin
    marginLeft: moderateScale(16), // Match titleContainer padding
  },
  trendingCardStyle: { // New style for HorizontalTickerCard
    borderRadius: moderateScale(16),
    paddingHorizontal: moderateScale(12),
    paddingVertical: verticalScale(8),
    // backgroundColor: COLORS.SURFACE, // If COLORS.SURFACE is still used directly
    backgroundColor: theme.colors.surface, // Example: If HorizontalTickerCard's default is theme based
    // Add shadow if needed, e.g., ...theme.shadows.sm (if shadows are part of theme)
    // Ensure this style is compatible with HorizontalTickerCard's internal layout
  }
  // Add other styles here
  }), [theme]);
};
