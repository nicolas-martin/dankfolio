import { StyleSheet } from 'react-native';
import { AppTheme } from '@/utils/theme';
import { useTheme } from 'react-native-paper';

export const useStyles = () => {
	const theme = useTheme() as AppTheme;
	const colors = theme.colors;
	const styles = StyleSheet.create({
		chartContainer: {
			height: 250,
			backgroundColor: theme.colors.surface,
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
			backgroundColor: theme.colors.surface,
			borderRadius: theme.spacing.sm,
		},
		tooltipText: {
			color: theme.colors.onSurface,
			fontSize: theme.typography.fontSize.xs,
		},
	})

	// Chart UI colors with transparency preserved using theme colors
	const chartUIColors = {
		grid: {
			x: `${theme.colors.onSurface}1A`, // 10% opacity (1A in hex)
			y: `${theme.colors.onSurface}1A`, // 10% opacity
		},
		frame: `${theme.colors.onSurface}1A`, // 10% opacity
		crosshair: `${theme.colors.onSurface}4D`, // 30% opacity (4D in hex)
		dottedLine: `${theme.colors.onSurface}4D`, // 30% opacity
		innerDot: `${theme.colors.onSurface}40`, // 25% opacity (40 in hex)
	};

	// Theme-aware chart colors for trends
	const chartColors = {
		green: {
			line: theme.trend.positive,
			area: `${theme.trend.positive}80`, // 50% opacity
			indicator: theme.trend.positive,
			glow: theme.trend.positive,
			gradient: [`${theme.trend.positive}90`, `${theme.trend.positive}40`, `${theme.trend.positive}05`]
		},
		red: {
			line: theme.trend.negative,
			area: `${theme.trend.negative}80`, // 50% opacity
			indicator: theme.trend.negative,
			glow: theme.trend.negative,
			gradient: [`${theme.trend.negative}90`, `${theme.trend.negative}40`, `${theme.trend.negative}05`]
		}
	};

	// Simple trend colors for external use
	const trendColors = {
		positive: theme.trend.positive,
		negative: theme.trend.negative,
		neutral: theme.trend.neutral,
	};

	return {
		...styles,
		colors,
		theme,
		chartUIColors,
		chartColors,
		trendColors
	}
};



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
};
