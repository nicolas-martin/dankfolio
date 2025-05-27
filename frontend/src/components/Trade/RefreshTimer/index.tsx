import React from 'react';
import { View, Animated } from 'react-native';
import { Text, useTheme, Icon, ActivityIndicator } from 'react-native-paper';
import { RefreshTimerProps } from './types';
import { createStyles } from './styles';
import { useRefreshTimer, formatRemainingTime, getRotationTransform } from './scripts';

const RefreshTimer: React.FC<RefreshTimerProps> = ({
	duration,
	isActive,
	onComplete,
	visible = true,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const { progress, remainingSeconds, progressAnim, reset } = useRefreshTimer(
		duration,
		isActive,
		onComplete
	);

	if (!visible) return null;

	const renderProgressIndicator = () => {
		return (
			<View style={styles.progressContainer}>
				{/* Simple progress bar */}
				<View style={styles.progressBarBackground}>
					<Animated.View
						style={[
							styles.progressBarFill,
							{
								width: progressAnim.interpolate({
									inputRange: [0, 1],
									outputRange: ['0%', '100%'],
								}),
							},
						]}
					/>
				</View>
				
				{/* Timer icon */}
				<View style={styles.timerIcon}>
					<Icon
						source="timer-outline"
						size={16}
						color={theme.colors.onSurfaceVariant}
					/>
				</View>
			</View>
		);
	};

	return (
		<View style={styles.container}>
			<View style={styles.timerCard}>
				{renderProgressIndicator()}
				
				<View style={styles.textContainer}>
					<Text style={styles.timerLabel}>Next Quote Refresh</Text>
					<Text style={styles.timerText}>
						{remainingSeconds <= 0 ? 'Refreshing...' : formatRemainingTime(remainingSeconds)}
					</Text>
				</View>
			</View>
		</View>
	);
};

export default RefreshTimer; 