import { StyleSheet, Dimensions } from 'react-native';
import { AppTheme } from '@/utils/theme';

const { width } = Dimensions.get('window');
const IMAGE_SIZE = width * 0.7;

export const createStyles = (theme: AppTheme) => StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)', // Specific opacity, leaving as is. theme.colors.backdrop is 0.5 opacity.
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