
import { createConnectTransport } from "@connectrpc/connect-web";
import { createClient } from "@connectrpc/connect";
import { WalletService } from "@/gen/dankfolio/v1/wallet_pb";
import { TradeService } from "@/gen/dankfolio/v1/trade_pb";
import { Coin, CoinService, CoinSchema } from "@/gen/dankfolio/v1/coin_pb";
import { PriceService } from "@/gen/dankfolio/v1/price_pb";

const transport = createConnectTransport({
	baseUrl: "http://localhost:9000",
});

const walletClient = createClient(WalletService, transport);
const tradeClient = createClient(TradeService, transport);
const coinClient = createClient(CoinService, transport);
const priceClient = createClient(PriceService, transport);

export { walletClient, tradeClient, coinClient, priceClient };

