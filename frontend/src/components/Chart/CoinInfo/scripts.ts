import { Linking } from 'react-native';
import {
	WebsiteIcon,
	TwitterIcon,
	TelegramIcon,
	DiscordIcon,
	LinkIcon,
} from '@components/Common/Icons';

// Icon Components
export const WebsiteIconComponent = WebsiteIcon;
export const TwitterIconComponent = TwitterIcon;
export const TelegramIconComponent = TelegramIcon;
export const DiscordIconComponent = DiscordIcon;
export const LinkIconComponent = LinkIcon;

// Helper functions
export const formatNumber = (num: number): string => {
	if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
	if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
	if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
	return num.toFixed(2);
};

export const handleLinkPress = (url?: string): void => {
	if (url) {
		const validUrl = url.startsWith('http://') || url.startsWith('https://')
			? url
			: `https://${url}`;
		Linking.openURL(validUrl);
	}
}; 