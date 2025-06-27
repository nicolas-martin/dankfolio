import React, { useRef, useEffect, ReactNode, useState } from 'react';
import { View } from 'react-native';
import { CartesianChart, useChartPressState, type PointsArray } from 'victory-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	useDerivedValue,
	runOnJS,
	cancelAnimation,
	withSpring,
	SharedValue,
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
import { ActivityIndicator } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import inter from '@assets/fonts/inter-medium.ttf';
import { useStyles, CHART_CONSTANTS } from './styles';
import type { CoinChartProps, PricePoint, PulsatingDotProps, AreaProps } from './types';
import {
	determineChartColor,
	createPulsateAnimation,
	getTimeFormat,
	prepareChartData,
	createChartKey,
	useGradientArea,
	useSpringLine,
	createHorizontalDottedLinePoints
} from './scripts';

const initChartPressState = { x: 0, y: { y: 0 } };

// ─── GradientArea ────────────────────────────────────────────────────────────
function GradientArea({ points, y0, color, opacity = 0.8, gradientColors }: AreaProps) {
	const { areaPath, colors } = useGradientArea({ points, y0, color, opacity, gradientColors });

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
	strokeWidth = CHART_CONSTANTS.line.width.main,
	color,
	dataKey,
}: {
	points: PointsArray;
	strokeWidth?: number;
	color?: string;
	dataKey?: string;
}) {
	const { skPath, progress } = useSpringLine(points, dataKey);

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
	const opacity = useSharedValue(active ? 1 : 0.7);

	useEffect(() => {
		if (active) {
			opacity.value = withSpring(1, {
				stiffness: CHART_CONSTANTS.animation.stiffness.responsive,
				damping: CHART_CONSTANTS.animation.damping.responsive,
				mass: CHART_CONSTANTS.animation.mass.light,
			});
		} else {
			opacity.value = withSpring(0.7, {
				stiffness: CHART_CONSTANTS.animation.stiffness.responsive,
				damping: CHART_CONSTANTS.animation.damping.normal,
				mass: CHART_CONSTANTS.animation.mass.light,
			});
		}
	}, [active]);

	const style = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	return <Animated.View style={style}>{children}</Animated.View>;
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
	// Get points from helper function
	const dotPoints = createHorizontalDottedLinePoints(
		startX,
		endX,
		y,
		CHART_CONSTANTS.dotSpacing
	);

	return (
		<Group>
			{dotPoints.map((point, i) => (
				<SkiaLine
					key={`dot-${i}`}
					p1={point.start}
					p2={point.end}
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
	const styles = useStyles();
	const isMounted = useRef(true);
	const animations = useRef<SharedValue<unknown>[]>([]);
	const font = useSkiaFont(inter, 12);
	const pulseRadius = useSharedValue(CHART_CONSTANTS.dotSize.pulse.min);

	// Get time formatting based on period
	const timeFormat = React.useMemo(() => getTimeFormat(period), [period]);

	// Reduce pulsate animation complexity for better performance
	const setupPulseAnimation = () => {
		// Start with min radius
		pulseRadius.value = CHART_CONSTANTS.dotSize.pulse.min;
		// Create animation but don't assign directly to pulseRadius.value
		const animation = createPulsateAnimation(pulseRadius);
		// Apply the animation
		pulseRadius.value = animation;
		// Track for cleanup
		animations.current.push(pulseRadius);
	};

	// Store last point position for more stable animations
	const lastPointPos = useSharedValue({ x: 0, y: 0 });
	// Store current press position for immediate response
	const currentPressPos = useSharedValue({ x: 0, y: 0 });
	const [chartKey, setChartKey] = useState<string>("");

	// Throttled haptic feedback for better performance
	const triggerHaptic = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

	useFocusEffect(
		React.useCallback(
			() => () => animations.current.forEach(a => cancelAnimation(a)),
			[]
		)
	);

	useEffect(() => {
		// Create a unique key for the chart when data changes
		setChartKey(createChartKey(data, period));

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
				runOnJS(triggerHaptic)();
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
	const processedChartData: PricePoint[] = React.useMemo(
		() => {
			return prepareChartData(data);;
		},
		[data]
	);

	// Determine chart color based on price trend
	const chartColor = React.useMemo(() => {
		return determineChartColor(processedChartData);
	}, [processedChartData]);

	// Define chart line and area colors using theme-aware colors
	const colors = styles.chartColors[chartColor];
	// Get the area color from the colors object
	const areaColor = colors.area;
	// Get the gradient colors
	const gradientColors = colors.gradient;

	const activeX = chartPress.x.value.value;

	const showLoading = loading || !processedChartData.length;

	return (
		<ChartWrapper active={!loading}>
			<View style={styles.chartContainer} testID="coin-chart-container">
				{showLoading && (
					<View style={styles.loadingOverlay}>
						<ActivityIndicator animating={true} size="large" testID="loading-indicator" />
					</View>
				)}
				{!showLoading && (
					<CartesianChart
						key={chartKey}
						data={processedChartData}
						xKey="x"
						yKeys={['y']}
						domainPadding={{ top: 25 }}
						padding={{ left: 0, right: 0, top: 0, bottom: 5 }}
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
									x: styles.chartUIColors.grid.x,
									y: styles.chartUIColors.grid.y,
								},
								frame: styles.chartUIColors.frame,
							},
							labelColor: styles.colors.onSurface,
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
										color={styles.chartUIColors.crosshair}
										strokeWidth={1}
									/>
									<SkiaCircle
										cx={rawX}
										cy={currentPressPos.value.y}
										r={CHART_CONSTANTS.dotSize.outer}
										color={colors.line}
									/>
									<SkiaCircle
										cx={rawX}
										cy={currentPressPos.value.y}
										r={CHART_CONSTANTS.dotSize.inner}
										color={styles.chartUIColors.innerDot}
									/>
									<SkiaText
										x={xPos}
										y={chartBounds.top + 20}
										text={label}
										font={font}
										color={styles.colors.onSurface}
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
										strokeWidth={CHART_CONSTANTS.line.width.main}
										color={colors.line}
										dataKey={chartKey}
									/>

									{/* Horizontal dotted line from last point */}
									<HorizontalDottedLine
										startX={chartBounds.left}
										endX={lastPointPos.value.x}
										y={lastPointPos.value.y}
										color={styles.chartUIColors.dottedLine}
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
				)}
			</View>
		</ChartWrapper>
	);
}
