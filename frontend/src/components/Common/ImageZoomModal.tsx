import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { useEffect, useState, useCallback } from 'react'; // React import was combined, added useCallback
import { BlurView } from 'expo-blur';

interface ImageZoomModalProps { // Renamed props interface
  isVisible: boolean;
  onClose: () => void;
  imageUri: string | null | undefined; // Renamed prop
}

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width * 0.7; // Generic name for image size

// Color Constants
const WHITE_OPAQUE = 'white';
const TRANSPARENT = 'transparent';
const WHITE_ALPHA_90 = 'rgba(255, 255, 255, 0.9)';
const WHITE_ALPHA_80 = 'rgba(255, 255, 255, 0.8)';
const WHITE_ALPHA_70 = 'rgba(255, 255, 255, 0.7)';
const WHITE_ALPHA_20 = 'rgba(255, 255, 255, 0.2)';

// Create an animated version of BlurView
const AnimatedBlurView = Animated.createAnimatedComponent(BlurView);
const AnimatedPressableBackground = Animated.createAnimatedComponent(TouchableOpacity);


const ImageZoomModal: React.FC<ImageZoomModalProps> = ({ // Renamed component
  isVisible,
  onClose,
  imageUri, // Renamed prop
}) => {
  const [modalVisible, setModalVisible] = useState(isVisible);

  const backdropOpacity = useSharedValue(0);
  const scale = useSharedValue(0.8);
  const contentOpacity = useSharedValue(0);

  const backdropAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: backdropOpacity.value,
    };
  });

  const contentAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: contentOpacity.value,
      transform: [{ scale: scale.value }],
    };
  });

  const closeAndResetAnimation = useCallback(() => {
    'worklet';
    backdropOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    contentOpacity.value = withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) });
    scale.value = withTiming(0.8, { duration: 300, easing: Easing.out(Easing.ease) }, (finished) => {
      if (finished) {
        runOnJS(setModalVisible)(false);
        runOnJS(onClose)();
      }
    });
  }, [backdropOpacity, contentOpacity, scale, onClose]);

  useEffect(() => {
    if (isVisible) {
      setModalVisible(true);
      backdropOpacity.value = withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) });
      contentOpacity.value = withTiming(1, { duration: 300, easing: Easing.inOut(Easing.ease) });
      scale.value = withTiming(1, { duration: 300, easing: Easing.elastic(0.8) });
    } else {
      if (modalVisible) {
        closeAndResetAnimation();
      }
    }
  }, [isVisible, modalVisible, closeAndResetAnimation, backdropOpacity, contentOpacity, scale]);

  useEffect(() => {
    if (!isVisible && modalVisible) {
      setModalVisible(false);
    }
  }, [isVisible, modalVisible]);


  if (!modalVisible && !isVisible) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={modalVisible}
      onRequestClose={closeAndResetAnimation}
    >
      <AnimatedPressableBackground
        activeOpacity={1}
        onPress={closeAndResetAnimation}
        style={styles.touchableBackgroundWrapper}
      >
        <AnimatedBlurView
          style={[styles.blurViewBackground, backdropAnimatedStyle]}
          intensity={90}
          tint="dark"
        />
        <TouchableOpacity activeOpacity={1} style={styles.contentWrapper}>
          <Animated.View style={[styles.modalContainer, contentAnimatedStyle]}>
            {imageUri ? ( // Using imageUri
              <Image
                source={{ uri: imageUri }} // Using imageUri
                style={styles.zoomedImage} // Renamed style
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.zoomedImage, styles.placeholderImageContainer]}>
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}
            {/* Action buttons removed */}
            <TouchableOpacity style={styles.mainCloseButton} onPress={closeAndResetAnimation}>
              <Text style={styles.mainCloseButtonText}>Done</Text>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </AnimatedPressableBackground>
    </Modal>
  );
};

const styles = StyleSheet.create({
  blurViewBackground: {
    alignItems: 'center', // Added from expansion, though not typical for absoluteFill
    bottom: 0,
    justifyContent: 'center', // Added from expansion
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  contentWrapper: {
    alignItems: 'center',
    height: '100%',
    justifyContent: 'center',
    width: '100%',
  },
  mainCloseButton: {
    backgroundColor: WHITE_ALPHA_20,
    borderRadius: 25,
    marginTop: 10,
    paddingHorizontal: 30,
    paddingVertical: 12,
  },
  mainCloseButtonText: {
    color: WHITE_OPAQUE,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  modalContainer: {
    alignItems: 'center',
    backgroundColor: TRANSPARENT,
    borderRadius: 20,
    justifyContent: 'center',
    maxWidth: 400,
    padding: 15,
    width: width * 0.85,
  },
  placeholderImageContainer: {
    alignItems: 'center',
    backgroundColor: WHITE_ALPHA_20,
    borderColor: WHITE_ALPHA_70,
    borderWidth: 3,
    justifyContent: 'center',
  },
  placeholderText: {
    color: WHITE_ALPHA_80,
    fontSize: 18,
    fontWeight: 'bold',
  },
  touchableBackgroundWrapper: {
    alignItems: 'center',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  zoomedImage: { // Renamed from profileImage
    borderColor: WHITE_ALPHA_90, // White border kept
    borderRadius: IMAGE_SIZE / 2, // Circular style kept
    borderWidth: 3,
    height: IMAGE_SIZE, // Using generic IMAGE_SIZE
    marginBottom: 30, // Space before the main close button (was space between image and action buttons)
    width: IMAGE_SIZE, // Using generic IMAGE_SIZE
  },
});

export default ImageZoomModal; // Exporting renamed component
