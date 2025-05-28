import React, { useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { CachedImageProps } from './types';
import { styles } from './styles';
import { fetchIpfsImage } from '../../../utils/ipfsUtils'; // Import fetchIpfsImage

// Helper function to identify IPFS URIs
const isIpfsUri = (uri: string | undefined | null): boolean => {
  if (!uri) return false;

  // Check for ipfs:// prefix
  if (uri.startsWith('ipfs://')) {
    return true;
  }

  // Check for /ipfs/ or /ipns/ path segments
  if (uri.includes('/ipfs/') || uri.includes('/ipns/')) {
    return true;
  }

  // Check for known public IPFS gateway domains
  const knownGateways = [
    'ipfs.io',
    'gateway.ipfs.io',
    'dweb.link',
    'cloudflare-ipfs.com',
    // Add more gateways as needed
  ];
  try {
    // Ensure URI is a full URL string for the URL constructor
    const fullUrl = uri.startsWith('http') ? uri : `https://${uri.split('/')[0]}`; // Heuristic for domain-like CIDs
    const url = new URL(fullUrl);
    if (knownGateways.some(gateway => url.hostname.endsWith(gateway) || url.hostname === gateway.split('/')[2])) {
      return true;
    }
  } catch (e) {
    // Invalid URL or not a gateway, proceed
  }

  // If it's a CID without a scheme or known gateway, it's likely IPFS
  // Basic CID check (starts with Qm, bafy, etc., and is a certain length)
  // This is a simplified check; proper CID validation is more complex.
  if ((uri.startsWith('Qm') && uri.length === 46) || (uri.startsWith('bafy') && uri.length > 50)) {
      return true;
  }


  return false;
};

// Default fallback image for tokens
const DEFAULT_TOKEN_IMAGE = 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png';

export const CachedImage: React.FC<CachedImageProps> = ({
	uri,
	size = 40,
	style,
	fallbackUri = DEFAULT_TOKEN_IMAGE,
	showLoadingIndicator = true,
	borderRadius = 20,
	cachePolicy = 'disk',
	priority = 'normal',
	...props
}) => {
	const [isLoading, setIsLoading] = useState(true);
	const [hasError, setHasError] = useState(false);
	// currentUri will store the URI to be passed to ExpoImage (original, base64, or fallback)
	const [currentUri, setCurrentUri] = useState<string>(fallbackUri); // Initialize with fallback

	useEffect(() => {
		const loadResource = async () => {
			setIsLoading(true);
			setHasError(false);

			if (uri && isIpfsUri(uri)) {
				console.log(`[CachedImage] IPFS URI detected: ${uri}`);
				try {
					const ipfsDataUri = await fetchIpfsImage(uri);
					if (ipfsDataUri) {
						console.log(`[CachedImage] IPFS fetch success: ${uri}`);
						setCurrentUri(ipfsDataUri);
						setIsLoading(false); // Base64 data loads instantly
						setHasError(false);
						return;
					} else {
						console.warn(`[CachedImage] IPFS fetch failed for: ${uri}. Falling back.`);
						// fetchIpfsImage returned null, attempt fallback
						setCurrentUri(fallbackUri);
						// setIsLoading(true); // ExpoImage will handle loading for fallback
						// setHasError(true); // Let ExpoImage's onError handle this state
					}
				} catch (error) {
					console.error(`[CachedImage] Error in fetchIpfsImage for ${uri}:`, error);
					setCurrentUri(fallbackUri);
					// setIsLoading(true);
					// setHasError(true);
				}
			} else if (uri) {
				// Non-IPFS URI or URI is undefined/null
				console.log(`[CachedImage] Standard URI: ${uri}`);
				setCurrentUri(uri);
				// setIsLoading(true); // Loading will be handled by ExpoImage's onLoadStart
			} else {
                // No URI provided, use fallback
                console.log(`[CachedImage] No URI provided, using fallback.`);
                setCurrentUri(fallbackUri);
                // setIsLoading(true);
            }
            // For non-base64 URIs (original non-IPFS, or fallback), ExpoImage will manage loading state
            // setIsLoading(true) will be called by onLoadStart if needed
		};

		loadResource();
	}, [uri, fallbackUri]); // Removed currentUri from deps to avoid re-triggering on its own change

	const imageStyle = {
		width: size,
		height: size,
		borderRadius,
		...style,
	};

	// Memoize handlers to prevent re-renders if props haven't changed
	const handleLoadStart = useCallback(() => {
		if (!currentUri?.startsWith('data:image')) { // Don't set loading for base64, it's instant
			setIsLoading(true);
		}
		setHasError(false);
	}, [currentUri]);

	const handleLoad = useCallback(() => {
		setIsLoading(false);
		setHasError(false);
	}, []);

	const handleError = useCallback(() => {
		console.warn(`[CachedImage] ExpoImage failed to load: ${currentUri}`);
		setIsLoading(false);
		setHasError(true);
		
		// If currentUri is already the fallback, don't try to set it again.
		// This also handles the case where fetchIpfsImage failed, we set fallback, and then ExpoImage fails on fallback.
		if (currentUri !== fallbackUri) {
			console.log(`[CachedImage] Switching to fallbackUri due to error: ${fallbackUri}`);
			setCurrentUri(fallbackUri);
			// setIsLoading(true); // ExpoImage will attempt to load the fallback, triggering its own onLoadStart
		} else {
            console.warn(`[CachedImage] Fallback URI ${fallbackUri} also failed to load or was the source of error.`);
        }
	}, [currentUri, fallbackUri]);

	// Show loading indicator only if isLoading is true AND currentUri is not a base64 string (which loads instantly)
	const showLoader = showLoadingIndicator && isLoading && !currentUri?.startsWith('data:image');

	if (showLoader) {
		return (
			<View style={[imageStyle, styles.loadingContainer]}>
				<ActivityIndicator size="small" />
			</View>
		);
	}

	return (
		<ExpoImage
			source={{ uri: currentUri }} // currentUri is now managed by useEffect and handleError
			style={imageStyle}
			onLoadStart={handleLoadStart}
			onLoad={handleLoad}
			onError={handleError}
			cachePolicy={cachePolicy}
			priority={priority}
			contentFit="cover"
			transition={200}
			{...props}
		/>
	);
}; 