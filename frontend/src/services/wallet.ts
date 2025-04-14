import { createPromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { WalletService } from "../gen/dankfolio/v1/wallet_connect";
import { Balance } from "../gen/dankfolio/v1/wallet_pb";

const transport = createConnectTransport({
	baseUrl: "http://localhost:8080",
});

const client = createPromiseClient(WalletService, transport);

export interface WalletBalance {
	balances: Balance[];
}

export const getWalletBalances = async (address: string): Promise<WalletBalance> => {
	const response = await client.getWalletBalances({ address });
	return response.walletBalance!;
};

export const createWallet = async () => {
	const response = await client.createWallet({});
	return {
		publicKey: response.publicKey,
		secretKey: response.secretKey,
	};
}; 