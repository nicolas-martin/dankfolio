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

export const handleLinkPress = (url?: string): void => {
	if (url) {
		const validUrl = url.startsWith('http://') || url.startsWith('https://')
			? url
			: `https://${url}`;
		Linking.openURL(validUrl);
	}
}; 
