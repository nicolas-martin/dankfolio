import React from 'react';
import { Container, Logo, LoadingText } from './styles';
import { SplashScreenProps } from './types';
import { useLoadingState } from './scripts';

const SplashScreen: React.FC<SplashScreenProps> = ({ onLoadComplete }) => {
	const loadingState = useLoadingState(onLoadComplete);
	const isLoading = !loadingState.portfolioLoaded || !loadingState.trendingLoaded;

	return (
		<Container isLoading={isLoading}>
			<Logo src="/splashscreen.png" alt="DankFolio" />
			<LoadingText>
				{isLoading ? 'Loading your dank portfolio...' : 'Ready to trade!'}
			</LoadingText>
		</Container>
	);
};

export default SplashScreen; 
