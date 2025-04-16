import React, { useState } from 'react';
import { View, Image, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { Modal, Portal, Text, useTheme } from 'react-native-paper';
import { CheckIcon, SearchIcon } from '@components/Common/Icons';
import { TokenSelectorProps, TokenSearchModalProps } from './types';
import { PortfolioToken } from '@store/portfolio';
import { createStyles } from './styles';

const TokenSearchModal: React.FC<TokenSearchModalProps> = ({
	visible,
	onDismiss,
	tokens,
	selectedToken,
	onSelectToken,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const [searchQuery, setSearchQuery] = useState('');

	const filteredTokens = tokens.filter(token =>
		token.coin.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
		token.coin.name.toLowerCase().includes(searchQuery.toLowerCase())
	);

	const renderItem = ({ item: token }: { item: PortfolioToken }) => (
		<TouchableOpacity
			style={styles.tokenItem}
			onPress={() => {
				onSelectToken(token);
				onDismiss();
			}}
		>
			<Image source={{ uri: token.coin.icon_url }} style={styles.tokenIcon} />
			<View style={styles.tokenDetails}>
				<Text style={styles.tokenSymbol}>{token.coin.symbol}</Text>
				<Text style={styles.tokenName}>{token.coin.name}</Text>
				<Text style={styles.tokenAddress}>
					{token.coin.id.slice(0, 6)}...{token.coin.id.slice(-6)}
				</Text>
			</View>
			<Text style={styles.tokenBalance}>{token.amount}</Text>
		</TouchableOpacity>
	);

	return (
		<Portal>
			<Modal
				visible={visible}
				onDismiss={onDismiss}
				contentContainerStyle={styles.modalContent}
			>
				<View style={styles.searchContainer}>
					<TextInput
						style={styles.searchInput}
						placeholder="Search tokens"
						value={searchQuery}
						onChangeText={setSearchQuery}
						placeholderTextColor={theme.colors.onSurfaceVariant}
					/>
				</View>
				<FlatList
					data={filteredTokens}
					renderItem={renderItem}
					keyExtractor={token => token.id}
					style={styles.tokenList}
				/>
			</Modal>
		</Portal>
	);
};

const TokenSelector: React.FC<TokenSelectorProps> = ({
	selectedToken,
	tokens,
	onSelectToken,
	label,
}) => {
	const theme = useTheme();
	const styles = createStyles(theme);
	const [modalVisible, setModalVisible] = useState(false);

	const formatValue = (value: number) => {
		return value.toLocaleString('en-US', {
			minimumFractionDigits: 2,
			maximumFractionDigits: 6,
		});
	};

	return (
		<>
			<TouchableOpacity
				style={styles.container}
				onPress={() => setModalVisible(true)}
			>
				<View style={styles.tokenInfo}>
					{selectedToken ? (
						<>
							<Image
								source={{ uri: selectedToken.coin.icon_url }}
								style={styles.tokenIcon}
							/>
							<View style={styles.selectedTokenDetails}>
								<Text style={styles.tokenSymbol}>
									{selectedToken.coin.symbol}
								</Text>
								<Text style={styles.tokenAmount}>
									{formatValue(selectedToken.amount)} (${formatValue(selectedToken.value)})
								</Text>
							</View>
						</>
					) : (
						<Text style={styles.tokenSymbol}>{label || 'Select Token'}</Text>
					)}
				</View>
				<CheckIcon size={20} color={theme.colors.onSurface} />
			</TouchableOpacity>

			<TokenSearchModal
				visible={modalVisible}
				onDismiss={() => setModalVisible(false)}
				tokens={tokens}
				selectedToken={selectedToken}
				onSelectToken={onSelectToken}
			/>
		</>
	);
};

export default TokenSelector; 