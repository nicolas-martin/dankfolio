import React from 'react';
import { CachedImage } from '@/components/Common/CachedImage';
import { TokenImageProps } from './types';

export const TokenImage: React.FC<TokenImageProps> = ({ uri, size = 40 }) => {
	return (
		<CachedImage
			uri={uri}
			size={size}
			borderRadius={20}
			showLoadingIndicator={true}
		/>
	);
};

