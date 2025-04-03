export interface SplashScreenProps {
	onLoadComplete: () => void;
}

export interface LoadingState {
	portfolioLoaded: boolean;
	trendingLoaded: boolean;
} 