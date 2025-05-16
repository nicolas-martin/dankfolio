import { View, Image } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SplashScreenNavigationProp } from './types';
import { useLoadingState } from './scripts';
import { createStyles } from './styles';

const Splash = () => {
	const navigation = useNavigation<SplashScreenNavigationProp>();
	const theme = useTheme();
	const styles = createStyles(theme);
	const loadingState = useLoadingState(navigation);

	return (
		<View style={styles.container}>
			<Image
				source={require('../../assets/images/splashscreen.png')}
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
		</View>
	);
};

export default Splash; 
