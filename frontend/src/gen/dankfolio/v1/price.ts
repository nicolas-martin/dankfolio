/* eslint-disable */
import type { CallContext, CallOptions } from "nice-grpc-common";
import _m0 from "protobufjs/minimal";
import { Timestamp } from "../../google/protobuf/timestamp";

export const protobufPackage = "dankfolio.v1";

/** GetPriceHistoryRequest represents a request for price history data */
export interface GetPriceHistoryRequest {
  address: string;
  type: string;
  timeFrom: Date | undefined;
  timeTo: Date | undefined;
  addressType: string;
}

/** GetPriceHistoryResponse represents the response containing price history data */
export interface GetPriceHistoryResponse {
  data: PriceHistoryData | undefined;
  success: boolean;
}

/** PriceHistoryData contains a list of price history items */
export interface PriceHistoryData {
  items: PriceHistoryItem[];
}

/** PriceHistoryItem represents a single price point with timestamp and value */
export interface PriceHistoryItem {
  unixTime: Date | undefined;
  value: number;
}

function createBaseGetPriceHistoryRequest(): GetPriceHistoryRequest {
  return { address: "", type: "", timeFrom: undefined, timeTo: undefined, addressType: "" };
}

export const GetPriceHistoryRequest = {
  encode(message: GetPriceHistoryRequest, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.address !== "") {
      writer.uint32(10).string(message.address);
    }
    if (message.type !== "") {
      writer.uint32(18).string(message.type);
    }
    if (message.timeFrom !== undefined) {
      Timestamp.encode(toTimestamp(message.timeFrom), writer.uint32(26).fork()).ldelim();
    }
    if (message.timeTo !== undefined) {
      Timestamp.encode(toTimestamp(message.timeTo), writer.uint32(34).fork()).ldelim();
    }
    if (message.addressType !== "") {
      writer.uint32(42).string(message.addressType);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetPriceHistoryRequest {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetPriceHistoryRequest();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.address = reader.string();
          continue;
        case 2:
          if (tag !== 18) {
            break;
          }

          message.type = reader.string();
          continue;
        case 3:
          if (tag !== 26) {
            break;
          }

          message.timeFrom = fromTimestamp(Timestamp.decode(reader, reader.uint32()));
          continue;
        case 4:
          if (tag !== 34) {
            break;
          }

          message.timeTo = fromTimestamp(Timestamp.decode(reader, reader.uint32()));
          continue;
        case 5:
          if (tag !== 42) {
            break;
          }

          message.addressType = reader.string();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GetPriceHistoryRequest {
    return {
      address: isSet(object.address) ? String(object.address) : "",
      type: isSet(object.type) ? String(object.type) : "",
      timeFrom: isSet(object.timeFrom) ? fromJsonTimestamp(object.timeFrom) : undefined,
      timeTo: isSet(object.timeTo) ? fromJsonTimestamp(object.timeTo) : undefined,
      addressType: isSet(object.addressType) ? String(object.addressType) : "",
    };
  },

  toJSON(message: GetPriceHistoryRequest): unknown {
    const obj: any = {};
    if (message.address !== "") {
      obj.address = message.address;
    }
    if (message.type !== "") {
      obj.type = message.type;
    }
    if (message.timeFrom !== undefined) {
      obj.timeFrom = message.timeFrom.toISOString();
    }
    if (message.timeTo !== undefined) {
      obj.timeTo = message.timeTo.toISOString();
    }
    if (message.addressType !== "") {
      obj.addressType = message.addressType;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetPriceHistoryRequest>, I>>(base?: I): GetPriceHistoryRequest {
    return GetPriceHistoryRequest.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetPriceHistoryRequest>, I>>(object: I): GetPriceHistoryRequest {
    const message = createBaseGetPriceHistoryRequest();
    message.address = object.address ?? "";
    message.type = object.type ?? "";
    message.timeFrom = object.timeFrom ?? undefined;
    message.timeTo = object.timeTo ?? undefined;
    message.addressType = object.addressType ?? "";
    return message;
  },
};

function createBaseGetPriceHistoryResponse(): GetPriceHistoryResponse {
  return { data: undefined, success: false };
}

export const GetPriceHistoryResponse = {
  encode(message: GetPriceHistoryResponse, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.data !== undefined) {
      PriceHistoryData.encode(message.data, writer.uint32(10).fork()).ldelim();
    }
    if (message.success === true) {
      writer.uint32(16).bool(message.success);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): GetPriceHistoryResponse {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBaseGetPriceHistoryResponse();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.data = PriceHistoryData.decode(reader, reader.uint32());
          continue;
        case 2:
          if (tag !== 16) {
            break;
          }

          message.success = reader.bool();
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): GetPriceHistoryResponse {
    return {
      data: isSet(object.data) ? PriceHistoryData.fromJSON(object.data) : undefined,
      success: isSet(object.success) ? Boolean(object.success) : false,
    };
  },

  toJSON(message: GetPriceHistoryResponse): unknown {
    const obj: any = {};
    if (message.data !== undefined) {
      obj.data = PriceHistoryData.toJSON(message.data);
    }
    if (message.success === true) {
      obj.success = message.success;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<GetPriceHistoryResponse>, I>>(base?: I): GetPriceHistoryResponse {
    return GetPriceHistoryResponse.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<GetPriceHistoryResponse>, I>>(object: I): GetPriceHistoryResponse {
    const message = createBaseGetPriceHistoryResponse();
    message.data = (object.data !== undefined && object.data !== null)
      ? PriceHistoryData.fromPartial(object.data)
      : undefined;
    message.success = object.success ?? false;
    return message;
  },
};

function createBasePriceHistoryData(): PriceHistoryData {
  return { items: [] };
}

export const PriceHistoryData = {
  encode(message: PriceHistoryData, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    for (const v of message.items) {
      PriceHistoryItem.encode(v!, writer.uint32(10).fork()).ldelim();
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PriceHistoryData {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePriceHistoryData();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.items.push(PriceHistoryItem.decode(reader, reader.uint32()));
          continue;
      }
      if ((tag & 7) === 4 || tag === 0) {
        break;
      }
      reader.skipType(tag & 7);
    }
    return message;
  },

  fromJSON(object: any): PriceHistoryData {
    return { items: Array.isArray(object?.items) ? object.items.map((e: any) => PriceHistoryItem.fromJSON(e)) : [] };
  },

  toJSON(message: PriceHistoryData): unknown {
    const obj: any = {};
    if (message.items?.length) {
      obj.items = message.items.map((e) => PriceHistoryItem.toJSON(e));
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PriceHistoryData>, I>>(base?: I): PriceHistoryData {
    return PriceHistoryData.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PriceHistoryData>, I>>(object: I): PriceHistoryData {
    const message = createBasePriceHistoryData();
    message.items = object.items?.map((e) => PriceHistoryItem.fromPartial(e)) || [];
    return message;
  },
};

function createBasePriceHistoryItem(): PriceHistoryItem {
  return { unixTime: undefined, value: 0 };
}

export const PriceHistoryItem = {
  encode(message: PriceHistoryItem, writer: _m0.Writer = _m0.Writer.create()): _m0.Writer {
    if (message.unixTime !== undefined) {
      Timestamp.encode(toTimestamp(message.unixTime), writer.uint32(10).fork()).ldelim();
    }
    if (message.value !== 0) {
      writer.uint32(17).double(message.value);
    }
    return writer;
  },

  decode(input: _m0.Reader | Uint8Array, length?: number): PriceHistoryItem {
    const reader = input instanceof _m0.Reader ? input : _m0.Reader.create(input);
    let end = length === undefined ? reader.len : reader.pos + length;
    const message = createBasePriceHistoryItem();
    while (reader.pos < end) {
      const tag = reader.uint32();
      switch (tag >>> 3) {
        case 1:
          if (tag !== 10) {
            break;
          }

          message.unixTime = fromTimestamp(Timestamp.decode(reader, reader.uint32()));
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

  fromJSON(object: any): PriceHistoryItem {
    return {
      unixTime: isSet(object.unixTime) ? fromJsonTimestamp(object.unixTime) : undefined,
      value: isSet(object.value) ? Number(object.value) : 0,
    };
  },

  toJSON(message: PriceHistoryItem): unknown {
    const obj: any = {};
    if (message.unixTime !== undefined) {
      obj.unixTime = message.unixTime.toISOString();
    }
    if (message.value !== 0) {
      obj.value = message.value;
    }
    return obj;
  },

  create<I extends Exact<DeepPartial<PriceHistoryItem>, I>>(base?: I): PriceHistoryItem {
    return PriceHistoryItem.fromPartial(base ?? ({} as any));
  },
  fromPartial<I extends Exact<DeepPartial<PriceHistoryItem>, I>>(object: I): PriceHistoryItem {
    const message = createBasePriceHistoryItem();
    message.unixTime = object.unixTime ?? undefined;
    message.value = object.value ?? 0;
    return message;
  },
};

export interface PriceServiceImplementation<CallContextExt = {}> {
  /** GetPriceHistory returns historical price data for a given address */
  getPriceHistory(
    request: GetPriceHistoryRequest,
    context: CallContext & CallContextExt,
  ): Promise<DeepPartial<GetPriceHistoryResponse>>;
}

export interface PriceServiceClient<CallOptionsExt = {}> {
  /** GetPriceHistory returns historical price data for a given address */
  getPriceHistory(
    request: DeepPartial<GetPriceHistoryRequest>,
    options?: CallOptions & CallOptionsExt,
  ): Promise<GetPriceHistoryResponse>;
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
