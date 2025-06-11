import React, { useEffect } from 'react';
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
import { createStyles } from './styles';

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
	isVisible,
	onClose,
	imageUri,
}) => {
	const styles = createStyles();
	const progress = useSharedValue(0);
	const scale = useSharedValue(0);

	useEffect(() => {
		if (isVisible) {
			progress.value = withTiming(1, {
				duration: 300,
				easing: Easing.inOut(Easing.quad),
			});
			scale.value = withTiming(1, {
				duration: 300,
				easing: Easing.inOut(Easing.quad),
			});
		} else {
			progress.value = withTiming(0, {
				duration: 300,
				easing: Easing.inOut(Easing.quad),
			});
			scale.value = withTiming(0, { // Or 0.8 for a zoom-out effect
				duration: 300,
				easing: Easing.inOut(Easing.quad),
			});
		}
	}, [isVisible, progress, scale]);

	const animatedStyle = useAnimatedStyle(() => {
		return {
			opacity: progress.value,
			transform: [{ scale: scale.value }],
		};
	});

	// Return null if not visible and animation is complete to prevent flicker
	// This logic might need adjustment based on how `Modal` handles visibility and animation state.
	// For now, we rely on Modal's `visible` prop primarily.
	if (!isVisible && progress.value === 0) return null;


	return (
		<Modal
			transparent={true}
			visible={isVisible} // Keep this to control modal presence
			onRequestClose={onClose}
			// animationType="fade" // Removed
		>
			<Animated.View style={[styles.blurContainer, animatedStyle]}>
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
								<Image
									source={{ uri: imageUri || '' }}
									style={styles.image}
									resizeMode="cover"
								/>
							</TouchableOpacity>
						</View>
					</TouchableOpacity>
				</BlurView>
			</Animated.View>
		</Modal>
	);
};

export default ImageZoomModal; 
