export interface CoinMetadata {
    name: string;
    description?: string;
    website?: string;
    twitter?: string;
    telegram?: string;
    discord?: string;
    daily_volume?: number;
    decimals?: number;
    tags?: string[];
    symbol?: string;
}

export interface CoinInfoProps {
    metadata: CoinMetadata;
} 
