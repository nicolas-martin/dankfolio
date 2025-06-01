export interface CoinMetadata {
	name: string;
	description?: string;
	website?: string;
	twitter?: string;
	telegram?: string;
	discord?: string;
	dailyVolume?: number;
	decimals?: number;
	tags?: string[];
	symbol?: string;
	createdAt?: Date; // Add this line
}

export interface CoinInfoProps {
	metadata: CoinMetadata;
}

export interface LinkItemProps {
	icon: React.ComponentType<any>;
	label: string;
	value: string;
	onPress: (url: string) => void;
} 
