import React from 'react';
import { CachedImage } from '@/components/Common/CachedImage';
import { TokenImageProps } from './types';

export const TokenImage: React.FC<TokenImageProps> = ({ 
	uri, 
	size = 40, 
	blurhash,
	...props 
}) => {
	return (
		<CachedImage
			uri={uri}
			size={size}
			borderRadius={size / 2}
			blurhash={blurhash}
			showLoadingIndicator={true}
			{...props}
		/>
	);
};

