import React, { useCallback, useState } from 'react';
import { View, FlatList, RefreshControl, TouchableOpacity, Text, ActivityIndicator, SafeAreaView } from 'react-native';
import { useXStocksData } from './xstocks_scripts';
import { useStyles } from './xstocks_styles';
import { formatPrice, formatCompactPercentage } from '@/utils/numberFormat';
import { Coin } from '@/types';
import CachedImage from '@/components/Common/CachedImage';
import ScreenHeader from '@/components/Common/ScreenHeader';
import { logger } from '@/utils/logger';
import { InfoIcon } from '@/components/Common/Icons';
import InfoModal from '@/components/Common/InfoModal';

const XStocks: React.FC = () => {
	const styles = useStyles();
	const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);
	const {
		xStocksTokens,
		loading,
		refreshing,
		handleRefresh,
		handleCoinPress,
	} = useXStocksData();

	const renderItem = useCallback(({ item }: { item: Coin }) => {
		logger.log('[XStocks] Rendering item:', {
			symbol: item.symbol,
			name: item.name,
			logoURI: item.logoURI,
			hasLogo: !!item.logoURI,
		});

		const priceChangeColor = item.price24hChangePercent && item.price24hChangePercent >= 0
			? styles.positiveChange
			: styles.negativeChange;

		return (
			<TouchableOpacity
				style={styles.itemContainer}
				onPress={() => handleCoinPress(item)}
				activeOpacity={0.7}
			>
				<View style={styles.itemContent}>
					<View style={styles.leftSection}>
						{item.logoURI ? (
							<CachedImage uri={item.logoURI} size={40} />
						) : (
							<View style={styles.placeholderIcon}>
								<Text style={styles.placeholderText}>{item.symbol.charAt(0)}</Text>
							</View>
						)}
						<View style={styles.tokenInfo}>
							<Text style={styles.symbol}>{item.symbol}</Text>
							<Text style={styles.name}>{item.name}</Text>
						</View>
					</View>
					<View style={styles.rightSection}>
						<Text style={styles.price}>{formatPrice(item.price)}</Text>
						<Text style={[styles.priceChange, priceChangeColor]}>
							{formatCompactPercentage(item.price24hChangePercent || 0)}
						</Text>
					</View>
				</View>
			</TouchableOpacity>
		);
	}, [styles, handleCoinPress]);

	const renderHeader = () => (
		<ScreenHeader
			title="xStocks"
			showRightAction={true}
			rightAction={{
				icon: <InfoIcon size={20} color={styles.infoIcon.color} />,
				onPress: () => setIsInfoModalVisible(true),
				testID: 'xstocks-info-button'
			}}
		/>
	);

	return (
		<SafeAreaView style={styles.safeArea}>
			<View style={styles.container}>
				{renderHeader()}
				{loading && xStocksTokens.length === 0 ? (
					<View style={styles.loadingContainer}>
						<ActivityIndicator size="large" color={styles.loadingIndicator.color} />
					</View>
				) : (
					<View style={styles.listWrapper}>
						<View style={styles.columnHeader}>
							<Text style={styles.columnHeaderText}>Token</Text>
							<Text style={styles.columnHeaderText}>Price / 24h</Text>
						</View>
						<View style={styles.listContainer}>
							<FlatList
								data={xStocksTokens}
								renderItem={renderItem}
								keyExtractor={(item) => item.address}
								ItemSeparatorComponent={() => <View style={styles.separator} />}
								refreshControl={
									<RefreshControl
										refreshing={refreshing}
										onRefresh={handleRefresh}
										tintColor={styles.loadingIndicator.color}
									/>
								}
								ListEmptyComponent={
									<View style={styles.emptyContainer}>
										<Text style={styles.emptyText}>No xStocks tokens found</Text>
										<TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
											<Text style={styles.retryButtonText}>Retry</Text>
										</TouchableOpacity>
									</View>
								}
								contentContainerStyle={xStocksTokens.length === 0 ? styles.emptyListContainer : undefined}
							/>
						</View>
					</View>
				)}
			</View>
			<InfoModal
				visible={isInfoModalVisible}
				onClose={() => setIsInfoModalVisible(false)}
				title="What is xStocks?"
				message="xStocks brings the stock market experience to crypto. Trade meme coins like traditional stocks with features including:
• Rea-time price tracking
• Portfolio analytics
• Market depth analysis
• Advanced charting
• Social sentiment tracking

Experience professional trading tools designed specifically for Solana meme coins."
			/>
		</SafeAreaView>
	);
};

export default XStocks;
