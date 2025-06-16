import { StyleSheet } from 'react-native';
import { moderateScale, verticalScale } from '@/utils/responsive'; // This is the import to verify
import { FONTS } from '@/utils/fonts';
import { COLORS } from '@/utils/colors';
import { useTheme } from 'react-native-paper';
import { AppTheme } from '@/utils/theme';
import { useMemo } from 'react';

export const useStyles = () => {
  const theme = useTheme() as AppTheme;

  return useMemo(() => StyleSheet.create({
    container: {
      paddingVertical: verticalScale(16),
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
      paddingLeft: moderateScale(16),
      paddingRight: moderateScale(16 - 8),
    },
    cardWrapper: {
      marginRight: moderateScale(8),
    },
    emptyText: {
      fontFamily: FONTS.REGULAR,
      fontSize: moderateScale(14),
      color: COLORS.GRAY_LIGHT,
      textAlign: 'center',
      paddingHorizontal: moderateScale(16),
      marginTop: verticalScale(10),
    },
    placeholderCard: {
      width: moderateScale(140),
      height: verticalScale(100),
      borderRadius: moderateScale(8),
      backgroundColor: COLORS.CHARCOAL,
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
      height: verticalScale(22),
      borderRadius: moderateScale(4),
      backgroundColor: COLORS.CHARCOAL,
      marginBottom: verticalScale(12),
      marginLeft: moderateScale(16),
    },
    trendingCardStyle: {
      borderRadius: moderateScale(16),
      paddingHorizontal: moderateScale(12),
      paddingVertical: verticalScale(8),
      backgroundColor: theme.colors.surface,
    }
  }), [theme]);
};
