import { StyleSheet } from 'react-native';
import { MD3Theme } from 'react-native-paper';
import { Dimensions } from 'react-native';
import { AppTheme } from '@/utils/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const createStyles = (theme: AppTheme) => StyleSheet.create({
	chartContainer: {
		height: 250,
		backgroundColor: '#1C2127', // Slightly lighter TradingView dark theme background
		borderRadius: theme.spacing.sm,
		overflow: 'hidden',
	},
	chartWrapper: {
		flex: 1,
		width: '100%',
	},
	dottedLine: {
		borderColor: theme.colors.outlineVariant,
		borderStyle: 'dotted',
		borderWidth: 1,
	},
	hoverLabel: {
		alignItems: 'center',
		pointerEvents: 'none',
		position: 'absolute',
		width: 120,
	},
	hoverTimeText: {
		color: theme.colors.onSurfaceVariant,
		fontSize: theme.typography.fontSize.xs,
		position: 'absolute',
		textAlign: 'center',
	},
	loadingContainer: {
		height: 250,
		justifyContent: 'center',
		alignItems: 'center',
		backgroundColor: '#1C2127', // Match chartContainer background
		borderRadius: theme.spacing.sm,
	},
	tooltipText: {
		color: theme.colors.onSurface,
		fontSize: theme.typography.fontSize.xs,
	},
});

// Constants for styling
export const CHART_CONSTANTS = {
	dotSize: {
		inner: 4,
		outer: 6,
		pulse: {
			min: 4,
			max: 5.5
		}
	},
	line: {
		width: {
			main: 2,
			indicator: 1
		}
	},
	animation: {
		duration: 300,
		stiffness: {
			normal: 100,
			responsive: 120
		},
		damping: {
			normal: 15,
			responsive: 20
		},
		mass: {
			light: 0.8
		}
	},
	dotSpacing: 6,
	hapticThrottle: 150, // ms
};
