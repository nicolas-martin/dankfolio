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
				<View style={[
					styles.linkItemIconContainer,
					{ backgroundColor: theme.colors.surfaceVariant }
				]}>
					<IconComponent size={20} color={theme.colors.onSurface} />
				</View>
				<View style={styles.linkItemTextContainer}>
					<Text
						variant="titleMedium"
						style={[styles.linkItemLabel, { color: theme.colors.onSurface }]}
					>
						{label}
					</Text>
					<Text
						variant="bodyMedium"
						style={[styles.linkItemValue, { color: theme.colors.onSurfaceVariant }]}
						numberOfLines={1}
					>
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
									icon={WebsiteIconComponent}
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
									icon={TwitterIconComponent}
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
									icon={TelegramIconComponent}
									label="Telegram"
									value={metadata.telegram}
									onPress={handleLinkPress}
								/>
								<Divider style={[styles.divider, { backgroundColor: theme.colors.outline }]} />
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
			)}
		</View>
	);
};

export default CoinInfo;
