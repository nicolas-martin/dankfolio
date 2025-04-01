import { createConfig } from "@gluestack-ui/themed"
import { theme as appTheme } from './theme'

export const config = createConfig({
  tokens: {
    colors: {
      primary: appTheme.colors.primary,
      secondary: appTheme.colors.secondary,
      background: appTheme.colors.background,
      backgroundDark: appTheme.colors.containerBackground,
      backgroundLight: appTheme.colors.cardBackGround,
      text: appTheme.colors.text,
      textLight: appTheme.colors.white,
      textSecondary: appTheme.colors.textSecondary,
      borderLight: appTheme.colors.border,
      error: appTheme.colors.error,
      success: appTheme.colors.success,
      warning: appTheme.colors.warning,
    },
    space: {
      px: '1px',
      '0': 0,
      '0.5': 2,
      '1': 4,
      '2': 8,
      '3': 12,
      '4': 16,
      '5': 20,
      '6': 24,
      '7': 28,
      '8': 32,
      '9': 36,
      '10': 40,
      '12': 48,
      '16': 64,
      '20': 80,
    },
    borderWidths: {
      '0': 0,
      '1': 1,
      '2': 2,
      '4': 4,
    },
    radii: {
      'none': 0,
      'xs': 2,
      'sm': 6,
      'md': 12,
      'lg': 16,
      'full': 9999,
    },
    fontSizes: {
      'xs': 12,
      'sm': 14,
      'base': 16,
      'lg': 18,
      'xl': 20,
      '2xl': 24,
      '3xl': 30,
      '4xl': 36,
    },
    fontWeights: {
      'normal': '400',
      'medium': '500',
      'semibold': '600',
      'bold': '700',
    },
  },
  aliases: {
    // Required aliases for proper typing
    bg: 'backgroundColor',
    h: 'height',
    w: 'width',
    p: 'padding',
    px: 'paddingHorizontal',
    py: 'paddingVertical',
    m: 'margin',
    mx: 'marginHorizontal',
    my: 'marginVertical',
    mt: 'marginTop',
    mb: 'marginBottom',
    ml: 'marginLeft',
    mr: 'marginRight',
    pt: 'paddingTop',
    pb: 'paddingBottom',
    pl: 'paddingLeft',
    pr: 'paddingRight',
    rounded: 'borderRadius',
  },
  globalStyle: {
    variants: {
      shadow: {
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
    },
  },
})

type ConfigType = typeof config
declare module '@gluestack-ui/themed' {
  interface UIConfig extends ConfigType {}
}