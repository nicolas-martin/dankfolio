import React from "react";
import {
	CartesianChart,
	useAreaPath,
	useLinePath,
	useChartPressState,
} from "victory-native";
import {
	Circle,
	Group,
	Line,
	LinearGradient,
	Path,
	vec,
	useFont,
} from "@shopify/react-native-skia";
import { View } from "react-native";
import { format } from "date-fns";
import {
	useDerivedValue,
	runOnJS,
	type SharedValue,
} from "react-native-reanimated";
import { useTheme, MD3Theme } from "react-native-paper";
import * as Haptics from 'expo-haptics';
import { CoinChartProps, PricePoint } from "./types";

// *** IMPORTANT: Ensure this font file exists at this path ***
// Go up 4 levels to frontend/, then assets/fonts/
// import inter from "../../../../assets/fonts/inter-medium.ttf"; // Use correct filename case
const inter = require("../../../../assets/fonts/inter-medium.ttf"); // Try using require

const initChartPressState = { x: 0, y: { y: 0 } };

export default function CoinChart({
	data,
	loading,
	onHover,
}: CoinChartProps) {

	const theme = useTheme();

	// *** Load font using useFont and direct import ***
	const fontSize = 12;
	const font = useFont(inter, fontSize); // Use imported font object

	const { state: chartPress, isActive: isPressActive } =
		useChartPressState(initChartPressState);

	// Memoize the hover callback
	const memoizedOnHover = React.useCallback((point: PricePoint | null) => {
		onHover?.(point);
	}, [onHover]);

	// Track chart press state
	const pressValue = useDerivedValue(() => {
		'worklet';
		if (!chartPress.x.value || !chartPress.y.y?.value || !isPressActive) {
			return null;
		}
		const xVal = chartPress.x.value.value;
		const yVal = chartPress.y.y.value.value;
		if (typeof xVal !== 'number' || typeof yVal !== 'number') {
			return null;
		}
		return {
			timestamp: xVal,
			value: yVal,
		};
	}, [isPressActive, chartPress]);

	// Handle hover updates (Removed faulty haptic logic from here)
	useDerivedValue(() => {
		'worklet';
		const currentValue = pressValue.value;

		if (!isPressActive || !currentValue) {
			runOnJS(memoizedOnHover)(null);
		} else {
			// Construct the full PricePoint object
			const point: PricePoint = {
				timestamp: currentValue.timestamp,
				price: currentValue.value,
				value: currentValue.value,
				x: currentValue.timestamp,
				y: currentValue.value
			};
			runOnJS(memoizedOnHover)(point);
		}
	}, [pressValue, isPressActive]);

	// --- UseEffect for Haptic Feedback ---
	React.useEffect(() => {
		// Check the boolean value directly
		if (isPressActive) {
			// Trigger haptic feedback when pressing starts
			Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
		}
	}, [isPressActive]); // Run when isPressActive changes

	// Calculate chartData (safe even if data is empty)
	const chartData: PricePoint[] = data.map(point => {
		const timestamp = new Date(point.timestamp).getTime();
		const value = typeof point.value === 'string' ? parseFloat(point.value) : point.value;
		return {
			timestamp,
			price: value,
			value,
			x: timestamp,
			y: value
		};
	});

	// --- Conditional Return (Now after all hooks) ---
	if (loading || !data.length || !font) {
		console.log("[CoinChart] Skipping render (loading, no data, or font not loaded)");
		return null;
	}
	// --- End of Conditional Return ---

	return (
		<View style={{ height: 250 }}>
			<CartesianChart
				data={chartData}
				xKey="x"
				yKeys={["y"]}
				chartPressState={[chartPress]}
				padding={0}
				axisOptions={{
					font: font,
					tickCount: 5,
					labelOffset: { x: 0, y: 0 },
					labelPosition: { x: "outset", y: "inset" },
					axisSide: { x: "bottom", y: "left" },
					formatXLabel: (value) => format(new Date(value), "HH:mm"),
					formatYLabel: (value) => "",
					lineColor: {
						grid: { x: theme.colors.outlineVariant, y: theme.colors.outlineVariant },
						frame: theme.colors.outlineVariant
					},
					labelColor: theme.colors.onSurfaceVariant,
				}}
			>
				{({ chartBounds, points }) => {
					return (
						<>
							<PriceArea
								points={points.y}
								left={chartBounds.left}
								right={chartBounds.right}
								top={chartBounds.top}
								bottom={chartBounds.bottom}
								lineColor={theme.colors.primary}
								gradientColor={`${theme.colors.primary}33`}
							/>
							{isPressActive && (
								<ChartIndicator
									xPosition={chartPress.x.position}
									yPosition={chartPress.y.y.position}
									top={chartBounds.top}
									bottom={chartBounds.bottom}
									lineColor={theme.colors.primary}
									theme={theme}
								/>
							)}
						</>
					);
				}}
			</CartesianChart>
		</View>
	);
}

const PriceArea = ({
	points,
	left,
	right,
	top,
	bottom,
	lineColor,
	gradientColor,
}: {
	points: any;
	left: number;
	right: number;
	top: number;
	bottom: number;
	lineColor: string;
	gradientColor: string;
}) => {
	const { path: areaPath } = useAreaPath(points, bottom);
	const { path: linePath } = useLinePath(points);

	return (
		<Group>
			<Path path={areaPath} style="fill">
				<LinearGradient
					start={vec(0, 0)}
					end={vec(top, bottom)}
					colors={[lineColor, gradientColor]}
				/>
			</Path>
			<Path
				path={linePath}
				style="stroke"
				strokeWidth={2}
				color={lineColor}
			/>
		</Group>
	);
};

const ChartIndicator = ({
	xPosition,
	yPosition,
	top,
	bottom,
	lineColor,
	theme,
}: {
	xPosition: SharedValue<number>;
	yPosition: SharedValue<number>;
	top: number;
	bottom: number;
	lineColor: string;
	theme: MD3Theme;
}) => {
	return (
		<Group>
			{/* Vertical Line */}
			<Line
				p1={vec(xPosition.value, top)} // Access .value here for vec
				p2={vec(xPosition.value, bottom)} // Access .value here for vec
				color={theme.colors.outline}
				strokeWidth={1.5}
			/>
			{/* Indicator Dots */}
			<Circle
				cx={xPosition} // Pass SharedValue directly
				cy={yPosition} // Pass SharedValue directly
				r={8}
				color={lineColor}
			/>
			<Circle
				cx={xPosition} // Pass SharedValue directly
				cy={yPosition} // Pass SharedValue directly
				r={5}
				color={theme.colors.surface}
			/>
			{/* SkiaText label could be added here later */}
		</Group>
	);
};
