/* eslint-disable */
import type { CallContext, CallOptions } from "nice-grpc-common";
import _m0 from "protobufjs/minimal";
import { Timestamp } from "../../google/protobuf/timestamp";

export const protobufPackage = "dankfolio.v1";

/** Trade represents a meme trading transaction */
export interface Trade {
  id: string;
  userId: string;
  fromCoinId: string;
  toCoinId: string;
  coinSymbol: string;
  type: string;
  amount: number;
  price: number;
  fee: number;
  status: string;
  transactionHash: string;
  createdAt: Date | undefined;
  completedAt?: Date | undefined;
}

/** GetTradeQuoteRequest is the request for getting a trade quote */
export interface GetTradeQuoteRequest {
  fromCoinId: string;
  toCoinId: string;
  amount: string;
  slippageBps?: string | undefined;
}

/** GetTradeQuoteResponse is the response containing trade quote details */
export interface GetTradeQuoteResponse {
  estimatedAmount: string;
  exchangeRate: string;
  fee: string;
  priceImpact: string;
  routePlan: string[];
  inputMint: string;
  outputMint: string;
}

/** SubmitTradeRequest is the request for submitting a trade */
export interface SubmitTradeRequest {
  fromCoinId: string;
  toCoinId: string;
  amount: number;
  signedTransaction: string;
}

/** SubmitTradeResponse is the response after submitting a trade */
export interface SubmitTradeResponse {
  tradeId: string;
  transactionHash: string;
}

/** GetTradeStatusRequest is the request for checking trade status */
export interface GetTradeStatusRequest {
  transactionHash: string;
}

/** GetTradeStatusResponse is the response containing trade status */
export interface GetTradeStatusResponse {
  transactionHash: string;
  status: string;
  confirmations: number;
  finalized: boolean;
  error?: string | undefined;
}

/** GetTradeByIDRequest is the request for getting a trade by ID */
export interface GetTradeByIDRequest {
  id: string;
}

/** ListTradesRequest is the request for listing trades */
export interface ListTradesRequest {
}

/** ListTradesResponse is the response containing a list of trades */
export interface ListTradesResponse {
  trades: Trade[];
}

/** GetTokenPricesRequest is the request for getting token prices */
export interface GetTokenPricesRequest {
  tokenIds: string[];
}

/** GetTokenPricesResponse is the response containing token prices */
export interface GetTokenPricesResponse {
  prices: { [key: string]: number };
}

export interface GetTokenPricesResponse_PricesEntry {
  key: string;
  value: number;
}

/** PrepareTransferRequest is the request for preparing a transfer */
export interface PrepareTransferRequest {
  fromAddress: string;
  toAddress: string;
  /** Optional, empty for SOL */
  tokenMint: string;
  amount: number;
}

/** PrepareTransferResponse is the response with the unsigned transaction */
export interface PrepareTransferResponse {
  unsignedTransaction: string;
}

/** SubmitTransferRequest is the request for submitting a signed transfer */
export interface SubmitTransferRequest {
  signedTransaction: string;
}

/** SubmitTransferResponse is the response after submitting a transfer */
export interface SubmitTransferResponse {
  transactionHash: string;
}

function createBaseTrade(): Trade {
  return {
    id: "",
    userId: "",
    fromCoinId: "",
    toCoinId: "",
    coinSymbol: "",
    type: "",
    amount: 0,
    price: 0,
    fee: 0,
    status: "",
    transactionHash: "",
    createdAt: undefined,
    completedAt: undefined,
  };
}

export const Trade = {
  encode(message: Trade, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.userId !== "") {
      writer.uint32(18).string(message.userId);
    }
    if (message.fromCoinId !== "") {
      writer.uint32(26).string(message.fromCoinId);
    }
    if (message.toCoinId !== "") {
      writer.uint32(34).string(message.toCoinId);
    }
    if (message.coinSymbol !== "") {
      writer.uint32(42).string(message.coinSymbol);
    }
    if (message.type !== "") {
      writer.uint32(50).string(message.type);
    }
    if (message.amount !== 0) {
      writer.uint32(57).double(message.amount);
    }
    if (message.price !== 0) {
      writer.uint32(65).double(message.price);
    }
    if (message.fee !== 0) {
      writer.uint32(73).double(message.fee);
    }
    if (message.status !== "") {
      writer.uint32(82).string(message.status);
    }
    if (message.transactionHash !== "") {
      writer.uint32(90).string(message.transactionHash);
    }
    if (message.createdAt !== undefined) {
      Timestamp.encode(toTimestamp(message.createdAt), writer.uint32(98).fork()).ldelim();
    }
    if (message.completedAt !== undefined) {
      Timestamp.encode(toTimestamp(message.completedAt), writer.uint32(106).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Trade {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseTrade();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.userId = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.fromCoinId = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.toCoinId = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.coinSymbol = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.type = reader.string();
          continue;
        case 7:
          if (tag !== 57) {
            break;
          }

          message.amount = reader.double();
          continue;
        case 8:
          if (tag !== 65) {
            break;
          }

          message.price = reader.double();
          continue;
        case 9:
          if (tag !== 73) {
            break;
          }

          message.fee = reader.double();
          continue;
        case 10:
          if (tag !== 82) {
            break;
          }

          message.status = reader.string();
          continue;
        case 11:
          if (tag !== 90) {
            break;
          }

          message.transactionHash = reader.string();
          continue;
        case 12:
          if (tag !== 98) {
            break;
          }

          message.createdAt = fromTimestamp(Timestamp.decode(reader, reader.uint32()));
          continue;
        case 13:
          if (tag !== 106) {
            break;
          }

          message.completedAt = fromTimestamp(Timestamp.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Trade {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      userId: isSet(object.userId) ? String(object.userId) : "",
      fromCoinId: isSet(object.fromCoinId) ? String(object.fromCoinId) : "",
      toCoinId: isSet(object.toCoinId) ? String(object.toCoinId) : "",
      coinSymbol: isSet(object.coinSymbol) ? String(object.coinSymbol) : "",
      type: isSet(object.type) ? String(object.type) : "",
      amount: isSet(object.amount) ? Number(object.amount) : 0,
      price: isSet(object.price) ? Number(object.price) : 0,
      fee: isSet(object.fee) ? Number(object.fee) : 0,
      status: isSet(object.status) ? String(object.status) : "",
      transactionHash: isSet(object.transactionHash) ? String(object.transactionHash) : "",
      createdAt: isSet(object.createdAt) ? fromJsonTimestamp(object.createdAt) : undefined,
      completedAt: isSet(object.completedAt) ? fromJsonTimestamp(object.completedAt) : undefined,
    };
  },

  toJSON(message: Trade): unknown {
    const obj: any = {};
    if (message.id !== "") {
      obj.id = message.id;
    }
    if (message.userId !== "") {
      obj.userId = message.userId;
    }
    if (message.fromCoinId !== "") {
      obj.fromCoinId = message.fromCoinId;
    }
    if (message.toCoinId !== "") {
      obj.toCoinId = message.toCoinId;
    }
    if (message.coinSymbol !== "") {
      obj.coinSymbol = message.coinSymbol;
    }
    if (message.type !== "") {
      obj.type = message.type;
    }
    if (message.amount !== 0) {
      obj.amount = message.amount;
    }
    if (message.price !== 0) {
      obj.price = message.price;
    }
    if (message.fee !== 0) {
      obj.fee = message.fee;
    }
    if (message.status !== "") {
      obj.status = message.status;
    }
    if (message.transactionHash !== "") {
      obj.transactionHash = message.transactionHash;
    }
    if (message.createdAt !== undefined) {
      obj.createdAt = message.createdAt.toISOString();
    }
    if (message.completedAt !== undefined) {
      obj.completedAt = message.completedAt.toISOString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Trade>, I>>(base?: I): Trade {
    return Trade.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Trade>, I>>(object: I): Trade {
    const message = createBaseTrade();
    message.id = object.id ?? "";
    message.userId = object.userId ?? "";
    message.fromCoinId = object.fromCoinId ?? "";
    message.toCoinId = object.toCoinId ?? "";
    message.coinSymbol = object.coinSymbol ?? "";
    message.type = object.type ?? "";
    message.amount = object.amount ?? 0;
    message.price = object.price ?? 0;
    message.fee = object.fee ?? 0;
    message.status = object.status ?? "";
    message.transactionHash = object.transactionHash ?? "";
    message.createdAt = object.createdAt ?? undefined;
    message.completedAt = object.completedAt ?? undefined;
    return message;
  },
};

function createBaseGetTradeQuoteRequest(): GetTradeQuoteRequest {
  return { fromCoinId: "", toCoinId: "", amount: "", slippageBps: undefined };
}

export const GetTradeQuoteRequest = {
  encode(message: GetTradeQuoteRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fromCoinId !== "") {
      writer.uint32(10).string(message.fromCoinId);
    }
    if (message.toCoinId !== "") {
      writer.uint32(18).string(message.toCoinId);
    }
    if (message.amount !== "") {
      writer.uint32(26).string(message.amount);
    }
    if (message.slippageBps !== undefined) {
      writer.uint32(34).string(message.slippageBps);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetTradeQuoteRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetTradeQuoteRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.fromCoinId = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.toCoinId = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.amount = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.slippageBps = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GetTradeQuoteRequest {
    return {
      fromCoinId: isSet(object.fromCoinId) ? String(object.fromCoinId) : "",
      toCoinId: isSet(object.toCoinId) ? String(object.toCoinId) : "",
      amount: isSet(object.amount) ? String(object.amount) : "",
      slippageBps: isSet(object.slippageBps) ? String(object.slippageBps) : undefined,
    };
  },

  toJSON(message: GetTradeQuoteRequest): unknown {
    const obj: any = {};
    if (message.fromCoinId !== "") {
      obj.fromCoinId = message.fromCoinId;
    }
    if (message.toCoinId !== "") {
      obj.toCoinId = message.toCoinId;
    }
    if (message.amount !== "") {
      obj.amount = message.amount;
    }
    if (message.slippageBps !== undefined) {
      obj.slippageBps = message.slippageBps;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetTradeQuoteRequest>, I>>(base?: I): GetTradeQuoteRequest {
    return GetTradeQuoteRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetTradeQuoteRequest>, I>>(object: I): GetTradeQuoteRequest {
    const message = createBaseGetTradeQuoteRequest();
    message.fromCoinId = object.fromCoinId ?? "";
    message.toCoinId = object.toCoinId ?? "";
    message.amount = object.amount ?? "";
    message.slippageBps = object.slippageBps ?? undefined;
    return message;
  },
};

function createBaseGetTradeQuoteResponse(): GetTradeQuoteResponse {
  return {
    estimatedAmount: "",
    exchangeRate: "",
    fee: "",
    priceImpact: "",
    routePlan: [],
    inputMint: "",
    outputMint: "",
  };
}

export const GetTradeQuoteResponse = {
  encode(message: GetTradeQuoteResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.estimatedAmount !== "") {
      writer.uint32(10).string(message.estimatedAmount);
    }
    if (message.exchangeRate !== "") {
      writer.uint32(18).string(message.exchangeRate);
    }
    if (message.fee !== "") {
      writer.uint32(26).string(message.fee);
    }
    if (message.priceImpact !== "") {
      writer.uint32(34).string(message.priceImpact);
    }
    for (const v of message.routePlan) {
      writer.uint32(42).string(v!);
    }
    if (message.inputMint !== "") {
      writer.uint32(50).string(message.inputMint);
    }
    if (message.outputMint !== "") {
      writer.uint32(58).string(message.outputMint);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetTradeQuoteResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetTradeQuoteResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.estimatedAmount = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.exchangeRate = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.fee = reader.string();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.priceImpact = reader.string();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.routePlan.push(reader.string());
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.inputMint = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.outputMint = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GetTradeQuoteResponse {
    return {
      estimatedAmount: isSet(object.estimatedAmount) ? String(object.estimatedAmount) : "",
      exchangeRate: isSet(object.exchangeRate) ? String(object.exchangeRate) : "",
      fee: isSet(object.fee) ? String(object.fee) : "",
      priceImpact: isSet(object.priceImpact) ? String(object.priceImpact) : "",
      routePlan: Array.isArray(object?.routePlan) ? object.routePlan.map((e: any) => String(e)) : [],
      inputMint: isSet(object.inputMint) ? String(object.inputMint) : "",
      outputMint: isSet(object.outputMint) ? String(object.outputMint) : "",
    };
  },

  toJSON(message: GetTradeQuoteResponse): unknown {
    const obj: any = {};
    if (message.estimatedAmount !== "") {
      obj.estimatedAmount = message.estimatedAmount;
    }
    if (message.exchangeRate !== "") {
      obj.exchangeRate = message.exchangeRate;
    }
    if (message.fee !== "") {
      obj.fee = message.fee;
    }
    if (message.priceImpact !== "") {
      obj.priceImpact = message.priceImpact;
    }
    if (message.routePlan?.length) {
      obj.routePlan = message.routePlan;
    }
    if (message.inputMint !== "") {
      obj.inputMint = message.inputMint;
    }
    if (message.outputMint !== "") {
      obj.outputMint = message.outputMint;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetTradeQuoteResponse>, I>>(base?: I): GetTradeQuoteResponse {
    return GetTradeQuoteResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetTradeQuoteResponse>, I>>(object: I): GetTradeQuoteResponse {
    const message = createBaseGetTradeQuoteResponse();
    message.estimatedAmount = object.estimatedAmount ?? "";
    message.exchangeRate = object.exchangeRate ?? "";
    message.fee = object.fee ?? "";
    message.priceImpact = object.priceImpact ?? "";
    message.routePlan = object.routePlan?.map((e) => e) || [];
    message.inputMint = object.inputMint ?? "";
    message.outputMint = object.outputMint ?? "";
    return message;
  },
};

function createBaseSubmitTradeRequest(): SubmitTradeRequest {
  return { fromCoinId: "", toCoinId: "", amount: 0, signedTransaction: "" };
}

export const SubmitTradeRequest = {
  encode(message: SubmitTradeRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fromCoinId !== "") {
      writer.uint32(10).string(message.fromCoinId);
    }
    if (message.toCoinId !== "") {
      writer.uint32(18).string(message.toCoinId);
    }
    if (message.amount !== 0) {
      writer.uint32(25).double(message.amount);
    }
    if (message.signedTransaction !== "") {
      writer.uint32(34).string(message.signedTransaction);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SubmitTradeRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSubmitTradeRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.fromCoinId = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.toCoinId = reader.string();
          continue;
        case 3:
          if (tag !== 25) {
            break;
          }

          message.amount = reader.double();
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.signedTransaction = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SubmitTradeRequest {
    return {
      fromCoinId: isSet(object.fromCoinId) ? String(object.fromCoinId) : "",
      toCoinId: isSet(object.toCoinId) ? String(object.toCoinId) : "",
      amount: isSet(object.amount) ? Number(object.amount) : 0,
      signedTransaction: isSet(object.signedTransaction) ? String(object.signedTransaction) : "",
    };
  },

  toJSON(message: SubmitTradeRequest): unknown {
    const obj: any = {};
    if (message.fromCoinId !== "") {
      obj.fromCoinId = message.fromCoinId;
    }
    if (message.toCoinId !== "") {
      obj.toCoinId = message.toCoinId;
    }
    if (message.amount !== 0) {
      obj.amount = message.amount;
    }
    if (message.signedTransaction !== "") {
      obj.signedTransaction = message.signedTransaction;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<SubmitTradeRequest>, I>>(base?: I): SubmitTradeRequest {
    return SubmitTradeRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<SubmitTradeRequest>, I>>(object: I): SubmitTradeRequest {
    const message = createBaseSubmitTradeRequest();
    message.fromCoinId = object.fromCoinId ?? "";
    message.toCoinId = object.toCoinId ?? "";
    message.amount = object.amount ?? 0;
    message.signedTransaction = object.signedTransaction ?? "";
    return message;
  },
};

function createBaseSubmitTradeResponse(): SubmitTradeResponse {
  return { tradeId: "", transactionHash: "" };
}

export const SubmitTradeResponse = {
  encode(message: SubmitTradeResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.tradeId !== "") {
      writer.uint32(10).string(message.tradeId);
    }
    if (message.transactionHash !== "") {
      writer.uint32(18).string(message.transactionHash);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SubmitTradeResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSubmitTradeResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.tradeId = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.transactionHash = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SubmitTradeResponse {
    return {
      tradeId: isSet(object.tradeId) ? String(object.tradeId) : "",
      transactionHash: isSet(object.transactionHash) ? String(object.transactionHash) : "",
    };
  },

  toJSON(message: SubmitTradeResponse): unknown {
    const obj: any = {};
    if (message.tradeId !== "") {
      obj.tradeId = message.tradeId;
    }
    if (message.transactionHash !== "") {
      obj.transactionHash = message.transactionHash;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<SubmitTradeResponse>, I>>(base?: I): SubmitTradeResponse {
    return SubmitTradeResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<SubmitTradeResponse>, I>>(object: I): SubmitTradeResponse {
    const message = createBaseSubmitTradeResponse();
    message.tradeId = object.tradeId ?? "";
    message.transactionHash = object.transactionHash ?? "";
    return message;
  },
};

function createBaseGetTradeStatusRequest(): GetTradeStatusRequest {
  return { transactionHash: "" };
}

export const GetTradeStatusRequest = {
  encode(message: GetTradeStatusRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.transactionHash !== "") {
      writer.uint32(10).string(message.transactionHash);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetTradeStatusRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetTradeStatusRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.transactionHash = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GetTradeStatusRequest {
    return { transactionHash: isSet(object.transactionHash) ? String(object.transactionHash) : "" };
  },

  toJSON(message: GetTradeStatusRequest): unknown {
    const obj: any = {};
    if (message.transactionHash !== "") {
      obj.transactionHash = message.transactionHash;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetTradeStatusRequest>, I>>(base?: I): GetTradeStatusRequest {
    return GetTradeStatusRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetTradeStatusRequest>, I>>(object: I): GetTradeStatusRequest {
    const message = createBaseGetTradeStatusRequest();
    message.transactionHash = object.transactionHash ?? "";
    return message;
  },
};

function createBaseGetTradeStatusResponse(): GetTradeStatusResponse {
  return { transactionHash: "", status: "", confirmations: 0, finalized: false, error: undefined };
}

export const GetTradeStatusResponse = {
  encode(message: GetTradeStatusResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.transactionHash !== "") {
      writer.uint32(10).string(message.transactionHash);
    }
    if (message.status !== "") {
      writer.uint32(18).string(message.status);
    }
    if (message.confirmations !== 0) {
      writer.uint32(24).int32(message.confirmations);
    }
    if (message.finalized === true) {
      writer.uint32(32).bool(message.finalized);
    }
    if (message.error !== undefined) {
      writer.uint32(42).string(message.error);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetTradeStatusResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetTradeStatusResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.transactionHash = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.status = reader.string();
          continue;
        case 3:
          if (tag !== 24) {
            break;
          }

          message.confirmations = reader.int32();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.finalized = reader.bool();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.error = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GetTradeStatusResponse {
    return {
      transactionHash: isSet(object.transactionHash) ? String(object.transactionHash) : "",
      status: isSet(object.status) ? String(object.status) : "",
      confirmations: isSet(object.confirmations) ? Number(object.confirmations) : 0,
      finalized: isSet(object.finalized) ? Boolean(object.finalized) : false,
      error: isSet(object.error) ? String(object.error) : undefined,
    };
  },

  toJSON(message: GetTradeStatusResponse): unknown {
    const obj: any = {};
    if (message.transactionHash !== "") {
      obj.transactionHash = message.transactionHash;
    }
    if (message.status !== "") {
      obj.status = message.status;
    }
    if (message.confirmations !== 0) {
      obj.confirmations = Math.round(message.confirmations);
    }
    if (message.finalized === true) {
      obj.finalized = message.finalized;
    }
    if (message.error !== undefined) {
      obj.error = message.error;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetTradeStatusResponse>, I>>(base?: I): GetTradeStatusResponse {
    return GetTradeStatusResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetTradeStatusResponse>, I>>(object: I): GetTradeStatusResponse {
    const message = createBaseGetTradeStatusResponse();
    message.transactionHash = object.transactionHash ?? "";
    message.status = object.status ?? "";
    message.confirmations = object.confirmations ?? 0;
    message.finalized = object.finalized ?? false;
    message.error = object.error ?? undefined;
    return message;
  },
};

function createBaseGetTradeByIDRequest(): GetTradeByIDRequest {
  return { id: "" };
}

export const GetTradeByIDRequest = {
  encode(message: GetTradeByIDRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetTradeByIDRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetTradeByIDRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.id = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GetTradeByIDRequest {
    return { id: isSet(object.id) ? String(object.id) : "" };
  },

  toJSON(message: GetTradeByIDRequest): unknown {
    const obj: any = {};
    if (message.id !== "") {
      obj.id = message.id;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetTradeByIDRequest>, I>>(base?: I): GetTradeByIDRequest {
    return GetTradeByIDRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetTradeByIDRequest>, I>>(object: I): GetTradeByIDRequest {
    const message = createBaseGetTradeByIDRequest();
    message.id = object.id ?? "";
    return message;
  },
};

function createBaseListTradesRequest(): ListTradesRequest {
  return {};
}

export const ListTradesRequest = {
  encode(_: ListTradesRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ListTradesRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseListTradesRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(_: any): ListTradesRequest {
    return {};
  },

  toJSON(_: ListTradesRequest): unknown {
    const obj: any = {};
    return obj;
  },

  create<I extends Exact<DeepPartial<ListTradesRequest>, I>>(base?: I): ListTradesRequest {
    return ListTradesRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ListTradesRequest>, I>>(_: I): ListTradesRequest {
    const message = createBaseListTradesRequest();
    return message;
  },
};

function createBaseListTradesResponse(): ListTradesResponse {
  return { trades: [] };
}

export const ListTradesResponse = {
  encode(message: ListTradesResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.trades) {
      Trade.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): ListTradesResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseListTradesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.trades.push(Trade.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): ListTradesResponse {
    return { trades: Array.isArray(object?.trades) ? object.trades.map((e: any) => Trade.fromJSON(e)) : [] };
  },

  toJSON(message: ListTradesResponse): unknown {
    const obj: any = {};
    if (message.trades?.length) {
      obj.trades = message.trades.map((e) => Trade.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<ListTradesResponse>, I>>(base?: I): ListTradesResponse {
    return ListTradesResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<ListTradesResponse>, I>>(object: I): ListTradesResponse {
    const message = createBaseListTradesResponse();
    message.trades = object.trades?.map((e) => Trade.fromPartial(e)) || [];
    return message;
  },
};

function createBaseGetTokenPricesRequest(): GetTokenPricesRequest {
  return { tokenIds: [] };
}

export const GetTokenPricesRequest = {
  encode(message: GetTokenPricesRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.tokenIds) {
      writer.uint32(10).string(v!);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetTokenPricesRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetTokenPricesRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.tokenIds.push(reader.string());
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GetTokenPricesRequest {
    return { tokenIds: Array.isArray(object?.tokenIds) ? object.tokenIds.map((e: any) => String(e)) : [] };
  },

  toJSON(message: GetTokenPricesRequest): unknown {
    const obj: any = {};
    if (message.tokenIds?.length) {
      obj.tokenIds = message.tokenIds;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetTokenPricesRequest>, I>>(base?: I): GetTokenPricesRequest {
    return GetTokenPricesRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetTokenPricesRequest>, I>>(object: I): GetTokenPricesRequest {
    const message = createBaseGetTokenPricesRequest();
    message.tokenIds = object.tokenIds?.map((e) => e) || [];
    return message;
  },
};

function createBaseGetTokenPricesResponse(): GetTokenPricesResponse {
  return { prices: {} };
}

export const GetTokenPricesResponse = {
  encode(message: GetTokenPricesResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    Object.entries(message.prices).forEach(([key, value]) => {
      GetTokenPricesResponse_PricesEntry.encode({ key: key as any, value }, writer.uint32(10).fork()).ldelim();
    });
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetTokenPricesResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetTokenPricesResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          const entry1 = GetTokenPricesResponse_PricesEntry.decode(reader, reader.uint32());
          if (entry1.value !== undefined) {
            message.prices[entry1.key] = entry1.value;
          }
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GetTokenPricesResponse {
    return {
      prices: isObject(object.prices)
        ? Object.entries(object.prices).reduce<{ [key: string]: number }>((acc, [key, value]) => {
          acc[key] = Number(value);
          return acc;
        }, {})
        : {},
    };
  },

  toJSON(message: GetTokenPricesResponse): unknown {
    const obj: any = {};
    if (message.prices) {
      const entries = Object.entries(message.prices);
      if (entries.length > 0) {
        obj.prices = {};
        entries.forEach(([k, v]) => {
          obj.prices[k] = v;
        });
      }
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetTokenPricesResponse>, I>>(base?: I): GetTokenPricesResponse {
    return GetTokenPricesResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetTokenPricesResponse>, I>>(object: I): GetTokenPricesResponse {
    const message = createBaseGetTokenPricesResponse();
    message.prices = Object.entries(object.prices ?? {}).reduce<{ [key: string]: number }>((acc, [key, value]) => {
      if (value !== undefined) {
        acc[key] = Number(value);
      }
      return acc;
    }, {});
    return message;
  },
};

function createBaseGetTokenPricesResponse_PricesEntry(): GetTokenPricesResponse_PricesEntry {
  return { key: "", value: 0 };
}

export const GetTokenPricesResponse_PricesEntry = {
  encode(message: GetTokenPricesResponse_PricesEntry, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.key !== "") {
      writer.uint32(10).string(message.key);
    }
    if (message.value !== 0) {
      writer.uint32(17).double(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetTokenPricesResponse_PricesEntry {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetTokenPricesResponse_PricesEntry();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.key = reader.string();
          continue;
        case 2:
          if (tag !== 17) {
            break;
          }

          message.value = reader.double();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GetTokenPricesResponse_PricesEntry {
    return { key: isSet(object.key) ? String(object.key) : "", value: isSet(object.value) ? Number(object.value) : 0 };
  },

  toJSON(message: GetTokenPricesResponse_PricesEntry): unknown {
    const obj: any = {};
    if (message.key !== "") {
      obj.key = message.key;
    }
    if (message.value !== 0) {
      obj.value = message.value;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetTokenPricesResponse_PricesEntry>, I>>(
    base?: I,
  ): GetTokenPricesResponse_PricesEntry {
    return GetTokenPricesResponse_PricesEntry.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetTokenPricesResponse_PricesEntry>, I>>(
    object: I,
  ): GetTokenPricesResponse_PricesEntry {
    const message = createBaseGetTokenPricesResponse_PricesEntry();
    message.key = object.key ?? "";
    message.value = object.value ?? 0;
    return message;
  },
};

function createBasePrepareTransferRequest(): PrepareTransferRequest {
  return { fromAddress: "", toAddress: "", tokenMint: "", amount: 0 };
}

export const PrepareTransferRequest = {
  encode(message: PrepareTransferRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.fromAddress !== "") {
      writer.uint32(10).string(message.fromAddress);
    }
    if (message.toAddress !== "") {
      writer.uint32(18).string(message.toAddress);
    }
    if (message.tokenMint !== "") {
      writer.uint32(26).string(message.tokenMint);
    }
    if (message.amount !== 0) {
      writer.uint32(33).double(message.amount);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PrepareTransferRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePrepareTransferRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.fromAddress = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.toAddress = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.tokenMint = reader.string();
          continue;
        case 4:
          if (tag !== 33) {
            break;
          }

          message.amount = reader.double();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PrepareTransferRequest {
    return {
      fromAddress: isSet(object.fromAddress) ? String(object.fromAddress) : "",
      toAddress: isSet(object.toAddress) ? String(object.toAddress) : "",
      tokenMint: isSet(object.tokenMint) ? String(object.tokenMint) : "",
      amount: isSet(object.amount) ? Number(object.amount) : 0,
    };
  },

  toJSON(message: PrepareTransferRequest): unknown {
    const obj: any = {};
    if (message.fromAddress !== "") {
      obj.fromAddress = message.fromAddress;
    }
    if (message.toAddress !== "") {
      obj.toAddress = message.toAddress;
    }
    if (message.tokenMint !== "") {
      obj.tokenMint = message.tokenMint;
    }
    if (message.amount !== 0) {
      obj.amount = message.amount;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PrepareTransferRequest>, I>>(base?: I): PrepareTransferRequest {
    return PrepareTransferRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PrepareTransferRequest>, I>>(object: I): PrepareTransferRequest {
    const message = createBasePrepareTransferRequest();
    message.fromAddress = object.fromAddress ?? "";
    message.toAddress = object.toAddress ?? "";
    message.tokenMint = object.tokenMint ?? "";
    message.amount = object.amount ?? 0;
    return message;
  },
};

function createBasePrepareTransferResponse(): PrepareTransferResponse {
  return { unsignedTransaction: "" };
}

export const PrepareTransferResponse = {
  encode(message: PrepareTransferResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.unsignedTransaction !== "") {
      writer.uint32(10).string(message.unsignedTransaction);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PrepareTransferResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePrepareTransferResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.unsignedTransaction = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PrepareTransferResponse {
    return { unsignedTransaction: isSet(object.unsignedTransaction) ? String(object.unsignedTransaction) : "" };
  },

  toJSON(message: PrepareTransferResponse): unknown {
    const obj: any = {};
    if (message.unsignedTransaction !== "") {
      obj.unsignedTransaction = message.unsignedTransaction;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PrepareTransferResponse>, I>>(base?: I): PrepareTransferResponse {
    return PrepareTransferResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PrepareTransferResponse>, I>>(object: I): PrepareTransferResponse {
    const message = createBasePrepareTransferResponse();
    message.unsignedTransaction = object.unsignedTransaction ?? "";
    return message;
  },
};

function createBaseSubmitTransferRequest(): SubmitTransferRequest {
  return { signedTransaction: "" };
}

export const SubmitTransferRequest = {
  encode(message: SubmitTransferRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.signedTransaction !== "") {
      writer.uint32(10).string(message.signedTransaction);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SubmitTransferRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSubmitTransferRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.signedTransaction = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SubmitTransferRequest {
    return { signedTransaction: isSet(object.signedTransaction) ? String(object.signedTransaction) : "" };
  },

  toJSON(message: SubmitTransferRequest): unknown {
    const obj: any = {};
    if (message.signedTransaction !== "") {
      obj.signedTransaction = message.signedTransaction;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<SubmitTransferRequest>, I>>(base?: I): SubmitTransferRequest {
    return SubmitTransferRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<SubmitTransferRequest>, I>>(object: I): SubmitTransferRequest {
    const message = createBaseSubmitTransferRequest();
    message.signedTransaction = object.signedTransaction ?? "";
    return message;
  },
};

function createBaseSubmitTransferResponse(): SubmitTransferResponse {
  return { transactionHash: "" };
}

export const SubmitTransferResponse = {
  encode(message: SubmitTransferResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.transactionHash !== "") {
      writer.uint32(10).string(message.transactionHash);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): SubmitTransferResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseSubmitTransferResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.transactionHash = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): SubmitTransferResponse {
    return { transactionHash: isSet(object.transactionHash) ? String(object.transactionHash) : "" };
  },

  toJSON(message: SubmitTransferResponse): unknown {
    const obj: any = {};
    if (message.transactionHash !== "") {
      obj.transactionHash = message.transactionHash;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<SubmitTransferResponse>, I>>(base?: I): SubmitTransferResponse {
    return SubmitTransferResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<SubmitTransferResponse>, I>>(object: I): SubmitTransferResponse {
    const message = createBaseSubmitTransferResponse();
    message.transactionHash = object.transactionHash ?? "";
    return message;
  },
};

export interface TradeServiceImplementation<CallContextExt = {}> {
  /** GetTradeQuote returns a quote for a potential trade */
  getTradeQuote(
    request: GetTradeQuoteRequest,
    context: CallContext & CallContextExt,
  ): Promise<DeepPartial<GetTradeQuoteResponse>>;
  /** SubmitTrade submits a trade for execution */
  submitTrade(
    request: SubmitTradeRequest,
    context: CallContext & CallContextExt,
  ): Promise<DeepPartial<SubmitTradeResponse>>;
  /** GetTradeStatus returns the status of a trade */
  getTradeStatus(
    request: GetTradeStatusRequest,
    context: CallContext & CallContextExt,
  ): Promise<DeepPartial<GetTradeStatusResponse>>;
  /** GetTradeByID returns details of a specific trade */
  getTradeByID(request: GetTradeByIDRequest, context: CallContext & CallContextExt): Promise<DeepPartial<Trade>>;
  /** ListTrades returns all trades */
  listTrades(
    request: ListTradesRequest,
    context: CallContext & CallContextExt,
  ): Promise<DeepPartial<ListTradesResponse>>;
  /** GetTokenPrices returns prices for multiple tokens */
  getTokenPrices(
    request: GetTokenPricesRequest,
    context: CallContext & CallContextExt,
  ): Promise<DeepPartial<GetTokenPricesResponse>>;
  /** PrepareTransfer prepares an unsigned transfer transaction */
  prepareTransfer(
    request: PrepareTransferRequest,
    context: CallContext & CallContextExt,
  ): Promise<DeepPartial<PrepareTransferResponse>>;
  /** SubmitTransfer submits a signed transfer transaction */
  submitTransfer(
    request: SubmitTransferRequest,
    context: CallContext & CallContextExt,
  ): Promise<DeepPartial<SubmitTransferResponse>>;
}

export interface TradeServiceClient<CallOptionsExt = {}> {
  /** GetTradeQuote returns a quote for a potential trade */
  getTradeQuote(
    request: DeepPartial<GetTradeQuoteRequest>,
    options?: CallOptions & CallOptionsExt,
  ): Promise<GetTradeQuoteResponse>;
  /** SubmitTrade submits a trade for execution */
  submitTrade(
    request: DeepPartial<SubmitTradeRequest>,
    options?: CallOptions & CallOptionsExt,
  ): Promise<SubmitTradeResponse>;
  /** GetTradeStatus returns the status of a trade */
  getTradeStatus(
    request: DeepPartial<GetTradeStatusRequest>,
    options?: CallOptions & CallOptionsExt,
  ): Promise<GetTradeStatusResponse>;
  /** GetTradeByID returns details of a specific trade */
  getTradeByID(request: DeepPartial<GetTradeByIDRequest>, options?: CallOptions & CallOptionsExt): Promise<Trade>;
  /** ListTrades returns all trades */
  listTrades(
    request: DeepPartial<ListTradesRequest>,
    options?: CallOptions & CallOptionsExt,
  ): Promise<ListTradesResponse>;
  /** GetTokenPrices returns prices for multiple tokens */
  getTokenPrices(
    request: DeepPartial<GetTokenPricesRequest>,
    options?: CallOptions & CallOptionsExt,
  ): Promise<GetTokenPricesResponse>;
  /** PrepareTransfer prepares an unsigned transfer transaction */
  prepareTransfer(
    request: DeepPartial<PrepareTransferRequest>,
    options?: CallOptions & CallOptionsExt,
  ): Promise<PrepareTransferResponse>;
  /** SubmitTransfer submits a signed transfer transaction */
  submitTransfer(
    request: DeepPartial<SubmitTransferRequest>,
    options?: CallOptions & CallOptionsExt,
  ): Promise<SubmitTransferResponse>;
}

type Builtin = Date | Function | Uint8Array | string | number | boolean | undefined;

export type DeepPartial<T> = T extends Builtin ? T
  : T extends Array<infer U> ? Array<DeepPartial<U>> : T extends ReadonlyArray<infer U> ? ReadonlyArray<DeepPartial<U>>
  : T extends {} ? { [K in keyof T]?: DeepPartial<T[K]> }
  : Partial<T>;

type KeysOfUnion<T> = T extends T ? keyof T : never;
export type Exact<P, I extends P> = P extends Builtin ? P
  : P & { [K in keyof P]: Exact<P[K], I[K]> } & { [K in Exclude<keyof I, KeysOfUnion<P>>]: never };

function toTimestamp(date: Date): Timestamp {
  const seconds = date.getTime() / 1_000;
  const nanos = (date.getTime() % 1_000) * 1_000_000;
  return { seconds, nanos };
}

function fromTimestamp(t: Timestamp): Date {
  let millis = (t.seconds || 0) * 1_000;
  millis += (t.nanos || 0) / 1_000_000;
  return new Date(millis);
}

function fromJsonTimestamp(o: any): Date {
  if (o instanceof Date) {
    return o;
  } else if (typeof o === "string") {
    return new Date(o);
  } else {
    return fromTimestamp(Timestamp.fromJSON(o));
  }
}

function isObject(value: any): boolean {
  return typeof value === "object" && value !== null;
}

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
