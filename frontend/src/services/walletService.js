import axios from 'axios';

class SolscanWalletService {
        constructor() {
                this.solanaRpcUrl = 'https://api.mainnet-beta.solana.com';
                this.jupiterPriceUrl = 'https://api.jup.ag/price/v2';
                this.jupiterTokenListUrl = 'https://token.jup.ag/strict';
        }

        async getTokens(walletAddress) {
                try {
                        // 1. Get token accounts from Solana RPC
                        const response = await axios.post(this.solanaRpcUrl, {
                                jsonrpc: '2.0',
                                id: 1,
                                method: 'getTokenAccountsByOwner',
                                params: [
                                        walletAddress,
                                        {
                                                programId: 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'
                                        },
                                        {
                                                encoding: 'jsonParsed'
                                        }
                                ]
                        });

                        if (!response.data?.result?.value) {
                                return [];
                        }

                        // 2. Get token list for metadata
                        const tokenListResponse = await axios.get(this.jupiterTokenListUrl);
                        const tokenMetadataMap = {};
                        tokenListResponse.data.forEach(token => {
                                tokenMetadataMap[token.address] = {
                                        symbol: token.symbol,
                                        decimals: token.decimals,
                                        name: token.name,
                                        logoURI: token.logoURI
                                };
                        });

                        // 3. Process token accounts
                        const tokenAccounts = response.data.result.value
                                .filter(account => account.account.data.parsed.info.tokenAmount.uiAmount > 0)
                                .map(account => ({
                                        mint: account.account.data.parsed.info.mint,
                                        balance: account.account.data.parsed.info.tokenAmount.uiAmount
                                }));

                        if (tokenAccounts.length === 0) {
                                return [];
                        }

                        // 4. Get token prices
                        const tokenMints = tokenAccounts.map(account => account.mint);
                        const priceResponse = await axios.get(`${this.jupiterPriceUrl}?ids=${tokenMints.join(',')}`);
                        const prices = priceResponse.data.data;

                        // 5. Calculate total portfolio value
                        const totalValue = tokenAccounts.reduce((sum, account) => {
                                const price = prices[account.mint]?.price || 0;
                                return sum + (account.balance * price);
                        }, 0);

                        // 6. Combine all data
                        return tokenAccounts.map(account => {
                                const metadata = tokenMetadataMap[account.mint] || { symbol: 'Unknown', name: 'Unknown Token' };
                                const price = prices[account.mint]?.price || 0;
                                const value = account.balance * price;
                                const percentage = totalValue > 0 ? (value / totalValue) * 100 : 0;

                                return {
                                        symbol: metadata.symbol,
                                        name: metadata.name,
                                        balance: account.balance,
                                        price: price,
                                        value: value,
                                        percentage: percentage,
                                        address: account.mint,
                                        logoURI: metadata.logoURI
                                };
                        }).sort((a, b) => b.value - a.value); // Sort by value descending
                } catch (error) {
                        console.error('Error fetching tokens:', error);
                        throw error;
                }
        }
}

export default SolscanWalletService;

// Future SPL implementation (commented out for now)
/*
export class SplWalletService {
  async getTokens(walletAddress) {
    // TODO: Implement using SPL token library
    throw new Error('Not implemented');
  }
}
*/ 
