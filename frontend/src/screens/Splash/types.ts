import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '@/types/navigation';

export type SplashScreenNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Splash'>;

export interface LoadingState {
	portfolioLoaded: boolean;
	trendingLoaded: boolean;
} 
