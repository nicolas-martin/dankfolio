import React from 'react';
import {
	Modal,
	View,
	Image,
	TouchableOpacity,
	Dimensions,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { ImageZoomModalProps } from './types';
import { createStyles } from './styles';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width * 0.7;

const ImageZoomModal: React.FC<ImageZoomModalProps> = ({
	isVisible,
	onClose,
	imageUri,
}) => {
	const styles = createStyles();

	if (!isVisible) return null;

	return (
		<Modal
			transparent={true}
			visible={isVisible}
			onRequestClose={onClose}
			animationType="fade"
		>
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
							<Image
								source={{ uri: imageUri || '' }}
								style={styles.image}
								resizeMode="cover"
							/>
						</TouchableOpacity>
					</View>
				</TouchableOpacity>
			</BlurView>
		</Modal>
	);
};

export default ImageZoomModal; 
