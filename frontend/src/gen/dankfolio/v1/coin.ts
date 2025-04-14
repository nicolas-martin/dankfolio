/* eslint-disable */
import type { CallContext, CallOptions } from "nice-grpc-common";
import _m0 from "protobufjs/minimal";
import { Timestamp } from "../../google/protobuf/timestamp";

export const protobufPackage = "dankfolio.v1";

/** Coin represents a token or currency */
export interface Coin {
  id: string;
  name: string;
  symbol: string;
  decimals: number;
  description: string;
  iconUrl: string;
  tags: string[];
  price: number;
  dailyVolume: number;
  website?: string | undefined;
  twitter?: string | undefined;
  telegram?: string | undefined;
  coingeckoId?: string | undefined;
  createdAt: Date | undefined;
  lastUpdated?: Date | undefined;
}

export interface GetAvailableCoinsRequest {
  trendingOnly?: boolean | undefined;
}

export interface GetAvailableCoinsResponse {
  coins: Coin[];
}

export interface GetCoinByIDRequest {
  id: string;
}

function createBaseCoin(): Coin {
  return {
    id: "",
    name: "",
    symbol: "",
    decimals: 0,
    description: "",
    iconUrl: "",
    tags: [],
    price: 0,
    dailyVolume: 0,
    website: undefined,
    twitter: undefined,
    telegram: undefined,
    coingeckoId: undefined,
    createdAt: undefined,
    lastUpdated: undefined,
  };
}

export const Coin = {
  encode(message: Coin, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    if (message.name !== "") {
      writer.uint32(18).string(message.name);
    }
    if (message.symbol !== "") {
      writer.uint32(26).string(message.symbol);
    }
    if (message.decimals !== 0) {
      writer.uint32(32).int32(message.decimals);
    }
    if (message.description !== "") {
      writer.uint32(42).string(message.description);
    }
    if (message.iconUrl !== "") {
      writer.uint32(50).string(message.iconUrl);
    }
    for (const v of message.tags) {
      writer.uint32(58).string(v!);
    }
    if (message.price !== 0) {
      writer.uint32(65).double(message.price);
    }
    if (message.dailyVolume !== 0) {
      writer.uint32(73).double(message.dailyVolume);
    }
    if (message.website !== undefined) {
      writer.uint32(82).string(message.website);
    }
    if (message.twitter !== undefined) {
      writer.uint32(90).string(message.twitter);
    }
    if (message.telegram !== undefined) {
      writer.uint32(98).string(message.telegram);
    }
    if (message.coingeckoId !== undefined) {
      writer.uint32(106).string(message.coingeckoId);
    }
    if (message.createdAt !== undefined) {
      Timestamp.encode(toTimestamp(message.createdAt), writer.uint32(114).fork()).ldelim();
    }
    if (message.lastUpdated !== undefined) {
      Timestamp.encode(toTimestamp(message.lastUpdated), writer.uint32(122).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): Coin {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseCoin();
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

          message.name = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.symbol = reader.string();
          continue;
        case 4:
          if (tag !== 32) {
            break;
          }

          message.decimals = reader.int32();
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.description = reader.string();
          continue;
        case 6:
          if (tag !== 50) {
            break;
          }

          message.iconUrl = reader.string();
          continue;
        case 7:
          if (tag !== 58) {
            break;
          }

          message.tags.push(reader.string());
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

          message.dailyVolume = reader.double();
          continue;
        case 10:
          if (tag !== 82) {
            break;
          }

          message.website = reader.string();
          continue;
        case 11:
          if (tag !== 90) {
            break;
          }

          message.twitter = reader.string();
          continue;
        case 12:
          if (tag !== 98) {
            break;
          }

          message.telegram = reader.string();
          continue;
        case 13:
          if (tag !== 106) {
            break;
          }

          message.coingeckoId = reader.string();
          continue;
        case 14:
          if (tag !== 114) {
            break;
          }

          message.createdAt = fromTimestamp(Timestamp.decode(reader, reader.uint32()));
          continue;
        case 15:
          if (tag !== 122) {
            break;
          }

          message.lastUpdated = fromTimestamp(Timestamp.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): Coin {
    return {
      id: isSet(object.id) ? String(object.id) : "",
      name: isSet(object.name) ? String(object.name) : "",
      symbol: isSet(object.symbol) ? String(object.symbol) : "",
      decimals: isSet(object.decimals) ? Number(object.decimals) : 0,
      description: isSet(object.description) ? String(object.description) : "",
      iconUrl: isSet(object.iconUrl) ? String(object.iconUrl) : "",
      tags: Array.isArray(object?.tags) ? object.tags.map((e: any) => String(e)) : [],
      price: isSet(object.price) ? Number(object.price) : 0,
      dailyVolume: isSet(object.dailyVolume) ? Number(object.dailyVolume) : 0,
      website: isSet(object.website) ? String(object.website) : undefined,
      twitter: isSet(object.twitter) ? String(object.twitter) : undefined,
      telegram: isSet(object.telegram) ? String(object.telegram) : undefined,
      coingeckoId: isSet(object.coingeckoId) ? String(object.coingeckoId) : undefined,
      createdAt: isSet(object.createdAt) ? fromJsonTimestamp(object.createdAt) : undefined,
      lastUpdated: isSet(object.lastUpdated) ? fromJsonTimestamp(object.lastUpdated) : undefined,
    };
  },

  toJSON(message: Coin): unknown {
    const obj: any = {};
    if (message.id !== "") {
      obj.id = message.id;
    }
    if (message.name !== "") {
      obj.name = message.name;
    }
    if (message.symbol !== "") {
      obj.symbol = message.symbol;
    }
    if (message.decimals !== 0) {
      obj.decimals = Math.round(message.decimals);
    }
    if (message.description !== "") {
      obj.description = message.description;
    }
    if (message.iconUrl !== "") {
      obj.iconUrl = message.iconUrl;
    }
    if (message.tags?.length) {
      obj.tags = message.tags;
    }
    if (message.price !== 0) {
      obj.price = message.price;
    }
    if (message.dailyVolume !== 0) {
      obj.dailyVolume = message.dailyVolume;
    }
    if (message.website !== undefined) {
      obj.website = message.website;
    }
    if (message.twitter !== undefined) {
      obj.twitter = message.twitter;
    }
    if (message.telegram !== undefined) {
      obj.telegram = message.telegram;
    }
    if (message.coingeckoId !== undefined) {
      obj.coingeckoId = message.coingeckoId;
    }
    if (message.createdAt !== undefined) {
      obj.createdAt = message.createdAt.toISOString();
    }
    if (message.lastUpdated !== undefined) {
      obj.lastUpdated = message.lastUpdated.toISOString();
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<Coin>, I>>(base?: I): Coin {
    return Coin.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<Coin>, I>>(object: I): Coin {
    const message = createBaseCoin();
    message.id = object.id ?? "";
    message.name = object.name ?? "";
    message.symbol = object.symbol ?? "";
    message.decimals = object.decimals ?? 0;
    message.description = object.description ?? "";
    message.iconUrl = object.iconUrl ?? "";
    message.tags = object.tags?.map((e) => e) || [];
    message.price = object.price ?? 0;
    message.dailyVolume = object.dailyVolume ?? 0;
    message.website = object.website ?? undefined;
    message.twitter = object.twitter ?? undefined;
    message.telegram = object.telegram ?? undefined;
    message.coingeckoId = object.coingeckoId ?? undefined;
    message.createdAt = object.createdAt ?? undefined;
    message.lastUpdated = object.lastUpdated ?? undefined;
    return message;
  },
};

function createBaseGetAvailableCoinsRequest(): GetAvailableCoinsRequest {
  return { trendingOnly: undefined };
}

export const GetAvailableCoinsRequest = {
  encode(message: GetAvailableCoinsRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.trendingOnly !== undefined) {
      writer.uint32(8).bool(message.trendingOnly);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetAvailableCoinsRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetAvailableCoinsRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 8) {
            break;
          }

          message.trendingOnly = reader.bool();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GetAvailableCoinsRequest {
    return { trendingOnly: isSet(object.trendingOnly) ? Boolean(object.trendingOnly) : undefined };
  },

  toJSON(message: GetAvailableCoinsRequest): unknown {
    const obj: any = {};
    if (message.trendingOnly !== undefined) {
      obj.trendingOnly = message.trendingOnly;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetAvailableCoinsRequest>, I>>(base?: I): GetAvailableCoinsRequest {
    return GetAvailableCoinsRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetAvailableCoinsRequest>, I>>(object: I): GetAvailableCoinsRequest {
    const message = createBaseGetAvailableCoinsRequest();
    message.trendingOnly = object.trendingOnly ?? undefined;
    return message;
  },
};

function createBaseGetAvailableCoinsResponse(): GetAvailableCoinsResponse {
  return { coins: [] };
}

export const GetAvailableCoinsResponse = {
  encode(message: GetAvailableCoinsResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.coins) {
      Coin.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetAvailableCoinsResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetAvailableCoinsResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.coins.push(Coin.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GetAvailableCoinsResponse {
    return { coins: Array.isArray(object?.coins) ? object.coins.map((e: any) => Coin.fromJSON(e)) : [] };
  },

  toJSON(message: GetAvailableCoinsResponse): unknown {
    const obj: any = {};
    if (message.coins?.length) {
      obj.coins = message.coins.map((e) => Coin.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetAvailableCoinsResponse>, I>>(base?: I): GetAvailableCoinsResponse {
    return GetAvailableCoinsResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetAvailableCoinsResponse>, I>>(object: I): GetAvailableCoinsResponse {
    const message = createBaseGetAvailableCoinsResponse();
    message.coins = object.coins?.map((e) => Coin.fromPartial(e)) || [];
    return message;
  },
};

function createBaseGetCoinByIDRequest(): GetCoinByIDRequest {
  return { id: "" };
}

export const GetCoinByIDRequest = {
  encode(message: GetCoinByIDRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.id !== "") {
      writer.uint32(10).string(message.id);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetCoinByIDRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetCoinByIDRequest();
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

  fromJSON(object: any): GetCoinByIDRequest {
    return { id: isSet(object.id) ? String(object.id) : "" };
  },

  toJSON(message: GetCoinByIDRequest): unknown {
    const obj: any = {};
    if (message.id !== "") {
      obj.id = message.id;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetCoinByIDRequest>, I>>(base?: I): GetCoinByIDRequest {
    return GetCoinByIDRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetCoinByIDRequest>, I>>(object: I): GetCoinByIDRequest {
    const message = createBaseGetCoinByIDRequest();
    message.id = object.id ?? "";
    return message;
  },
};

export interface CoinServiceImplementation<CallContextExt = {}> {
  /** GetAvailableCoins returns a list of available coins */
  getAvailableCoins(
    request: GetAvailableCoinsRequest,
    context: CallContext & CallContextExt,
  ): Promise<DeepPartial<GetAvailableCoinsResponse>>;
  /** GetCoinByID returns a specific coin by ID */
  getCoinByID(request: GetCoinByIDRequest, context: CallContext & CallContextExt): Promise<DeepPartial<Coin>>;
}

export interface CoinServiceClient<CallOptionsExt = {}> {
  /** GetAvailableCoins returns a list of available coins */
  getAvailableCoins(
    request: DeepPartial<GetAvailableCoinsRequest>,
    options?: CallOptions & CallOptionsExt,
  ): Promise<GetAvailableCoinsResponse>;
  /** GetCoinByID returns a specific coin by ID */
  getCoinByID(request: DeepPartial<GetCoinByIDRequest>, options?: CallOptions & CallOptionsExt): Promise<Coin>;
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

function isSet(value: any): boolean {
  return value !== null && value !== undefined;
}
