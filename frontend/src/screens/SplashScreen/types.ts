import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types/index';

export type SplashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export interface LoadingState {
	portfolioLoaded: boolean;
	trendingLoaded: boolean;
} 
