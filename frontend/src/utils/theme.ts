import { Dimensions } from 'react-native';

export const SCREEN_WIDTH = Dimensions.get('window').width;
export const SCREEN_HEIGHT = Dimensions.get('window').height;

export const theme = {
	colors: {
		primary: '#2962FF',
		primaryVariant: '#0D47A1',
		secondary: '#FFD600',
		secondaryVariant: '#FFAB00',
		background: '#FFFFFF',
		surface: '#F5F5F5',
		error: '#B00020',
		warning: '#FFA000',
		success: '#4CAF50',
		onPrimary: '#FFFFFF',
		onSecondary: '#000000',
		onBackground: '#000000',
		onSurface: '#000000',
		onError: '#FFFFFF',
		outline: '#BDBDBD',
		outlineVariant: '#757575',
		onSurfaceVariant: '#757575',
		text: '#000000',
		textSecondary: '#757575',
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
