import {
	FC,
	useState,
	useRef,
	useEffect,
	useCallback,
} from 'react';
import type { LayoutChangeEvent, StyleProp, TextStyle } from 'react-native';
import { View, Text, Animated, Easing } from 'react-native';
import { usePrevious } from './usePrevious';
import { useTheme } from 'react-native-paper';
import { createStyles } from './styles';

export interface OdometerProps {
	/** e.g. "0.00001234" */
	value: string;
	/** ms */
	duration?: number;
	/** digit style */
	fontStyle?: StyleProp<TextStyle>;
	/** Enable staggered animation (default: true) */
	staggered?: boolean;
	/** Stagger delay between digits in ms (default: 50) */
	staggerDelay?: number;
}

const Odometer: FC<OdometerProps> = ({
	value,
	duration = 600,
	fontStyle,
	staggered = true,
	staggerDelay = 50,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const prev = usePrevious(value) ?? value.replace(/\d/g, '0');
	const [digitHeight, setDigitHeight] = useState(0);
	const anims = useRef<(Animated.Value | null)[]>([]);

	// pad previous to match length
	const prevPadded = prev.padStart(value.length, '0');

	// init Animated.Values when we know the height
	useEffect(() => {
		if (!digitHeight) return;

		// Initialize array with proper length and null values first
		anims.current = new Array(value.length).fill(null);

		// Then populate with Animated.Values for digits only
		anims.current = value.split('').map((char, i) =>
			/\d/.test(char)
				? new Animated.Value(-digitHeight * parseInt(prevPadded[i], 10))
				: null
		);
	}, [digitHeight, prevPadded, value]);

	// animate digits only
	useEffect(() => {
		if (!digitHeight || !anims.current.length) return;

		const animations = value
			.split('')
			.map((char, i) => {
				if (!/\d/.test(char) || !anims.current[i]) return null;

				const targetValue = -digitHeight * parseInt(char, 10);
				const prevChar = prevPadded[i] || '0';
				const prevValue = -digitHeight * parseInt(prevChar, 10);

				// Skip animation if the digit hasn't changed
				if (Math.abs(targetValue - prevValue) < 1) return null;

				// Calculate stagger delay - rightmost digits animate first
				const digitIndex = value.length - 1 - i;
				const delay = staggered ? digitIndex * staggerDelay : 0;

				return Animated.sequence([
					// Add delay for staggered effect
					Animated.delay(delay),
					// Main animation with improved easing
					Animated.timing(anims.current[i]!, {
						toValue: targetValue,
						duration: duration - delay, // Adjust duration to account for delay
						useNativeDriver: true,
						easing: Easing.bezier(0.25, 0.46, 0.45, 0.94), // easeOutQuart for smooth deceleration
					})
				]);
			})
			.filter((a): a is Animated.CompositeAnimation => a !== null);

		if (animations.length > 0) {
			// Use parallel to run all animations simultaneously (with their individual delays)
			Animated.parallel(animations).start();
		}
	}, [digitHeight, value, duration, staggered, staggerDelay, prevPadded]);

	// measure one digit's height
	const onLayout = useCallback((e: LayoutChangeEvent) => {
		setDigitHeight(e.nativeEvent.layout.height);
	}, []);

	return (
		<>
			{digitHeight > 0 && (
				<View style={[styles.row, { height: digitHeight }]}>
					{value.split('').map((char, i) =>
						/\d/.test(char) && anims.current[i] ? (
							<View
								key={i}
								style={[styles.digitContainer, { height: digitHeight }]}
							>
								<Animated.View
									style={[
										styles.digitColumn,
										{
											transform: [{ translateY: anims.current[i]! }],
										}
									]}
								>
									{Array(10)
										.fill(0)
										.map((_, d) => (
											<Text
												key={d}
												style={[fontStyle, { height: digitHeight }]}
											>
												{d}
											</Text>
										))}
								</Animated.View>
							</View>
						) : (
							<Text
								key={i}
								style={[fontStyle, styles.separator, { height: digitHeight }]}
							>
								{char}
							</Text>
						)
					)}
				</View>
			)}

			{/* hidden measurer */}
			<View style={styles.hidden}>
				<Text onLayout={onLayout} style={fontStyle}>
					0
				</Text>
			</View>
		</>
	);
};


export default Odometer;

