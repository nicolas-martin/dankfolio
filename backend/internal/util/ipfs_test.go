package util

import (
	"testing"
)

func TestStandardizeIpfsUrl(t *testing.T) {
	tests := []struct {
		name     string
		input    string
		expected string
	}{
		// Empty input
		{
			name:     "empty input",
			input:    "",
			expected: "",
		},

		// Non-IPFS URLs (should remain unchanged)
		{
			name:     "dexscreener URL",
			input:    "https://dd.dexscreener.com/ds-data/tokens/cronos/0x85608d6373fdcfc9fb1582187dc3a81c2942f3f2.png?size=lg&key=fc61d3",
			expected: "https://dd.dexscreener.com/ds-data/tokens/cronos/0x85608d6373fdcfc9fb1582187dc3a81c2942f3f2.png?size=lg&key=fc61d3",
		},
		{
			name:     "regular HTTP URL",
			input:    "https://example.com/image.png",
			expected: "https://example.com/image.png",
		},

		// Pump.fun subdomain URLs (should be standardized)
		{
			name:     "pump.fun CIDv1 URL",
			input:    "https://pump.ipfs.dweb.link/8i7j6iX1XbVoZJT2RPY1ZKCTDngbvhz6A318V2R9pump_147.webp",
			expected: "https://gateway.pinata.cloud/ipfs/8i7j6iX1XbVoZJT2RPY1ZKCTDngbvhz6A318V2R9pump_147.webp",
		},
		{
			name:     "pump.fun another CIDv1 URL",
			input:    "https://pump.ipfs.dweb.link/DVuoKXV7a5gWCykFwxJ3kyGbVEPAW85WCSHrrB4Upump_147.webp",
			expected: "https://gateway.pinata.cloud/ipfs/DVuoKXV7a5gWCykFwxJ3kyGbVEPAW85WCSHrrB4Upump_147.webp",
		},

		// CIDv0 subdomain URLs
		{
			name:     "CIDv0 subdomain URL",
			input:    "https://QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X.ipfs.dweb.link/image.png",
			expected: "https://gateway.pinata.cloud/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X/image.png",
		},
		{
			name:     "CIDv1 subdomain URL (already standard dweb.link)",
			input:    "https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/image.png",
			expected: "https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/image.png",
		},

		// Traditional IPFS gateway URLs
		{
			name:     "ipfs.io CIDv0 URL",
			input:    "https://ipfs.io/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X",
			expected: "https://gateway.pinata.cloud/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X",
		},
		{
			name:     "ipfs.io CIDv1 URL",
			input:    "https://ipfs.io/ipfs/bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
			expected: "https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/",
		},
		{
			name:     "other gateway CIDv0 URL with path",
			input:    "https://cloudflare-ipfs.com/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X/image.png",
			expected: "https://gateway.pinata.cloud/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X/image.png",
		},

		// Raw ipfs:// URLs
		{
			name:     "raw ipfs:// CIDv0",
			input:    "ipfs://QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X",
			expected: "https://gateway.pinata.cloud/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X",
		},
		{
			name:     "raw ipfs:// CIDv1",
			input:    "ipfs://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi",
			expected: "https://bafybeigdyrzt5sfp7udm7hu76uh7y26nf3efuylqabf3oclgtqy55fbzdi.ipfs.dweb.link/",
		},
		{
			name:     "raw ipfs:// CIDv0 with path",
			input:    "ipfs://QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X/image.png",
			expected: "https://gateway.pinata.cloud/ipfs/QmXcYpjW47fJHRb81TjWhL1T8u4g5DR8TrG8jXjS2u3u4X/image.png",
		},

		// Edge cases
		{
			name:     "malformed IPFS URL",
			input:    "https://ipfs.io/ipfs/",
			expected: "https://ipfs.io/ipfs/",
		},
		{
			name:     "empty ipfs:// URL",
			input:    "ipfs://",
			expected: "ipfs://",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := StandardizeIpfsUrl(tt.input)
			if result != tt.expected {
				t.Errorf("StandardizeIpfsUrl(%q) = %q, want %q", tt.input, result, tt.expected)
			}
		})
	}
}
