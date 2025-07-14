import React, { useEffect, useMemo } from 'react';
import {
	Modal,
	View,
	TouchableOpacity,
	Dimensions,
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
import CachedImage from '@/components/Common/CachedImage';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width * 0.7;

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
	isVisible,
	onClose,
	imageUri,
}) => {
	const styles = useStyles();
	const animationValue = useSharedValue(0);

	useEffect(() => {
		if (isVisible) {
			animationValue.value = withTiming(1, {
				duration: 200,
				easing: Easing.out(Easing.quad),
			});
		} else {
			animationValue.value = withTiming(0, {
				duration: 200,
				easing: Easing.in(Easing.quad),
			});
		}
	}, [isVisible, animationValue]);

	const animatedStyle = useAnimatedStyle(() => {
		// Simple animation: start small from top-left, move to center and grow
		const scale = 0.1 + (animationValue.value * 0.9); // Scale from 10% to 100%
		const translateY = (1 - animationValue.value) * -300; // Start 300px above
		const translateX = (1 - animationValue.value) * -150; // Start 150px left

		return {
			transform: [
				{ translateX },
				{ translateY },
				{ scale },
			],
		};
	});

	const backgroundStyle = useAnimatedStyle(() => {
		return {
			opacity: animationValue.value,
		};
	});

	const animatedViewStyle = useMemo(() => [
		styles.blurContainer,
		backgroundStyle
	], [styles.blurContainer, backgroundStyle]);

	if (!isVisible && animationValue.value === 0) return null;

	return (
		<Modal
			transparent={true}
			visible={isVisible}
			onRequestClose={onClose}
		>
			<Animated.View style={animatedViewStyle}>
				<BlurView
					style={styles.blurContainer}
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
									<CachedImage
										uri={imageUri}
										size={IMAGE_SIZE}
										style={styles.image}
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
