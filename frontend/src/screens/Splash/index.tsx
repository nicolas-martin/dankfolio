import { View, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
// @ts-expect-error - Asset import requires this directive for PNG files in React Native
import logoAsset from '@assets/splashscreen.png'; // Import the image asset
import { LoadingAnimation } from '../../components/Common/Animations';
import { SplashScreenNavigationProp } from './types';
import { useLoadingState } from './scripts';
import { useStyle } from './styles';

const Splash = () => {
	// Navigation is no longer directly initiated by Splash screen after these changes
	// const navigation = useNavigation<SplashScreenNavigationProp>();
	const styles = useStyle();
	// Pass undefined or remove navigation if useLoadingState no longer needs it
	const loadingState = useLoadingState();

	return (
		<View style={styles.container}>
			<Image
				source={logoAsset} // Use the imported asset
				style={styles.logo}
				resizeMode="contain"
			/>
			<Text style={styles.loadingText}>
				{!loadingState.portfolioLoaded
					? 'Loading your portfolio...'
					: !loadingState.trendingLoaded
						? 'Loading trending coins...'
						: 'Ready to trade!'}
			</Text>
			<LoadingAnimation size={150} />
		</View>
	);
};

export default Splash; 
