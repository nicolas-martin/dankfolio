import React from 'react';
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import PlatformImage from '../../Common/PlatformImage';
import { CoinInfoProps } from './types';
import { styles } from './styles';

const formatNumber = (num: number): string => {
	if (num >= 1000000000) {
		return (num / 1000000000).toFixed(2) + 'B';
	}
	if (num >= 1000000) {
		return (num / 1000000).toFixed(2) + 'M';
	}
	if (num >= 1000) {
		return (num / 1000).toFixed(2) + 'K';
	}
	return num.toFixed(2);
};

const CoinInfo: React.FC<CoinInfoProps> = ({ metadata }) => {
	const handleLinkPress = (url?: string) => {
		if (url) {
			Linking.openURL(url);
		}
	};

	return (
		<View style={styles.container}>
			{metadata.description && (
				<View style={styles.section}>
					<Text style={styles.title}>About</Text>
					<Text style={styles.description}>{metadata.description}</Text>
				</View>
			)}

			<View style={styles.section}>
				<Text style={styles.title}>Details</Text>

				{metadata.decimals !== undefined && (
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>Decimals</Text>
						<Text style={styles.detailValue}>{metadata.decimals}</Text>
					</View>
				)}

				{metadata.daily_volume !== undefined && (
					<View style={styles.detailRow}>
						<Text style={styles.detailLabel}>24h Volume</Text>
						<Text style={styles.detailValue}>
							${formatNumber(metadata.daily_volume)}
						</Text>
					</View>
				)}

				{metadata.tags && metadata.tags.length > 0 && (
					<View style={styles.tagsContainer}>
						<Text style={styles.detailLabel}>Tags</Text>
						<View style={styles.tagsList}>
							{metadata.tags.map((tag, index) => (
								<View key={index} style={styles.tag}>
									<Text style={styles.tagText}>{tag}</Text>
								</View>
							))}
						</View>
					</View>
				)}
			</View>

			<View style={styles.section}>
				<Text style={styles.title}>Links</Text>

				{metadata.website && (
					<TouchableOpacity style={styles.linkRow} onPress={() => handleLinkPress(metadata.website)}>
						<View style={styles.linkLeft}>
							<PlatformImage
								source={require('../../../../assets/icons/website.png')}
								style={styles.icon}
								resizeMode="contain"
								alt="Website icon"
							/>
							<Text style={styles.linkText}>Website</Text>
						</View>
						<Text style={styles.linkValue}>{metadata.website}</Text>
					</TouchableOpacity>
				)}

				{metadata.twitter && (
					<TouchableOpacity style={styles.linkRow} onPress={() => handleLinkPress(`https://twitter.com/${metadata.twitter}`)}>
						<View style={styles.linkLeft}>
							<PlatformImage
								source={require('../../../../assets/icons/twitter.png')}
								style={styles.icon}
								resizeMode="contain"
								alt="Twitter icon"
							/>
							<Text style={styles.linkText}>Twitter</Text>
						</View>
						<Text style={styles.linkValue}>{metadata.twitter}</Text>
					</TouchableOpacity>
				)}

				{metadata.telegram && (
					<TouchableOpacity style={styles.linkRow} onPress={() => handleLinkPress(`https://t.me/${metadata.telegram}`)}>
						<View style={styles.linkLeft}>
							<PlatformImage
								source={require('../../../../assets/icons/telegram.png')}
								style={styles.icon}
								resizeMode="contain"
								alt="Telegram icon"
							/>
							<Text style={styles.linkText}>Telegram</Text>
						</View>
						<Text style={styles.linkValue}>{metadata.telegram}</Text>
					</TouchableOpacity>
				)}

				{metadata.discord && (
					<TouchableOpacity style={styles.linkRow} onPress={() => handleLinkPress(metadata.discord)}>
						<View style={styles.linkLeft}>
							<PlatformImage
								source={require('../../../../assets/icons/discord.png')}
								style={styles.icon}
								resizeMode="contain"
								alt="Discord icon"
							/>
							<Text style={styles.linkText}>Discord</Text>
						</View>
						<Text style={styles.linkValue}>{metadata.discord}</Text>
					</TouchableOpacity>
				)}
			</View>
		</View>
	);
};

export default CoinInfo;
