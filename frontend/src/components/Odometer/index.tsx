import {
	FC,
	useState,
	useRef,
	useEffect,
	useCallback,
} from 'react';
import type { LayoutChangeEvent, StyleProp, TextStyle } from 'react-native';
import { View, Text, Animated, StyleSheet, Easing } from 'react-native';
import { usePrevious } from './usePrevious';

export interface OdometerProps {
	/** e.g. "0.00001234" */
	value: string;
	/** ms */
	duration?: number;
	/** digit style */
	fontStyle?: StyleProp<TextStyle>;
}

const Odometer: FC<OdometerProps> = ({
	value,
	duration = 600,
	fontStyle,
}) => {
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

		const seq = value
			.split('')
			.map((char, i) => {
				if (!/\d/.test(char) || !anims.current[i]) return null;
				return Animated.timing(anims.current[i]!, {
					toValue: -digitHeight * parseInt(char, 10),
					duration,
					useNativeDriver: true,
					easing: Easing.linear,
					// easing: Easing.elastic(1),
				});
			})
			.filter((a): a is Animated.CompositeAnimation => a !== null);

		if (seq.length > 0) {
			Animated.parallel(seq).start();
		}
	}, [digitHeight, value, duration]);

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
								style={{ height: digitHeight, overflow: 'hidden' }}
							>
								<Animated.View
									style={{
										transform: [{ translateY: anims.current[i]! }],
									}}
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
								style={[fontStyle, { height: digitHeight }]}
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

const styles = StyleSheet.create({
	row: { flexDirection: 'row' },
	hidden: { position: 'absolute', opacity: 0 },
});

export default Odometer;

