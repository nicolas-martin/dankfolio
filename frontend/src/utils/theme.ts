import { Dimensions } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

export const theme = {
  colors: {
    primary: '#6A5ACD',
    secondary: '#9F9FD5',
    white: '#FFFFFF',
    background: '#191B1F',
    text: '#FFFFFF',
    textSecondary: '#9F9FD5',
    border: '#2C2F36',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    overlay: 'rgba(26, 26, 46, 0.8)',
    topBar: '#191B1F',
    containerBackground: '#1E1E2E',
    cardBackGround: '#2A2A3E',
  },
  
  typography: {
    fontFamily: {
      regular: 'Inter-Regular',
      medium: 'Inter-Medium',
      semiBold: 'Inter-SemiBold',
      bold: 'Inter-Bold',
    },
    fontSize: {
      xs: 12,
      sm: 14,
      base: 16,
      lg: 18,
      xl: 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
  },

  borderRadius: {
    sm: 6,
    md: 12,
    lg: 16,
    full: 9999,
  },

  shadows: {
    sm: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 1,
      },
      shadowOpacity: 0.18,
      shadowRadius: 1.0,
      elevation: 1,
    },
    md: {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    },
  },

  gradients: {
    primary: ['#0066FF', '#0044FF'] as const,
    glass: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)'] as const,
  },
}; 