import { PriceData } from '@/types';
import { PricePoint, AreaProps } from './types';
import { withRepeat, withSpring, SharedValue, useSharedValue } from 'react-native-reanimated';
import { format } from 'date-fns';
import { useLinePath, type PointsArray } from 'victory-native';
import { useMemo, useEffect } from 'react';
import { CHART_CONSTANTS } from './styles';

// ─── Time Format Utilities ─────────────────────────────────────────────────
export const getTimeFormat = (period?: string) => {
	switch (period) {
		case '1H':
		case '4H':
			return {
				axis: (v: number) => format(new Date(v), 'HH:mm'),
				tooltip: (v: number) => format(new Date(v), "HH:mm 'on' MMM d"),
				tickCount: 4
			};
		case '1D':
			return {
				axis: (v: number) => format(new Date(v), 'HH:mm'),
				tooltip: (v: number) => format(new Date(v), "HH:mm 'on' MMM d"),
				tickCount: 4
			};
		case '1W':
			return {
				axis: (v: number) => format(new Date(v), 'EEE'),
				tooltip: (v: number) => format(new Date(v), "HH:mm 'on' EEE, MMM d"),
				tickCount: 4
			};
		case '1M':
			return {
				axis: (v: number) => format(new Date(v), 'MMM d'),
				tooltip: (v: number) => format(new Date(v), "MMM d"),
				tickCount: 4
			};
		case 'ALL':
		case '1Y':
			return {
				axis: (v: number) => format(new Date(v), 'MMM'),
				tooltip: (v: number) => format(new Date(v), "MMM yyyy"),
				tickCount: 4
			};
		default:
			return {
				axis: (v: number) => format(new Date(v), 'MMM d'),
				tooltip: (v: number) => format(new Date(v), "MMM d, yyyy"),
				tickCount: 4
			};
	}
};

export const prepareChartData = (data: PriceData[]): PricePoint[] => {
	console.log('[prepareChartData] Input data:', {
		length: data?.length || 0,
		firstItem: data?.[0],
		lastItem: data?.[data?.length - 1],
		sampleData: data?.slice(0, 3)
	});

	if (!data || data.length === 0) {
		console.log('[prepareChartData] No data provided, returning empty array');
		return [];
	}
	
	// Limit points for better performance if needed
	const targetLength = 150;
	let dataToProcess = data;
	
	// If we have too many points, sample them to reduce workload
	if (data.length > targetLength) {
		const skipFactor = Math.ceil(data.length / targetLength);
		dataToProcess = data.filter((_, i) => i % skipFactor === 0 || i === data.length - 1);
		console.log('[prepareChartData] Sampled data for performance:', {
			originalLength: data.length,
			sampledLength: dataToProcess.length,
			skipFactor
		});
	}
	
	const processedPoints = dataToProcess.map((pt, index) => {
		const t = new Date(pt.timestamp).getTime();
		const v = typeof pt.value === 'string' ? parseFloat(pt.value) : pt.value;
		const point = { timestamp: t, price: v, value: v, x: t, y: v };
		
		// Log first few points for debugging
		if (index < 3) {
			console.log(`[prepareChartData] Point ${index}:`, {
				original: pt,
				processed: point,
				timestampDate: new Date(t).toISOString()
			});
		}
		
		return point;
	});

	console.log('[prepareChartData] Final processed data:', {
		length: processedPoints.length,
		firstPoint: processedPoints[0],
		lastPoint: processedPoints[processedPoints.length - 1],
		timeRange: processedPoints.length > 1 ? {
			start: new Date(processedPoints[0].x).toISOString(),
			end: new Date(processedPoints[processedPoints.length - 1].x).toISOString(),
			durationMs: processedPoints[processedPoints.length - 1].x - processedPoints[0].x
		} : null
	});

	return processedPoints;
};

export const formatPrice = (price: number): string => {
	return new Intl.NumberFormat('en-US', {
		style: 'currency',
		currency: 'USD',
		minimumFractionDigits: 2,
		maximumFractionDigits: 6,
	}).format(price);
}; 

export const determineChartColor = (data: PricePoint[]): 'green' | 'red' => {
	if (!data || data.length < 2) return 'green';
	const firstValue = data[0].value;
	const lastValue = data[data.length - 1].value;
	return lastValue >= firstValue ? 'green' : 'red';
};

export const createPulsateAnimation = (animatedValue: SharedValue<number>) => {
	// Use a simpler animation with fewer keyframes
	return withRepeat(
		withSpring(CHART_CONSTANTS.dotSize.pulse.max, {
			damping: 6,
			stiffness: 80,
			mass: 5.5, // Lighter mass for faster animation
			overshootClamping: true, // Prevent overshoot for smoother animation
		}),
		-1,
		true
	);
};

// Updated chart colors with simpler format
export const CHART_COLORS = {
    green: {
        line: '#0BA360',
        area: 'rgba(11, 163, 96, 0.5)',
        indicator: '#0BA360',
        glow: '#0BA360',
        gradient: ['#0BA36090', '#0BA36040', '#0BA36005'] // More transparent TradingView style
    },
    red: {
        line: '#E04E4A',
        area: 'rgba(224, 78, 74, 0.5)',
        indicator: '#E04E4A',
        glow: '#E04E4A',
        gradient: ['#E04E4A90', '#E04E4A40', '#E04E4A05'] // More transparent TradingView style
    }
}; 

// Export a simpler version of chart colors for use in other components
export const TREND_COLORS = {
    positive: '#0BA360', // Green color for positive trends
    negative: '#E04E4A'  // Red color for negative trends
}; 

// ─── GradientArea Component Logic ────────────────────────────────────────────
export const useGradientArea = ({ points, y0, color, opacity = 0.8, gradientColors }: AreaProps) => {
	// Extract base color for gradient
	const baseColor = color.startsWith('rgba') 
		? color.replace(/rgba\((\d+),\s*(\d+),\s*(\d+).*/, 'rgb($1, $2, $3)') 
		: color;
	
	// Create default gradient colors if not provided
	const colors = gradientColors || [
		baseColor,         // Solid color at top
		`${baseColor}80`,  // 50% opacity in middle
		`${baseColor}10`   // 10% opacity at bottom
	];
	
	// Get the line path from victory-native's useLinePath
	const { path: linePath } = useLinePath(points, { curveType: 'cardinal' });
	
	// Create the area path with Skia
	const areaPath = useMemo(() => {
		if (!points || !Array.isArray(points) || points.length === 0 || !linePath) return null;
		
		// Get the first and last points
		const lastPoint = points[points.length - 1];
		const firstPoint = points[0];
		
		// Ensure points have the expected structure
		if (!lastPoint || !firstPoint || typeof lastPoint.x !== 'number' || typeof firstPoint.x !== 'number') {
			return null;
		}
		
		// Create a new path for the area
		const Skia = require('@shopify/react-native-skia').Skia;
		const path = Skia.Path.Make();
		
		// Add the line path
		path.addPath(linePath);
		
		// Add line to bottom right
		path.lineTo(lastPoint.x, y0);
		
		// Add line to bottom left
		path.lineTo(firstPoint.x, y0);
		
		// Close the path
		path.close();
		
		return path;
	}, [points, y0, linePath]);
	
	return {
		areaPath,
		colors
	};
};

// ─── SpringLine Component Logic ─────────────────────────────────────────────
export const useSpringLine = (
	points: PointsArray,
	dataKey?: string,
	initialProgress: number = 1
) => {
	// get raw Skia path from points
	const { path: skPath } = useLinePath(points, { curveType: 'cardinal' });

	// Create animated progress using useSharedValue
	const progress = useSharedValue(initialProgress);

	// Only animate when dataKey changes (new dataset), not on every points change
	useEffect(() => {
		if (dataKey) {
			// Reset and animate
			progress.value = 0;
			progress.value = withSpring(1, {
				stiffness: CHART_CONSTANTS.animation.stiffness.normal,
				damping: CHART_CONSTANTS.animation.damping.responsive,
			});
		}
	}, [dataKey, progress]);

	return {
		skPath,
		progress
	};
};

// Helper to create unique chart key
export const createChartKey = (data: PricePoint[] | PriceData[], period?: string) => {
	if (data && data.length > 0) {
		return `chart-${data.length}-${data[0]?.timestamp}-${period}`;
	}
	return "";
};

// ─── HorizontalDottedLine Component Logic ─────────────────────────────────────
export const createHorizontalDottedLinePoints = (
	startX: number,
	endX: number,
	y: number,
	dotSpacing: number = 6, 
	dotSize: number = 3
) => {
	// Create a dotted line by drawing multiple segments
	// This produces a true dotted appearance without relying on dash patterns
	const lineWidth = endX - startX;
	
	// Calculate number of dots that will fit
	const numDots = Math.floor(lineWidth / dotSpacing);
	
	return Array.from({ length: numDots }).map((_, i) => ({
		start: { x: startX + i * dotSpacing, y },
		end: { x: startX + i * dotSpacing + dotSize, y }
	}));
};

// Helper for spring animation
export const useSpring = (initialValue: number) => {
	const sharedValue = useMemo(() => useSharedValue(initialValue), [initialValue]);
	return sharedValue;
};
