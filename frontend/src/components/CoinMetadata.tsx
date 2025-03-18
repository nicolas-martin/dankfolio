import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import PlatformImage from './PlatformImage';

interface CoinMetadataProps {
    metadata: {
        name: string;
        description?: string;
        website?: string;
        twitter?: string;
        telegram?: string;
        discord?: string;
        daily_volume?: number;
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

const CoinMetadata: React.FC<CoinMetadataProps> = ({ metadata }) => {
    const handleLinkPress = (url?: string) => {
        if (url) {
            Linking.openURL(url);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Links</Text>
            
            {metadata.website && (
                <TouchableOpacity style={styles.linkRow} onPress={() => handleLinkPress(metadata.website)}>
                    <View style={styles.linkLeft}>
                        <PlatformImage
                            source={require('../../assets/icons/website.png')}
                            style={styles.icon}
                            resizeMode="contain"
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
                        />
                        <Text style={styles.linkText}>Twitter</Text>
                    </View>
                    <Text style={styles.linkValue}>{metadata.twitter}</Text>
                </TouchableOpacity>
            )}

            {metadata.daily_volume !== undefined && (
                <View style={styles.volumeContainer}>
                    <Text style={styles.volumeTitle}>24h Volume</Text>
                    <Text style={styles.volumeValue}>
                        ${formatNumber(metadata.daily_volume)}
                    </Text>
                </View>
            )}
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
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        marginBottom: 16,
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
    volumeContainer: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#2A2A3F',
        borderRadius: 8,
    },
    volumeTitle: {
        fontSize: 16,
        color: '#9F9FD5',
        marginBottom: 4,
    },
    volumeValue: {
        fontSize: 20,
        color: '#FFFFFF',
        fontWeight: 'bold',
    },
});

export default CoinMetadata; 