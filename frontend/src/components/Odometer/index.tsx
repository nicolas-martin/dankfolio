import {
	FC,
	useState,
	useRef,
	useEffect,
	useCallback,
	useMemo,
} from 'react';
import type { LayoutChangeEvent, StyleProp, TextStyle } from 'react-native';
import { View, Text, Animated, Easing } from 'react-native';
import { usePrevious } from './usePrevious';
import { useStyles } from './styles';

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
	const styles = useStyles();

	// Sanitize input value to ensure it only contains valid characters
	const sanitizedValue = (value || "0").replace(/[^0-9.$,]/g, "0");
	const prev = usePrevious(sanitizedValue) ?? sanitizedValue.replace(/\d/g, '0');
	const [digitHeight, setDigitHeight] = useState(0);
	const anims = useRef<(Animated.Value | null)[]>([]);

	const themeTextStyle = useMemo(() => ({
		color: styles.colors.onSurface,
	}), [styles.colors.onSurface]);

	const memoizedCombinedFontStyle = useMemo(() => [
		themeTextStyle,
		fontStyle
	].filter(Boolean), [themeTextStyle, fontStyle]);

	const heightStyle = useMemo(() => ({
		height: digitHeight
	}), [digitHeight]);

	// pad previous to match length
	const prevPadded = prev.padStart(sanitizedValue.length, '0');

	// init Animated.Values when we know the height
	useEffect(() => {
		if (!digitHeight) return;

		// Initialize array with proper length and null values first
		anims.current = new Array(sanitizedValue.length).fill(null);

		// Then populate with Animated.Values for digits only
		anims.current = sanitizedValue.split('').map((char, i) => {
			if (!/\d/.test(char)) return null;

			// Safely parse the digit, defaulting to 0 if invalid
			const digit = parseInt(prevPadded[i], 10);
			const safeDigit = isNaN(digit) ? 0 : digit;
			return new Animated.Value(-digitHeight * safeDigit);
		});
	}, [digitHeight, prevPadded, sanitizedValue]);

	// animate digits only
	useEffect(() => {
		if (!digitHeight || !anims.current.length) return;

		const animations = sanitizedValue
			.split('')
			.map((char, i) => {
				if (!/\d/.test(char) || !anims.current[i]) return null;

				// Safely parse the current digit, defaulting to 0 if invalid
				const currentDigit = parseInt(char, 10);
				const safeCurrentDigit = isNaN(currentDigit) ? 0 : currentDigit;
				const targetValue = -digitHeight * safeCurrentDigit;

				// Safely parse the previous digit, defaulting to 0 if invalid
				const prevChar = prevPadded[i] || '0';
				const prevDigit = parseInt(prevChar, 10);
				const safePrevDigit = isNaN(prevDigit) ? 0 : prevDigit;
				const prevValue = -digitHeight * safePrevDigit;

				// Skip animation if the digit hasn't changed
				if (Math.abs(targetValue - prevValue) < 1) return null;

				// Calculate stagger delay - rightmost digits animate first
				const digitIndex = sanitizedValue.length - 1 - i;
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
	}, [digitHeight, sanitizedValue, duration, staggered, staggerDelay, prevPadded]);

	// measure one digit's height
	const onLayout = useCallback((e: LayoutChangeEvent) => {
		setDigitHeight(e.nativeEvent.layout.height);
	}, []);

	return (
		<>
			{digitHeight > 0 && (
				<View style={[styles.row, heightStyle]}>
					{sanitizedValue.split('').map((char, i) => {
						if (/\d/.test(char) && anims.current[i]) {
							const digitContainerStyle = useMemo(() => [
								styles.digitContainer,
								heightStyle
							], [styles.digitContainer, heightStyle]);

							const animatedViewFinalStyle = useMemo(() => [
								styles.digitColumn,
								{ transform: [{ translateY: anims.current[i]! }] }
							], [styles.digitColumn, anims.current[i]]);

							return (
								<View
									key={i}
									style={digitContainerStyle}
								>
									<Animated.View
										style={animatedViewFinalStyle}
									>
										{Array(10)
											.fill(0)
											.map((_, d) => {
												const digitTextStyle = useMemo(() => [
													memoizedCombinedFontStyle,
													heightStyle
												], [memoizedCombinedFontStyle, heightStyle]);
												return (
													<Text
														key={d}
														style={digitTextStyle}
													>
														{d}
													</Text>
												);
											})}
									</Animated.View>
								</View>
							);
						} else {
							const separatorTextStyle = useMemo(() => [
								memoizedCombinedFontStyle,
								styles.separator,
								heightStyle
							], [memoizedCombinedFontStyle, styles.separator, heightStyle]);
							return (
								<Text
									key={i}
									style={separatorTextStyle}
								>
									{char}
								</Text>
							);
						}
					})}
				</View>
			)}

			{/* hidden measurer */}
			<View style={styles.hidden}>
				<Text onLayout={onLayout} style={memoizedCombinedFontStyle}>
					0
				</Text>
			</View>
		</>
	);
};


export default Odometer;

