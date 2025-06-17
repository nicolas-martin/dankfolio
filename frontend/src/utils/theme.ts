import { Dimensions } from 'react-native';
import { MD3DarkTheme as DefaultTheme, MD3LightTheme, MD3Theme } from 'react-native-paper';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

// Base theme properties that both themes share
const baseTheme = {
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
};

// Light theme colors
const lightColors = {
	primary: '#2962FF',
	primaryVariant: '#0D47A1',
	secondary: '#FFD600',
	secondaryVariant: '#FFAB00',
	background: '#FFFFFF',
	surface: '#F5F5F5',
	error: '#B00020',
	warning: '#FFA000',
	success: '#4CAF50',
	text: '#000000',
	textSecondary: '#757575',
	trend: {
		positive: '#2E7D32',
		negative: '#D32F2F',
		neutral: '#666666',
	},
};

// Create Paper-compatible themes
export const lightPaperTheme: MD3Theme = {
	...MD3LightTheme,
	colors: {
		...MD3LightTheme.colors,
		primary: lightColors.primary,
		primaryContainer: lightColors.primaryVariant,
		secondary: lightColors.secondary,
		secondaryContainer: lightColors.secondaryVariant,
		background: lightColors.background,
		surface: lightColors.surface,
		surfaceVariant: lightColors.surface,
		error: lightColors.error,
		onPrimary: '#FFFFFF',
		onSecondary: '#000000',
		onBackground: '#000000',
		onSurface: '#000000',
		onSurfaceVariant: '#757575',
		onError: '#FFFFFF',
		outline: '#BDBDBD',
		outlineVariant: '#757575',
		tertiary: lightColors.secondary,
		tertiaryContainer: lightColors.secondaryVariant,
		onTertiary: '#000000',
		onTertiaryContainer: '#000000',
		errorContainer: lightColors.error,
		onErrorContainer: '#FFFFFF',
		onPrimaryContainer: '#FFFFFF',
		onSecondaryContainer: '#000000',
	},
};

// New neon crypto theme based on MD3DarkTheme
export const neonCryptoTheme: MD3Theme = {
	...DefaultTheme,
	colors: {
		...DefaultTheme.colors,
		primary: '#00FF9F',
		onPrimary: '#0D0F1A',
		secondary: '#8A2BE2',
		onSecondary: '#FFFFFF',
		background: '#0D0F1A',
		surface: '#1A1D2B',
		onSurface: '#E0F7FA',
		surfaceVariant: '#1F2937',
		outline: '#1F2937',
		onBackground: '#A3B1C2',
		elevation: {
			level0: 'transparent',
			level1: '#121212',
			level2: '#1A1A1A',
			level3: '#1F1F1F',
			level4: '#242424',
			level5: '#2A2A2A',
		},
	},
};

// Additional properties from our theme that aren't in MD3Theme
export const extendedThemeProperties = {
	light: {
		warning: lightColors.warning,
		success: lightColors.success,
		text: lightColors.text,
		textSecondary: lightColors.textSecondary,
		trend: lightColors.trend,
		typography: baseTheme.typography,
		spacing: baseTheme.spacing,
		borderRadius: baseTheme.borderRadius,
		shadows: baseTheme.shadows,
		gradients: {
			primary: ['#0066FF', '#0044FF'] as const,
			glass: ['rgba(255, 255, 255, 0.9)', 'rgba(255, 255, 255, 0.7)'] as const,
		},
	},
	neon: {
		text: '#E0F7FA',
		textSecondary: '#A3B1C2',
		warning: '#FFA000',
		success: '#4CAF50',
		trend: {
			positive: '#00FF9F',
			negative: '#FF4081',
			neutral: '#A3B1C2',
		},
		typography: baseTheme.typography,
		spacing: baseTheme.spacing,
		borderRadius: baseTheme.borderRadius,
		shadows: baseTheme.shadows,
		gradients: {
			primary: ['#00FF9F', '#8A2BE2'] as const,
			glass: ['rgba(26, 29, 43, 0.9)', 'rgba(26, 29, 43, 0.7)'] as const,
		},
	}
};

// Define theme types for type safety
export type ThemeType = 'light' | 'neon';

// Export the themes in a single object for easy access
export const themes = {
	light: lightPaperTheme,
	neon: neonCryptoTheme,
};

// At the end of the file, or after extendedThemeProperties definition
export type AppTheme = MD3Theme & {
	warning: string;
	success: string;
	text: string;
	textSecondary: string;
	trend: {
		positive: string;
		negative: string;
		neutral: string;
	};
	typography: typeof baseTheme.typography;
	spacing: typeof baseTheme.spacing;
	borderRadius: typeof baseTheme.borderRadius;
	shadows: typeof baseTheme.shadows;
	gradients: {
		primary: readonly string[];
		glass: readonly string[];
	};
};
