import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text, Divider, Chip, Icon as PaperIcon } from 'react-native-paper';
import { CoinInfoProps, LinkItemProps } from './coininfo_types';
import { useStyles } from './coininfo_styles';
import {
	WebsiteIconComponent,
	TwitterIconComponent,
	TelegramIconComponent,
	DiscordIconComponent,
	LinkIconComponent,
	formatNumber,
	handleLinkPress,
} from './scripts';

// Sub-component for link items
const LinkItem: React.FC<LinkItemProps> = ({
	icon: IconComponent,
	label,
	value,
	onPress,
	testID,
}) => {
	const styles = useStyles();

	return (
		<TouchableOpacity onPress={() => onPress(value)} testID={testID}>
			<View style={styles.linkItemContainer}>
				<View style={styles.linkItemIconContainer}>
					<IconComponent size={'20'} color={styles.colors.onSurface} />
				</View>
				<View style={styles.linkItemTextContainer}>
					<Text style={styles.linkItemLabel}>
						{label}
					</Text>
					<Text style={styles.linkItemValue} numberOfLines={1}>
						{value}
					</Text>
				</View>
				<PaperIcon source={LinkIconComponent} size={16} color={styles.colors.onSurfaceVariant} />
			</View>
		</TouchableOpacity>
	);
};

// Main component
const CoinInfo: React.FC<CoinInfoProps> = ({ metadata }) => {
	const styles = useStyles();

	const renderDescriptionSection = () => {
		if (!metadata.description) return null;

		return (
			<View style={styles.descriptionSection} testID="coin-info-description-section">
				<View style={styles.descriptionHeader}>
					<View style={styles.descriptionIcon}>
						<PaperIcon source="text-long" size={16} color={styles.colors.onSurfaceVariant} />
					</View>
					<Text style={styles.descriptionTitle} testID="coin-info-description-title">Description</Text>
				</View>
				<Text style={styles.descriptionText} testID="coin-info-description-text">{metadata.description}</Text>
			</View>
		);
	};

	const renderDateSection = () => {
		if (!metadata.createdAt) { // metadata.createdAt is expected to be Date | undefined
			return null;
		}

		// At this point, metadata.createdAt is assumed to be a Date object.
		const formattedDate = metadata.createdAt.toLocaleDateString(undefined, {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
		});

		return (
			<View style={styles.dateSection} testID="coin-info-date-section">
				<View style={styles.dateHeader}>
					<View style={styles.dateIcon}>
						<PaperIcon source="calendar-month" size={16} color={styles.colors.onSurfaceVariant} />
					</View>
					<Text style={styles.dateTitle} testID="coin-info-date-title">Date Added</Text>
				</View>
				<Text style={styles.dateValue} testID="coin-info-date-value">{formattedDate}</Text>
			</View>
		);
	};

	const renderVolumeSection = () => {
		if (metadata.dailyVolume === undefined) return null;

		return (
			<View style={styles.volumeSection} testID="coin-info-volume-section">
				<View style={styles.volumeHeader}>
					<View style={styles.volumeIcon}>
						<PaperIcon source="trending-up" size={16} color={styles.colors.onTertiaryContainer} />
					</View>
					<Text style={styles.volumeTitle} testID="coin-info-volume-title">24h Volume</Text>
				</View>
				<Text style={styles.volumeValue} testID="coin-info-volume-value">
					${formatNumber(metadata.dailyVolume)}
				</Text>
			</View>
		);
	};

	const renderTagsSection = () => {
		if (!metadata.tags || metadata.tags.length === 0) return null;

		return (
			<View style={styles.tagsSection} testID="coin-info-tags-section">
				<View style={styles.tagsHeader}>
					<View style={styles.tagsIcon}>
						<PaperIcon source="tag-multiple" size={16} color={styles.colors.onSecondaryContainer} />
					</View>
					<Text style={styles.tagsTitle} testID="coin-info-tags-title">Tags</Text>
				</View>
				<View style={styles.tagsContainer}>
					{metadata.tags.map((tag, index) => (
						<Chip
							key={index}
							mode="outlined"
							style={styles.tagItem}
							compact
							testID={`coin-info-tag-${tag}`}
						>
							{tag}
						</Chip>
					))}
				</View>
			</View>
		);
	};

	const renderLinksSection = () => {
		const hasLinks = metadata.website || metadata.twitter || metadata.telegram || metadata.discord;
		if (!hasLinks) return null;

		return (
			<View style={styles.linksSection} testID="coin-info-links-section">
				<View style={styles.linksHeader}>
					<View style={styles.linksIcon}>
						<PaperIcon source="link-variant" size={16} color={styles.colors.onTertiaryContainer} />
					</View>
					<Text style={styles.linksTitle} testID="coin-info-links-title">Links</Text>
				</View>
				<View style={styles.linksContainer}>
					{metadata.website && (
						<>
							<LinkItem
								icon={WebsiteIconComponent}
								label="Website"
								value={metadata.website}
								onPress={handleLinkPress}
								testID="coin-info-website-link"
							/>
							{(metadata.twitter || metadata.telegram || metadata.discord) && (
								<Divider style={styles.divider} />
							)}
						</>
					)}

					{metadata.twitter && (
						<>
							<LinkItem
								icon={TwitterIconComponent}
								label="Twitter"
								value={`@${metadata.twitter}`}
								onPress={handleLinkPress}
								testID="coin-info-twitter-link"
							/>
							{(metadata.telegram || metadata.discord) && (
								<Divider style={styles.divider} />
							)}
						</>
					)}

					{metadata.telegram && (
						<>
							<LinkItem
								icon={TelegramIconComponent}
								label="Telegram"
								value={metadata.telegram}
								onPress={handleLinkPress}
								testID="coin-info-telegram-link"
							/>
							{metadata.discord && (
								<Divider style={styles.divider} />
							)}
						</>
					)}

					{metadata.discord && (
						<LinkItem
							icon={DiscordIconComponent}
							label="Discord"
							value={metadata.discord}
							onPress={handleLinkPress}
							testID="coin-info-discord-link"
						/>
					)}
				</View>
			</View>
		);
	};

	return (
		<View style={styles.container}>
			{renderVolumeSection()}
			{renderDescriptionSection()}
			{renderTagsSection()}
			{renderLinksSection()}
			{renderDateSection()}
		</View>
	);
};

export default CoinInfo;
