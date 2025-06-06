import React, { useMemo, useRef, useEffect, ReactNode, useState } from 'react';
import { View } from 'react-native';
import { CartesianChart, useChartPressState, Area, useLinePath, type PointsArray, } from 'victory-native';
import Animated, { 
	useSharedValue, 
	useAnimatedStyle, 
	useDerivedValue, 
	runOnJS, 
	cancelAnimation, 
	withSpring, 
	SharedValue,
	withRepeat,
	useAnimatedReaction
} from 'react-native-reanimated';
import { 
	Path, 
	Circle as SkiaCircle, 
	Line as SkiaLine, 
	Text as SkiaText, 
	useFont as useSkiaFont,
	Group,
	LinearGradient,
	vec
} from '@shopify/react-native-skia';
import { useTheme, ActivityIndicator } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import inter from '@assets/fonts/inter-medium.ttf';
import { createStyles } from './styles';
import type { CoinChartProps, PricePoint, PulsatingDotProps, AreaProps } from './types';
import { logger } from '@/utils/logger';
import { determineChartColor, createPulsateAnimation, CHART_COLORS } from './scripts';

const initChartPressState = { x: 0, y: { y: 0 } };

// ─── Time Format Utilities ─────────────────────────────────────────────────
const getTimeFormat = (period?: string) => {
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

// ─── GradientArea ────────────────────────────────────────────────────────────
function GradientArea({ points, y0, color, opacity = 0.8, gradientColors }: AreaProps) {
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
		if (!points || points.length === 0 || !linePath) return null;
		
		// Get the first and last points
		const lastPoint = points[points.length - 1];
		const firstPoint = points[0];
		
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
	
	if (!areaPath) return null;
	
	return (
		<Path
			path={areaPath}
			style="fill"
			opacity={opacity}
		>
			<LinearGradient
				start={vec(0, 0)}
				end={vec(0, y0)}
				colors={colors}
			/>
		</Path>
	);
}

// ─── SpringLine ─────────────────────────────────────────────────────────────
function SpringLine({
	points,
	strokeWidth = 2,
	color,
	dataKey,
}: {
	points: PointsArray;
	strokeWidth?: number;
	color?: string;
	dataKey?: string;
}) {
	// get raw Skia path from points
	const { path: skPath } = useLinePath(points, { curveType: 'cardinal' });

	// Create animated progress for path trimming
	const progress = useSharedValue(1); // Start at 1 to avoid re-animation on interaction

	// Only animate when dataKey changes (new dataset), not on every points change
	useEffect(() => {
		if (dataKey) {
			progress.value = 0;
			progress.value = withSpring(1, {
				stiffness: 100,
				damping: 20,
			});
		}
	}, [dataKey]);

	return (
		<Path
			path={skPath}
			strokeWidth={strokeWidth}
			color={color}
			style="stroke"
			start={0}
			end={progress}
		/>
	);
}

// ─── PulsatingDot ─────────────────────────────────────────────────────────
function PulsatingDot({ position, radius, color }: PulsatingDotProps) {
	return (
		<SkiaCircle 
			cx={position.x} 
			cy={position.y} 
			r={radius} 
			color={color}
		/>
	);
}

// ─── ChartWrapper ────────────────────────────────────────────────────────────
function ChartWrapper({
	active,
	children,
}: {
	active: boolean;
	children: ReactNode;
}) {
	const scale = useSharedValue(0.8);
	const opacity = useSharedValue(0);

	useEffect(() => {
		if (active) {
			scale.value = withSpring(1, {
				stiffness: 100,
				damping: 15,
				mass: 0.8, // Lighter mass for faster response
			});
			opacity.value = withSpring(1, {
				stiffness: 120,
				damping: 20,
				mass: 0.8, // Lighter mass for faster response
			});
		} else {
			scale.value = withSpring(0.9, {
				stiffness: 120,
				damping: 15,
				mass: 0.8, // Lighter mass for faster response
			});
			opacity.value = withSpring(0.7, {
				stiffness: 120,
				damping: 15,
				mass: 0.8, // Lighter mass for faster response
			});
		}
	}, [active]);

	const style = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
	}));

	return <Animated.View style={style}>{children}</Animated.View>;
}

// ─── ActiveValueIndicator ──────────────────────────────────────────────────
function ActiveValueIndicator({
	xPosition,
	yPosition,
	bottom,
	top,
	lineColor,
	indicatorColor,
}: {
	xPosition: SharedValue<number>;
	yPosition: SharedValue<number>;
	bottom: number;
	top: number;
	lineColor: string;
	indicatorColor: string;
}) {
	// Use direct property access to avoid lag in vertical line position
	return (
		<>
			<SkiaLine
				p1={{ x: xPosition.value, y: top }}
				p2={{ x: xPosition.value, y: bottom }}
				color={lineColor}
				strokeWidth={1}
			/>
			<SkiaCircle cx={xPosition} cy={yPosition} r={6} color={indicatorColor} />
			<SkiaCircle
				cx={xPosition}
				cy={yPosition}
				r={4}
				color="hsla(0, 0, 100%, 0.25)"
			/>
		</>
	);
}

// ─── HorizontalDottedLine ─────────────────────────────────────────────────
function HorizontalDottedLine({
	startX,
	endX,
	y,
	color,
}: {
	startX: number;
	endX: number;
	y: number;
	color: string;
}) {
	// Create a dotted line by drawing multiple segments
	// This produces a true dotted appearance without relying on dash patterns
	const lineWidth = endX - startX;
	const dotSpacing = 6; // Total space between dots (dot + gap)
	const dotSize = 3;    // Size of each dot
	
	// Calculate number of dots that will fit
	const numDots = Math.floor(lineWidth / dotSpacing);
	
	return (
		<Group>
			{Array.from({ length: numDots }).map((_, i) => (
				<SkiaLine
					key={`dot-${i}`}
					p1={{ x: startX + i * dotSpacing, y }}
					p2={{ x: startX + i * dotSpacing + dotSize, y }}
					color={color}
					strokeWidth={1}
					style="stroke"
				/>
			))}
		</Group>
	);
}

// ─── CoinChart ───────────────────────────────────────────────────────────────
export default function CoinChart({
	data,
	loading,
	onHover,
	period,
}: CoinChartProps) {
	const theme = useTheme();
	const styles = createStyles(theme);
	const isMounted = useRef(true);
	const animations = useRef<SharedValue<any>[]>([]);
	const font = useSkiaFont(inter, 12);
	const pulseRadius = useSharedValue(8);
	
	// Get time formatting based on period
	const timeFormat = useMemo(() => getTimeFormat(period), [period]);
	
	// Reduce pulsate animation complexity for better performance
	const setupPulseAnimation = () => {
		pulseRadius.value = 4;
		// Use a simpler animation with fewer keyframes
		const animation = withRepeat(
			withSpring(5.5, {
				damping: 6,
				stiffness: 80,
				mass: 5.5, // Lighter mass for faster animation
				overshootClamping: true, // Prevent overshoot for smoother animation
			}),
			-1,
			true
		);
		pulseRadius.value = animation;
		animations.current.push(pulseRadius);
	};
	
	// Store last point position for more stable animations
	const lastPointPos = useSharedValue({ x: 0, y: 0 });
	// Store current press position for immediate response
	const currentPressPos = useSharedValue({ x: 0, y: 0 });
	const [chartKey, setChartKey] = useState<string>("");
	
	// Throttled haptic feedback for better performance
	const lastHapticTime = useRef(0);
	const throttledHaptic = () => {
		const now = Date.now();
		if (now - lastHapticTime.current > 150) { // Only trigger every 150ms
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
			lastHapticTime.current = now;
		}
	};

	useFocusEffect(
		React.useCallback(
			() => () => animations.current.forEach(a => cancelAnimation(a)),
			[]
		)
	);
	
	useEffect(() => {
		// Create a unique key for the chart when data changes
		if (data && data.length > 0) {
			setChartKey(`chart-${data.length}-${data[0]?.timestamp}-${period}`);
		}
		
		// Set up pulsating animation
		setupPulseAnimation();
		
		return () => {
			isMounted.current = false;
			animations.current.forEach(a => cancelAnimation(a));
		};
	}, [data, period]);

	const { state: chartPress, isActive: isPressActive } =
		useChartPressState(initChartPressState);
		
	// Update current press position for immediate access
	// Optimize to run on UI thread only
	useAnimatedReaction(
		() => {
			if (isPressActive) {
				return {
					x: chartPress.x.position.value,
					y: chartPress.y.y.position.value
				};
			}
			return currentPressPos.value;
		},
		(nextValue) => {
			currentPressPos.value = nextValue;
		},
		[isPressActive]
	);

	// fire onHover back to JS - optimized to reduce workload
	useDerivedValue(
		() => {
			if (!onHover) return;
			if (!isPressActive) {
				runOnJS(onHover)(null);
				return;
			}
			const xVal = chartPress.x.value.value;
			const yVal = chartPress.y.y.value.value;
			if (typeof xVal === 'number' && typeof yVal === 'number') {
				// Use throttled haptic to prevent overloading
				runOnJS(throttledHaptic)();
				runOnJS(onHover)({
					timestamp: xVal,
					price: yVal,
					value: yVal,
					x: xVal,
					y: yVal,
				});
			}
		},
		[isPressActive, chartPress, onHover]
	);

	// preprocess data - optimize by memoizing and reducing calculations
	const processedChartData: PricePoint[] = useMemo(
		() => {
			if (!data || data.length === 0) return [];
			// Limit points for better performance if needed
			const targetLength = 150;
			let dataToProcess = data;
			
			// If we have too many points, sample them to reduce workload
			if (data.length > targetLength) {
				const skipFactor = Math.ceil(data.length / targetLength);
				dataToProcess = data.filter((_, i) => i % skipFactor === 0 || i === data.length - 1);
			}
			
			const processed = dataToProcess.map(pt => {
				const t = new Date(pt.timestamp).getTime();
				const v = typeof pt.value === 'string' ? parseFloat(pt.value) : pt.value;
				return { timestamp: t, price: v, value: v, x: t, y: v };
			});
			
			return processed;
		},
		[data]
	);
	
	// Determine chart color based on price trend
	const chartColor = useMemo(() => {
		return determineChartColor(processedChartData);
	}, [processedChartData]);
	
	// Define chart line and area colors based on screenshot
	const colors = CHART_COLORS[chartColor];
	// Get the area color from the colors object
	const areaColor = colors.area;
	// Get the gradient colors
	const gradientColors = colors.gradient;

	if (loading || !processedChartData.length) {
		return (
			<View style={styles.loadingContainer}>
				<ActivityIndicator animating={true} size="large" testID="loading-indicator" />
			</View>
		);
	}

	const activeX = chartPress.x.value.value;

	return (
		<ChartWrapper active={!loading}>
			<View style={styles.chartContainer} testID="coin-chart-container">
				<CartesianChart
					key={chartKey}
					data={processedChartData}
					xKey="x"
					yKeys={['y']}
					domainPadding={{ top: 25 }}
					padding={{ left: 0, right: 0, top: 0, bottom: 20 }}
					chartPressState={[chartPress]}
					axisOptions={{
						font,
						tickCount: { x: timeFormat.tickCount, y: 3 }, // Use period-specific tick count
						labelPosition: { x: 'outset', y: 'inset' },
						axisSide: { x: 'bottom', y: 'left' },
						formatXLabel: timeFormat.axis, // Use period-specific format
						formatYLabel: v => v.toLocaleString('en-US', {
							minimumFractionDigits: 6,
							maximumFractionDigits: 6
						}),
						lineColor: {
							grid: {
								x: 'rgba(255,255,255,0.1)',
								y: 'rgba(255,255,255,0.1)',
							},
							frame: 'rgba(255,255,255,0.1)',
						},
						labelColor: theme.colors.onSurface,
					}}
					renderOutside={({ chartBounds }) => {
						if (!isPressActive || typeof activeX !== 'number' || !font)
							return null;
							
						// Use period-specific tooltip format
						const label = timeFormat.tooltip(activeX);
						const rawX = currentPressPos.value.x;
						const w = font.measureText(label).width;
						const half = w / 2;
						const xPos = Math.min(
							Math.max(rawX - half, chartBounds.left),
							chartBounds.right - w
						);

						return (
							<>
								<SkiaLine
									p1={{ x: rawX, y: chartBounds.top }}
									p2={{ x: rawX, y: chartBounds.bottom }}
									color="rgba(255,255,255,0.3)"
									strokeWidth={1}
								/>
								<SkiaCircle 
									cx={rawX} 
									cy={currentPressPos.value.y} 
									r={6} 
									color={colors.line} 
								/>
								<SkiaCircle
									cx={rawX}
									cy={currentPressPos.value.y}
									r={4}
									color="hsla(0, 0, 100%, 0.25)"
								/>
								<SkiaText
									x={xPos}
									y={chartBounds.top + 20}
									text={label}
									font={font}
									color={theme.colors.onSurface}
								/>
							</>
						);
					}}
				>
					{({ points, chartBounds }) => {
						// Update last point position for the pulsating dot and dotted line
						if (points.y.length > 0) {
							const point = points.y[points.y.length - 1];
							lastPointPos.value = {
								x: point?.x || 0,
								y: point?.y || 0
							};
						}
						
						return (
							<>
								{/* Area with colored fill based on price trend */}
								<GradientArea
									points={points.y}
									y0={chartBounds.bottom}
									color={areaColor}
									gradientColors={gradientColors}
								/>
								
								{/* Chart Line */}
								<SpringLine
									key={`line-${chartKey}`}
									points={points.y}
									strokeWidth={2}
									color={colors.line}
									dataKey={chartKey}
								/>
								
								{/* Horizontal dotted line from last point */}
								<HorizontalDottedLine
									startX={chartBounds.left}
									endX={lastPointPos.value.x}
									y={lastPointPos.value.y}
									color="rgba(255,255,255,0.3)"
								/>
								
								{/* Pulsating dot on last data point */}
								<PulsatingDot
									position={lastPointPos.value}
									radius={pulseRadius}
									color={colors.line}
								/>
							</>
						);
					}}
				</CartesianChart>
			</View>
		</ChartWrapper>
	);
}
