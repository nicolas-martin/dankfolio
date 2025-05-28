import { CachedImageProps } from '@/components/Common/CachedImage/types';

export interface TokenImageProps extends Omit<CachedImageProps, 'borderRadius'> {
	uri?: string;
	size?: number;
	blurhash?: string;
} 
