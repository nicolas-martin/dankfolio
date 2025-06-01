import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text, useTheme, Divider, Chip, Icon as PaperIcon } from 'react-native-paper';
import { CoinInfoProps, LinkItemProps } from './coininfo_types';
import { createStyles } from './coininfo_styles';
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
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	return (
		<TouchableOpacity onPress={() => onPress(value)}>
			<View style={styles.linkItemContainer}>
				<View style={styles.linkItemIconContainer}>
					<IconComponent size={20} color={theme.colors.onSurface} />
				</View>
				<View style={styles.linkItemTextContainer}>
					<Text style={styles.linkItemLabel}>
						{label}
					</Text>
					<Text style={styles.linkItemValue} numberOfLines={1}>
						{value}
					</Text>
				</View>
				<PaperIcon source={LinkIconComponent} size={16} color={theme.colors.onSurfaceVariant} />
			</View>
		</TouchableOpacity>
	);
};

// Main component
const CoinInfo: React.FC<CoinInfoProps> = ({ metadata }) => {
	const theme = useTheme();
	const styles = createStyles(theme);

	const renderDescriptionSection = () => {
		if (!metadata.description) return null;

		return (
			<View style={styles.descriptionSection}>
				<View style={styles.descriptionHeader}>
					<View style={styles.descriptionIcon}>
						<PaperIcon source="text-long" size={16} color={theme.colors.onSurfaceVariant} />
					</View>
					<Text style={styles.descriptionTitle}>Description</Text>
				</View>
				<Text style={styles.descriptionText}>{metadata.description}</Text>
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
			<View style={styles.dateSection}>
				<View style={styles.dateHeader}>
					<View style={styles.dateIcon}>
						<PaperIcon source="calendar-month" size={16} color={theme.colors.onSurfaceVariant} />
					</View>
					<Text style={styles.dateTitle}>Date Added</Text>
				</View>
				<Text style={styles.dateValue}>{formattedDate}</Text>
			</View>
		);
	};

	const renderVolumeSection = () => {
		if (metadata.dailyVolume === undefined) return null;

		return (
			<View style={styles.volumeSection}>
				<View style={styles.volumeHeader}>
					<View style={styles.volumeIcon}>
						<PaperIcon source="trending-up" size={16} color="#1976D2" />
					</View>
					<Text style={styles.volumeTitle}>24h Volume</Text>
				</View>
				<Text style={styles.volumeValue}>
					${formatNumber(metadata.dailyVolume)}
				</Text>
			</View>
		);
	};

	const renderTagsSection = () => {
		if (!metadata.tags || metadata.tags.length === 0) return null;

		return (
			<View style={styles.tagsSection}>
				<View style={styles.tagsHeader}>
					<View style={styles.tagsIcon}>
						<PaperIcon source="tag-multiple" size={16} color="#7B1FA2" />
					</View>
					<Text style={styles.tagsTitle}>Tags</Text>
				</View>
				<View style={styles.tagsContainer}>
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
		);
	};

	const renderLinksSection = () => {
		const hasLinks = metadata.website || metadata.twitter || metadata.telegram || metadata.discord;
		if (!hasLinks) return null;

		return (
			<View style={styles.linksSection}>
				<View style={styles.linksHeader}>
					<View style={styles.linksIcon}>
						<PaperIcon source="link-variant" size={16} color="#388E3C" />
					</View>
					<Text style={styles.linksTitle}>Links</Text>
				</View>
				<View style={styles.linksContainer}>
					{metadata.website && (
						<>
							<LinkItem
								icon={WebsiteIconComponent}
								label="Website"
								value={metadata.website}
								onPress={handleLinkPress}
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
