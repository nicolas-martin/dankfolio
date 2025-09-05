import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Text } from 'react-native-paper';
import { CoinsIcon, WalletIcon } from '@components/Common/Icons';
import TokenListCard from '@/components/Home/TokenListCard';
import { useStyles } from './tokenslist_styles';
import { TokensListProps } from './tokenslist_types';
import { createCoinCardProps, sortTokensByValue } from './tokenslist_scripts';

const TokensList: React.FC<TokensListProps> = ({
	tokens,
	onTokenPress
}) => {
	const styles = useStyles();

	const sortedTokens = useMemo(() => {
		return sortTokensByValue(tokens);
	}, [tokens]);

	return (
		<View style={styles.container}>
			{sortedTokens.length === 0 ? (
					<View style={styles.emptyTokensContainer}>
						<View style={styles.tokensHeader} accessible={false}>
							<View style={styles.tokensIcon}>
								<CoinsIcon size={24} color={styles.colors.onSurface} />
							</View>
							<Text style={styles.tokensTitle} accessible={true} testID="your-tokens-title">Your Tokens</Text>
						</View>
						<View style={styles.emptyStateContainer} accessible={false}>
							<View style={styles.emptyStateIcon}>
								<WalletIcon size={48} color={styles.colors.onSurfaceVariant} />
							</View>
							<Text style={styles.emptyStateTitle} accessible={true}>No Tokens Found</Text>
							<Text style={styles.emptyStateText} accessible={true}>
								Your wallet doesn&apos;t contain any tokens yet. Start trading to build your portfolio!
							</Text>
						</View>
					</View>
			) : (
				<TokenListCard
					title=''
					coins={sortedTokens.map(token => createCoinCardProps(token))}
					showSparkline={false}
					showBalanceAndValue={true}
					noHorizontalMargin={true}
					noRoundedCorners={true}
					onCoinPress={onTokenPress}
					testIdPrefix="profile-token"
				/>
			)}
		</View>
	);
};

export default TokensList;