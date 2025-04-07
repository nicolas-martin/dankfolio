import React, { useCallback } from 'react';
import { View, Linking } from 'react-native';
import { Text, useTheme, Divider, Chip } from 'react-native-paper';
import { CoinInfoProps } from './coininfo_types';
import { createStyles } from './coininfo_styles';
import { LinkItem } from './LinkItem';
import {
	ICON_WEBSITE,
	ICON_TWITTER,
	ICON_TELEGRAM,
	ICON_DISCORD,
} from '../../../utils/icons';

const formatNumber = (num: number): string => {
	if (num >= 1000000000) return (num / 1000000000).toFixed(2) + 'B';
	if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
	if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
	return num.toFixed(2);
};

const CoinInfo: React.FC<CoinInfoProps> = ({ metadata }) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	const handleLinkPress = useCallback((url?: string) => {
		if (url) {
			const validUrl = url.startsWith('http://') || url.startsWith('https://')
				? url
				: `https://${url}`;
			Linking.openURL(validUrl);
		}
	}, []);

	return (
		<View style={styles.container}>
			{metadata.description && (
				<View>
					<Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
						Description
					</Text>
					<Text
						variant="bodyLarge"
						style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}
					>
						{metadata.description}
					</Text>
				</View>
			)}

			<View>
				<Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
					Details
				</Text>

				{metadata.daily_volume !== undefined && (
					<View style={styles.detailRow}>
						<Text
							variant="bodyLarge"
							style={[styles.detailLabel, { color: theme.colors.onSurfaceVariant }]}
						>
							24h Volume
						</Text>
						<Text
							variant="bodyLarge"
							style={[styles.detailValue, { color: theme.colors.onSurface }]}
						>
							${formatNumber(metadata.daily_volume)}
						</Text>
					</View>
				)}

				{metadata.tags && metadata.tags.length > 0 && (
					<View style={styles.tagsContainer}>
						<Text
							variant="bodyLarge"
							style={[styles.tagsLabel, { color: theme.colors.onSurfaceVariant }]}
						>
							Tags
						</Text>
						<View style={styles.tagsInnerContainer}>
							{metadata.tags.map((tag, index) => (
								<Chip
									key={index}
									mode="outlined"
									style={styles.tagItem}
									compact
								>
									{tag}
								</Chip>
							))}
						</View>
					</View>
				)}
			</View>

			{/* Conditionally render the Links section */}
			{(metadata.website || metadata.twitter || metadata.telegram || metadata.discord) && (
				<View>
					<Text variant="titleLarge" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
						Links
					</Text>
					<View style={[styles.linksContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
						{metadata.website && (
							<>
								<LinkItem
									icon={ICON_WEBSITE}
									label="Website"
									value={metadata.website}
									onPress={handleLinkPress}
								/>
								<Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
							</>
						)}

						{metadata.twitter && (
							<>
								<LinkItem
									icon={ICON_TWITTER}
									label="Twitter"
									value={`@${metadata.twitter}`}
									onPress={handleLinkPress}
								/>
								<Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
							</>
						)}

						{metadata.telegram && (
							<>
								<LinkItem
									icon={ICON_TELEGRAM}
									label="Telegram"
									value={metadata.telegram}
									onPress={handleLinkPress}
								/>
								<Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
							</>
						)}

						{metadata.discord && (
							<LinkItem
								icon={ICON_DISCORD}
								label="Discord"
								value={metadata.discord}
								onPress={handleLinkPress}
							/>
						)}
					</View>
				</View>
			)}
		</View>
	);
};

export default CoinInfo;
