import React, { useEffect, useMemo } from 'react'; // Add useMemo
import {
	Modal,
	View,
	Image,
	TouchableOpacity,
} from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withTiming,
	Easing,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { ImageZoomModalProps } from './types';
import { useStyles } from './styles';

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
	isVisible,
	onClose,
	imageUri,
}) => {
	const styles = useStyles();
	const animationValue = useSharedValue(0);

	useEffect(() => {
		let timing = 0;
		if (isVisible) {
			timing = 1;
		}

		animationValue.value = withTiming(timing, {
			duration: 150,
			easing: Easing.linear,
		});
	}, [isVisible, animationValue]);

	const animatedStyle = useAnimatedStyle(() => {
		return {
			opacity: animationValue.value,
			transform: [{ scale: animationValue.value }],
		};
	});

	const backgroundStyle = useAnimatedStyle(() => {
		return {
			opacity: animationValue.value,
		};
	});

	// Return null if not visible and animation is complete to prevent flicker
	// This logic might need adjustment based on how `Modal` handles visibility and animation state.
	// For now, we rely on Modal's `visible` prop primarily.
	if (!isVisible && animationValue.value === 0) return null;

	const animatedViewStyle = useMemo(() => [
		styles.blurContainer,
		backgroundStyle
	], [styles.blurContainer, backgroundStyle]);

	const imageSource = useMemo(() => ({
		uri: imageUri || ''
	}), [imageUri]);

	return (
		<Modal
			transparent={true}
			visible={isVisible} // Keep this to control modal presence
			onRequestClose={onClose}
		// animationType="fade" // Removed
		>
			<Animated.View style={animatedViewStyle}>
				<BlurView
					style={styles.blurContainer} // Keep original styles for BlurView if necessary
					intensity={30}
					tint="dark"
				>
					<TouchableOpacity
						style={styles.backdrop}
						activeOpacity={1}
						onPress={onClose}
					>
						<View style={styles.container}>
							<TouchableOpacity
								activeOpacity={1}
								onPress={(e) => e.stopPropagation()}
							>
								<Animated.View style={animatedStyle}>
									<Image
										source={imageSource} // Use memoized source
										style={styles.image}
										resizeMode="cover"
									/>
								</Animated.View>
							</TouchableOpacity>
						</View>
					</TouchableOpacity>
				</BlurView>
			</Animated.View>
		</Modal>
	);
};

export default ImageZoomModal; 
