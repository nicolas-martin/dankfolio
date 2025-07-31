
/**
 * Since all logos are now stored in S3, we no longer need IPFS resolution.
 * This function is kept for backwards compatibility but just returns the URL as-is.
 */
export const resolveIpfsUrl = (url: string | undefined): string | undefined => {
	// Simply return the URL as-is since all logos should be S3 URLs
	return url;
};

