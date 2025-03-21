import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { styles } from './styles';
import { TokenCardProps } from './types';
import Clipboard from '@react-native-clipboard/clipboard';
import { useToast } from '../../common/Toast';

const formatAddress = (address: string) => {
    if (!address || address === '') return '';
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
};

const TokenCard: React.FC<TokenCardProps> = ({ token, balance, onPress }) => {
    const { showToast } = useToast();

    const copyToClipboard = (text: string, symbol: string) => {
        Clipboard.setString(text);
        showToast({
            type: 'success',
            message: `${symbol} contract address copied to clipboard`,
            icon: '📋'
        });
    };

    return (
        <TouchableOpacity
            style={styles.tokenCard}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={styles.tokenHeader}>
                <View style={styles.tokenHeaderLeft}>
                    {token.icon_url && (
                        <Image 
                            source={{ uri: token.icon_url }} 
                            style={styles.tokenLogo} 
                        />
                    )}
                    <View style={styles.tokenInfo}>
                        <Text style={styles.tokenSymbol}>{token.symbol}</Text>
                        <TouchableOpacity 
                            style={styles.addressContainer}
                            onPress={() => copyToClipboard(token.id || '', token.symbol)}
                        >
                            <Text style={styles.addressText}>{formatAddress(token.id)}</Text>
                            <Text style={styles.copyIcon}>📋</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
            <View style={styles.tokenDetails}>
                <View style={styles.tokenDetail}>
                    <Text style={styles.detailLabel}>Balance</Text>
                    <Text style={styles.detailValue} numberOfLines={1} adjustsFontSizeToFit>
                        {balance.toFixed(4)}
                    </Text>
                </View>
                <View style={styles.tokenDetail}>
                    <Text style={styles.detailLabel}>Value</Text>
                    <Text style={styles.detailValue}>
                        ${(balance * (token.price || 0)).toFixed(2)}
                    </Text>
                </View>
                <View style={styles.tokenDetail}>
                    <Text style={styles.detailLabel}>Price</Text>
                    <Text style={styles.detailValue}>
                        ${token.price?.toFixed(4) || '0.0000'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );
};

export default TokenCard;
