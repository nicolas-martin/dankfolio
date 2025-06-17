import React from 'react'; // Added React import

export interface CoinMetadata {
	name: string;
	description?: string;
	website?: string;
	twitter?: string;
	telegram?: string;
	discord?: string;
	decimals?: number;
	tags?: string[];
	symbol?: string;
	createdAt?: Date;
}

export interface CoinInfoProps {
	metadata: CoinMetadata;
}

export interface LinkItemProps {
	icon: React.ComponentType<{ size: number; color: string }>;
	label: string;
	value: string;
	onPress: (url: string) => void;
	testID?: string;
} 
