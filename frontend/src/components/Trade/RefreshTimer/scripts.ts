import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { RefreshTimerState } from './types';

export const REFRESH_INTERVAL_MS = 10000; // 10 seconds to match the trade screen polling

/**
 * Custom hook to manage the refresh timer state and animations
 */
export const useRefreshTimer = (
	duration: number,
	isActive: boolean,
	onComplete?: () => void
): RefreshTimerState & {
	progressAnim: Animated.Value;
	reset: () => void;
} => {
	const [progress, setProgress] = useState(0);
	const [remainingSeconds, setRemainingSeconds] = useState(Math.ceil(duration / 1000));
	const progressAnim = useRef(new Animated.Value(0)).current;
	const intervalRef = useRef<NodeJS.Timeout | null>(null);
	const startTimeRef = useRef<number | null>(null);

	const reset = () => {
		setProgress(0);
		setRemainingSeconds(Math.ceil(duration / 1000));
		progressAnim.setValue(0);
		startTimeRef.current = null;
		if (intervalRef.current) {
			clearInterval(intervalRef.current);
			intervalRef.current = null;
		}
	};

	useEffect(() => {
		if (!isActive) {
			reset();
			return;
		}

		startTimeRef.current = Date.now();
		
		// Start the progress animation
		Animated.timing(progressAnim, {
			toValue: 1,
			duration: duration,
			useNativeDriver: false,
		}).start((finished) => {
			if (finished) {
				// Set completion state
				setProgress(1);
				setRemainingSeconds(0);
				// Call onComplete immediately without delay to prevent timing issues
				onComplete?.();
			}
		});

		// Update the countdown every 100ms for smooth updates
		intervalRef.current = setInterval(() => {
			if (!startTimeRef.current) return;

			const elapsed = Date.now() - startTimeRef.current;
			const newProgress = Math.min(elapsed / duration, 1);
			const remaining = Math.max(0, Math.ceil((duration - elapsed) / 1000));

			setProgress(newProgress);
			setRemainingSeconds(remaining);

			if (newProgress >= 1) {
				if (intervalRef.current) {
					clearInterval(intervalRef.current);
					intervalRef.current = null;
				}
			}
		}, 100);

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current);
			}
		};
	}, [duration, isActive, onComplete, progressAnim]);

	return {
		progress,
		remainingSeconds,
		progressAnim,
		reset,
	};
};

/**
 * Format remaining time for display
 */
export const formatRemainingTime = (seconds: number): string => {
	if (seconds <= 0) return 'Refreshing...';
	return `${seconds}s`;
};

/**
 * Get rotation transform for the progress animation
 */
export const getRotationTransform = (rotationAnim: Animated.Value) => {
	return rotationAnim.interpolate({
		inputRange: [0, 1],
		outputRange: ['0deg', '360deg'],
	});
}; 