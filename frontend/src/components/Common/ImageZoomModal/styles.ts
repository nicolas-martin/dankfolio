import { StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width * 0.7;

export const createStyles = () => StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    flex: 1,
    justifyContent: 'center',
  },
  blurContainer: {
    flex: 1,
  },
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  image: {
    borderColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: IMAGE_SIZE / 2,
    borderWidth: 3,
    height: IMAGE_SIZE,
    width: IMAGE_SIZE,
  },
}); 