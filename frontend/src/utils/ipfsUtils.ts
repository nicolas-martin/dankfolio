// Default list of public IPFS gateways
const DEFAULT_IPFS_GATEWAYS: string[] = [
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://gateway.pinata.cloud/ipfs/',
  'https://nftstorage.link/ipfs/'
];

// Default timeout for fetch requests (in milliseconds)
const DEFAULT_FETCH_TIMEOUT = 15000; // 15 seconds

interface FetchIpfsImageOptions {
  timeout?: number;
  gateways?: string[];
}

/**
 * Fetches an image from an IPFS URI, trying multiple gateways.
 *
 * @param uri - The IPFS URI (e.g., 'ipfs://Qm...', 'https://<gateway>/ipfs/Qm...', or just 'Qm...').
 * @param options - Optional parameters for timeout and custom gateways.
 * @returns A Promise that resolves to a base64 data URI string or null if fetching fails.
 */
export const fetchIpfsImage = async (
  uri: string,
  options: FetchIpfsImageOptions = {}
): Promise<string | null> => {
  const {
    timeout = DEFAULT_FETCH_TIMEOUT,
    gateways = DEFAULT_IPFS_GATEWAYS,
  } = options;

  if (!uri) {
    console.error('IPFS URI is required');
    return null;
  }

  let cid = '';

  // 1. Extract CID from the URI
  if (uri.startsWith('ipfs://')) {
    cid = uri.substring('ipfs://'.length);
  } else if (uri.includes('/ipfs/')) {
    cid = uri.substring(uri.indexOf('/ipfs/') + '/ipfs/'.length);
  } else if (uri.includes('/ipns/')) {
    // IPNS resolution is more complex and might require a dedicated resolver
    // For now, we'll assume it might contain a CID directly after /ipns/
    // or that the gateway can handle IPNS names (some do)
    cid = uri.substring(uri.indexOf('/ipns/') + '/ipns/'.length);
    console.warn('IPNS URIs have limited support in this version of fetchIpfsImage. Gateway must support IPNS resolution.');
  } else {
    // Assume the URI is a CID itself (this is a common case)
    cid = uri;
  }

  // Remove any potential path or query parameters from the CID
  cid = cid.split('/')[0].split('?')[0];

  if (!cid) {
    console.error('Could not extract CID from IPFS URI:', uri);
    return null;
  }

  // 2. Iterate through gateways and attempt to fetch
  for (const gateway of gateways) {
    const gatewayUrl = `${gateway.endsWith('/') ? gateway : gateway + '/'}${cid}`;
    const controller = new AbortController();
    const signal = controller.signal;
    const fetchTimeout = setTimeout(() => controller.abort(), timeout);

    try {
      console.log(`Attempting to fetch from: ${gatewayUrl}`);
      const response = await fetch(gatewayUrl, { signal });
      clearTimeout(fetchTimeout); // Clear timeout if fetch completes or errors before timeout

      if (response.ok) {
        const blob = await response.blob();
        
        // Check if the blob is an image type (optional but good practice)
        if (!blob.type.startsWith('image/')) {
            console.warn(`Fetched content from ${gatewayUrl} is not an image type: ${blob.type}. Attempting to convert anyway.`);
        }

        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = (error) => {
            console.error(`Error converting blob to base64 from ${gatewayUrl}:`, error);
            reject(error); // This will be caught by the outer catch block
          };
          reader.readAsDataURL(blob);
        });
      } else {
        console.warn(`Failed to fetch from ${gatewayUrl}: ${response.status} ${response.statusText}`);
        // Continue to the next gateway
      }
    } catch (error: any) {
      clearTimeout(fetchTimeout);
      if (error.name === 'AbortError') {
        console.warn(`Timeout fetching from ${gatewayUrl} after ${timeout / 1000}s`);
      } else {
        console.error(`Error fetching from ${gatewayUrl}:`, error.message);
      }
      // Continue to the next gateway
    }
  }

  console.error(`Failed to fetch IPFS image for CID ${cid} from all gateways.`);
  return null;
};
