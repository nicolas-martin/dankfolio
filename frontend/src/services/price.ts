import { createPromiseClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { PriceService } from "../gen/dankfolio/v1/price_connect";
import { Timestamp } from "@protobuf-ts/runtime";

const transport = createConnectTransport({
	baseUrl: "http://localhost:8080",
});

const client = createPromiseClient(PriceService, transport);

export interface PriceHistory {
	data: {
		items: Array<{
			unixTime: number;
			value: number;
		}>;
	};
	success: boolean;
}

export const getPriceHistory = async (
	address: string,
	type: string,
	timeFrom: string,
	timeTo: string,
	addressType: string
): Promise<PriceHistory> => {
	const timeFromDate = new Date(timeFrom);
	const timeToDate = new Date(timeTo);

	const response = await client.getPriceHistory({
		address,
		type,
		timeFrom: Timestamp.fromDate(timeFromDate),
		timeTo: Timestamp.fromDate(timeToDate),
		addressType,
	});

	return {
		data: {
			items: response.data?.items?.map(item => ({
				unixTime: item.unixTime?.toDate().getTime() || 0,
				value: item.value || 0,
			})) || [],
		},
		success: response.success,
	};
}; 