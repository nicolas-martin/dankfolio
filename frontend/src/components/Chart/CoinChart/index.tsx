import React, {
	forwardRef,
	useMemo,
	useRef,
	useEffect,
	ReactNode,
} from 'react';
import { View } from 'react-native';
import {
	CartesianChart,
	useChartPressState,
	Area,
	useLinePath,
	useAnimatedPath,
	type PointsArray,
} from 'victory-native';  // animated-paths hooks
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	useDerivedValue,
	runOnJS,
	cancelAnimation,
	withSpring,
	SharedValue,
} from 'react-native-reanimated';
import {
	Path,
	Circle as SkiaCircle,
	Line as SkiaLine,
	Text as SkiaText,
	useFont as useSkiaFont,
} from '@shopify/react-native-skia';
import { useTheme, Text } from 'react-native-paper';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { format } from 'date-fns';
import inter from '@assets/fonts/inter-medium.ttf';
import { createStyles } from './styles';
import type { CoinChartProps, PricePoint } from './types';
import { logger } from '@/utils/logger';

const initChartPressState = { x: 0, y: { y: 0 } };

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
			console.log('🎯 SpringLine: Animating new dataset', dataKey);
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
			});
			opacity.value = withSpring(1, {
				stiffness: 120,
				damping: 20,
			});
		} else {
			scale.value = withSpring(0.9, {
				stiffness: 120,
				damping: 15,
			});
			opacity.value = withSpring(0.7, {
				stiffness: 120,
				damping: 15,
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
	return (
		<>
			<SkiaLine
				p1={{ x: xPosition.value, y: bottom }}
				p2={{ x: xPosition.value, y: top + 30 }}
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

// ─── CoinChart ───────────────────────────────────────────────────────────────
export default function CoinChart({
	data,
	loading,
	onHover,
}: CoinChartProps) {
	const theme = useTheme();
	const styles = createStyles(theme);
	const isMounted = useRef(true);
	const animations = useRef<SharedValue<any>[]>([]);
	const font = useSkiaFont(inter, 12);

	useFocusEffect(
		React.useCallback(
			() => () => animations.current.forEach(a => cancelAnimation(a)),
			[]
		)
	);
	useEffect(
		() => () => {
			isMounted.current = false;
			animations.current.forEach(a => cancelAnimation(a));
		},
		[]
	);

	const { state: chartPress, isActive: isPressActive } =
		useChartPressState(initChartPressState);

	// fire onHover back to JS
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

	// haptic feedback
	useEffect(() => {
		let alive = true;
		if (isPressActive && alive) {
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(e =>
				logger.warn('Haptics failed', { error: e?.message })
			);
		}
		return () => {
			alive = false;
		};
	}, [isPressActive]);

	// preprocess data
	const processedChartData: PricePoint[] = useMemo(
		() => {
			const processed = (data || []).map(pt => {
				const t = new Date(pt.timestamp).getTime();
				const v =
					typeof pt.value === 'string' ? parseFloat(pt.value) : pt.value;
				return { timestamp: t, price: v, value: v, x: t, y: v };
			});
			console.log('📊 Chart data processed:', processed.length, 'points');
			return processed;
		},
		[data]
	);

	if (loading || !processedChartData.length) {
		return (
			<View style={styles.loadingContainer}>
				<Text testID="loading-text">Loading Chart…</Text>
			</View>
		);
	}

	const activeX = chartPress.x.value.value;

	return (
		<ChartWrapper active={!loading}>
			<View style={styles.chartContainer} testID="coin-chart-container">
				<CartesianChart
					key={`chart-${processedChartData.length}-${processedChartData[0]?.timestamp}`}
					data={processedChartData}
					xKey="x"
					yKeys={['y']}
					domainPadding={{ top: 25 }}
					padding={0}
					chartPressState={[chartPress]}
					axisOptions={{
						font,
						tickCount: 0,
						labelPosition: { x: 'outset', y: 'inset' },
						axisSide: { x: 'bottom', y: 'left' },
						formatXLabel: v => format(new Date(v), 'HH:mm'),
						formatYLabel: () => '',
						lineColor: {
							grid: {
								x: theme.colors.outlineVariant,
								y: theme.colors.outlineVariant,
							},
							frame: theme.colors.outlineVariant,
						},
						labelColor: theme.colors.onSurfaceVariant,
					}}
					renderOutside={({ chartBounds }) => {
						if (!isPressActive || typeof activeX !== 'number' || !font)
							return null;
						const label = format(
							new Date(activeX),
							"EEE MMM d 'at' h:mm a"
						);
						const rawX = chartPress.x.position.value;
						const w = font.measureText(label).width;
						const half = w / 2;
						const xPos = Math.min(
							Math.max(rawX - half, chartBounds.left),
							chartBounds.right - w
						);

						return (
							<>
								<ActiveValueIndicator
									xPosition={chartPress.x.position}
									yPosition={chartPress.y.y.position}
									bottom={chartBounds.bottom}
									top={chartBounds.top}
									lineColor={theme.colors.outlineVariant}
									indicatorColor={theme.colors.primary}
								/>
								<SkiaText
									x={xPos}
									y={chartBounds.top + 20}
									text={label}
									font={font}
									color={theme.colors.onSurfaceVariant}
								/>
							</>
						);
					}}
				>
					{({ points, chartBounds }) => (
						<>
							<Area
								points={points.y}
								y0={chartBounds.bottom}
								color={theme.colors.primary}
								opacity={0.3}
							/>
							<SpringLine
								key={`line-${processedChartData.length}-${processedChartData[0]?.timestamp}`}
								points={points.y}
								strokeWidth={2}
								color={theme.colors.primary}
								dataKey={`${processedChartData.length}-${processedChartData[0]?.timestamp}`}
							/>
						</>
					)}
				</CartesianChart>
			</View>
		</ChartWrapper>
	);
}

