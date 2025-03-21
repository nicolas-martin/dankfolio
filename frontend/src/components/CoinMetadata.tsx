import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import PlatformImage from './PlatformImage';

interface CoinInfoProps {
    metadata: {
        name: string;
        description?: string;
        website?: string;
        twitter?: string;
        telegram?: string;
        discord?: string;
        daily_volume?: number;
        decimals?: number;
        tags?: string[];
        symbol?: string;
    };
}

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
                                source={require('../../assets/icons/website.png')}
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
                                source={require('../../assets/icons/twitter.png')}
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
                                source={require('../../assets/icons/telegram.png')}
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
                                source={require('../../assets/icons/discord.png')}
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

const styles = StyleSheet.create({
    container: {
        padding: 16,
        backgroundColor: '#1E1E2E',
        borderRadius: 12,
        marginTop: 16,
    },
    section: {
        marginBottom: 24,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 16,
    },
    description: {
        fontSize: 16,
        color: '#9F9FD5',
        lineHeight: 24,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailLabel: {
        fontSize: 16,
        color: '#9F9FD5',
    },
    detailValue: {
        fontSize: 16,
        color: '#FFFFFF',
        fontWeight: '500',
    },
    tagsContainer: {
        marginTop: 12,
    },
    tagsList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 8,
    },
    tag: {
        backgroundColor: '#2A2A3F',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    tagText: {
        color: '#9F9FD5',
        fontSize: 14,
    },
    linkRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingVertical: 8,
    },
    linkLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    icon: {
        width: 24,
        height: 24,
        marginRight: 12,
    },
    linkText: {
        fontSize: 16,
        color: '#FFFFFF',
    },
    linkValue: {
        fontSize: 16,
        color: '#9F9FD5',
    },
});

export default CoinInfo; 